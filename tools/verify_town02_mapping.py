#!/usr/bin/env python3
"""Verify a recorded Town02 bag and export its recorded sensor calibration."""
import argparse
import hashlib
import json
import math
import re
from pathlib import Path
import sqlite3
import sys
import numpy as np
from rclpy.serialization import deserialize_message
from rosidl_runtime_py.utilities import get_message
from scipy.spatial.transform import Rotation

sys.path.insert(0, str(Path(__file__).parent))
from capture_town02_mapping import Coverage, save


def matrix(transform):
    transform = transform.transform
    q = transform.rotation
    t = transform.translation
    result = np.eye(4)
    result[:3, :3] = Rotation.from_quat([q.x, q.y, q.z, q.w]).as_matrix()
    result[:3, 3] = [t.x, t.y, t.z]
    return result


def ns(stamp):
    return int(stamp.sec) * 1000000000 + int(stamp.nanosec)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    manifest = json.loads((root / 'manifest.json').read_text())
    map_data = json.loads((root / 'map.json').read_text())
    config = json.loads((root / 'configuration.json').read_text())
    ego = next(a for a in config['actors'] if a['role'] == 'ego')
    prefix = '/carla/ego_' + str(ego['id'])
    required = {'/clock', '/tf', prefix + '/odometry',
                prefix + '/roof_lidar/points', prefix + '/front_rgb/image',
                prefix + '/front_rgb/camera_info', prefix + '/imu/data', prefix + '/gnss/data'}
    coverage = Coverage(map_data)
    topics = {}
    errors = []
    classes = {}
    first_messages = {}
    static = {}
    stats = {}
    trajectory = []
    distance = 0.
    previous_xyz = None
    lidar_min, lidar_max = float('inf'), 0
    lidar_nonfinite = 0
    synchronized = {}
    signal_rows, green_rows = 0, 0
    for dbpath in sorted((root / 'rosbag2').glob('*.db3')):
        print('Validating', dbpath.name, flush=True)
        db = sqlite3.connect(f'file:{dbpath}?mode=ro', uri=True)
        result = db.execute('PRAGMA quick_check').fetchone()[0]
        if result != 'ok':
            errors.append('SQLite quick_check: ' + result)
        catalog = {row[0]: {'name': row[1], 'type': row[2]} for row in db.execute('SELECT id,name,type FROM topics')}
        for item in catalog.values():
            topics[item['name']] = item
            classes[item['name']] = get_message(item['type'])
        for name, count in db.execute('SELECT topics.name,count(messages.id) FROM topics LEFT JOIN messages ON topics.id=messages.topic_id GROUP BY topics.id'):
            if count != manifest['ros_topics'].get(name):
                errors.append('Manifest count mismatch: ' + name)
        for tid, t, blob in db.execute('SELECT topic_id,timestamp,data FROM messages ORDER BY id'):
            name = catalog[tid]['name']
            item = stats.setdefault(name, {'count': 0, 'first_ns': t, 'last_ns': None, 'nonmonotonic': 0, 'header_mismatches': 0, 'max_gap_ns': 0})
            if item['last_ns'] is not None:
                gap = t - item['last_ns']
                item['nonmonotonic'] += gap <= 0
                item['max_gap_ns'] = max(item['max_gap_ns'], gap)
            item['last_ns'] = t
            item['count'] += 1
            # Deserialize each required message, every signal state, and the
            # first message on extra topics. No streams are modified.
            if name not in required and name != '/carla/traffic_signals' and name in first_messages:
                continue
            msg = deserialize_message(blob, classes[name])
            first_messages.setdefault(name, msg)
            if hasattr(msg, 'header'):
                item['header_mismatches'] += ns(msg.header.stamp) != t
            if name in required and name not in ['/clock', '/tf', prefix + '/odometry']:
                synchronized.setdefault(name, []).append(t)
            if name == '/clock' and ns(msg.clock) != t:
                errors.append('Clock differs from bag timestamp')
            if name == prefix + '/odometry':
                p, q = msg.pose.pose.position, msg.pose.pose.orientation
                xyz = [p.x, p.y, p.z]
                if previous_xyz is not None:
                    distance += float(np.linalg.norm(np.array(xyz) - previous_xyz))
                previous_xyz = np.array(xyz)
                # Reflect ROS world Y and yaw back to map API CARLA coordinates.
                yaw = -Rotation.from_quat([q.x, q.y, q.z, q.w]).as_euler('xyz', degrees=True)[2]
                coverage.observe({'x': p.x, 'y': -p.y, 'yaw': yaw})
                trajectory.append({'stamp_ns': t, 'x': p.x, 'y': p.y, 'z': p.z,
                                   'qx': q.x, 'qy': q.y, 'qz': q.z, 'qw': q.w})
            if name == '/tf':
                for tf in msg.transforms:
                    if tf.header.frame_id == 'map':
                        continue
                    key = (tf.header.frame_id, tf.child_frame_id)
                    value = matrix(tf)
                    if key in static and not np.allclose(static[key], value, atol=1e-8):
                        errors.append('Sensor extrinsic changed: ' + str(key))
                    static[key] = value
            if name == prefix + '/roof_lidar/points':
                lidar_min = min(lidar_min, msg.width)
                lidar_max = max(lidar_max, msg.width)
                if msg.point_step != 64 or len(msg.data) != msg.row_step * msg.height or msg.row_step != msg.width * msg.point_step:
                    errors.append('LiDAR point layout mismatch')
                dtype = np.dtype({'names': ['x', 'y', 'z', 'time_offset', 'channel'],
                    'formats': ['<f4', '<f4', '<f4', '<f4', '<u2'],
                    'offsets': [0, 4, 8, 40, 56], 'itemsize': 64})
                points = np.frombuffer(msg.data, dtype=dtype)
                lidar_nonfinite += int(sum((~np.isfinite(points[k])).sum() for k in ('x', 'y', 'z', 'time_offset')))
                if len(points) and (points['channel'].max() >= 32 or points['time_offset'].min() < -1e-5 or points['time_offset'].max() > .051):
                    errors.append('LiDAR channel or scan-time range invalid')
            if name.endswith('/image') and (len(msg.data) != msg.height * msg.step or msg.encoding != 'bgra8'):
                errors.append('Camera layout mismatch: ' + name)
            if name == '/carla/traffic_signals':
                signal_rows += 1
                signals = json.loads(msg.data)['signals']
                green_rows += bool(signals) and all(s['state'] == 'Green' and s['frozen'] for s in signals)
        db.close()
    if required - topics.keys():
        errors.append('Missing required topics: ' + repr(sorted(required - topics.keys())))
    for name, item in stats.items():
        if item['nonmonotonic'] or item['header_mismatches'] or item['count'] != manifest['frames']:
            errors.append('Timestamp or frame count failed: ' + name)
    stamps = list(synchronized.values())
    if stamps and any(a != stamps[0] for a in stamps[1:]):
        errors.append('Requested sensor and CameraInfo timestamp sets differ')
    if signal_rows != green_rows:
        errors.append('Some recorded traffic signals were not frozen green')
    if lidar_nonfinite:
        errors.append('Nonfinite LiDAR values')
    report = coverage.report()
    report['source'] = 'Every recorded nav_msgs/Odometry message in the delivered bag, converted to the map API coordinates.'
    report['trajectory_distance_m'] = distance
    report['recorded_frames'] = len(trajectory)
    report['complete'] = report['complete_lanes'] == report['required_lanes']
    save(root / 'coverage_verified.json', report)
    with (root / 'ground_truth_trajectory.tum').open('w') as f:
        f.write('# simulator ground truth in ROS map coordinates; timestamp x y z qx qy qz qw\n')
        for row in trajectory:
            f.write(f"{row['stamp_ns'] // 1000000000}.{row['stamp_ns'] % 1000000000:09d} " + ' '.join(f'{row[k]:.9f}' for k in ['x', 'y', 'z', 'qx', 'qy', 'qz', 'qw']) + '\n')
    sensors = {}
    blueprint = json.loads((root / 'sensor_catalog.json').read_text())['sensors']
    for sensor in ego['sensors']:
        name = sensor['name']
        frame = 'ego_' + str(ego['id']) + '/' + name
        record = dict(sensor_type=sensor['type'], frame=frame, configuration=sensor,
                      blueprint_defaults=blueprint[sensor['type']],
                      T_ego_from_sensor=static[('ego_' + str(ego['id']), frame)].tolist())
        defaults = {a['id']: re.search(r'value=(.*)\)$', a['value']).group(1)
                    for a in blueprint[sensor['type']] if re.search(r'value=(.*)\)$', a['value'])}
        record['effective_parameters_from_configuration_and_defaults'] = {**defaults, **sensor['attributes']}
        record['parameters_provenance'] = 'Saved actor creation attributes override the live blueprint catalogue defaults; no independent hardware calibration.'
        if 'camera.' in sensor['type']:
            info = first_messages[prefix + '/' + name + '/camera_info']
            record.update(width=info.width, height=info.height, K=list(info.k), R=list(info.r), P=list(info.p),
                          D=list(info.d), distortion_model=info.distortion_model,
                          optical_frame=info.header.frame_id,
                          T_sensor_from_optical=static[(frame, frame + '_optical')].tolist(),
                          camera_model_note='K/R/P/D are exactly the service CameraInfo; D=0 is its pinhole assumption, not a fitted lens calibration. CARLA lens parameters/defaults are also preserved.')
        if name == 'roof_lidar':
            msg = first_messages[prefix + '/roof_lidar/points']
            record.update(point_step=msg.point_step, fields=[dict(name=f.name, offset=f.offset, datatype=f.datatype, count=f.count) for f in msg.fields],
                          firing_time='scan_start + time_offset; header is scan_end. See per-frame roof_lidar/metadata.',
                          calibration_note='Generic physical profile is marked uncalibrated by CARLA; simulator mounting transforms are recorded exactly.')
            profile_path = root / 'lidar_physical_profile_generic.json'
            if profile_path.exists():
                record['physical_profile'] = json.loads(profile_path.read_text())
                record['physical_profile_provenance'] = json.loads((root / 'lidar_profile_provenance.json').read_text())
        if name == 'imu':
            msg = first_messages[prefix + '/imu/data']
            record.update(orientation_available=bool(msg.orientation_covariance[0] != -1),
                          angular_velocity_units='rad/s', linear_acceleration_units='m/s^2',
                          orientation_note='Orientation is unavailable (orientation_covariance[0]=-1); compass is in metadata. Ground truth odometry is independent.')
        sensors[name] = record
    calibration = dict(ego_frame='ego_' + str(ego['id']), world_frame='map',
        matrix_convention='T_parent_from_child maps homogeneous coordinates in child to parent.',
        axes='ROS x forward, y left, z up; camera optical x right, y down, z forward.',
        sensors=sensors, extrinsics=[dict(parent=k[0], child=k[1], T_parent_from_child=v.tolist()) for k, v in static.items()])
    imu_mount = np.asarray(sensors['imu']['T_ego_from_sensor'])
    calibration['mapping_extrinsics'] = {
        'T_imu_from_lidar': (np.linalg.inv(imu_mount) @ np.asarray(sensors['roof_lidar']['T_ego_from_sensor'])).tolist(),
        'T_imu_from_front_camera_optical': (np.linalg.inv(imu_mount) @ np.asarray(sensors['front_rgb']['T_ego_from_sensor']) @ np.asarray(sensors['front_rgb']['T_sensor_from_optical'])).tolist(),
        'T_imu_from_gnss': (np.linalg.inv(imu_mount) @ np.asarray(sensors['gnss']['T_ego_from_sensor'])).tolist()}
    save(root / 'calibration.json', calibration)
    validation = dict(status='passed' if not errors else 'failed', errors=sorted(set(errors)),
        frames=manifest['frames'], distance_m=distance,
        duration_seconds=(stats['/clock']['last_ns'] - stats['/clock']['first_ns']) / 1e9,
        topics=stats, required_sensor_stamps_identical=not any(a != stamps[0] for a in stamps[1:]),
        lidar_points_min=lidar_min, lidar_points_max=lidar_max, lidar_nonfinite_values=lidar_nonfinite,
        traffic_signal_frames=signal_rows, all_green_signal_frames=green_rows,
        sensor_extrinsics_constant=True, road_coverage_complete=report['complete'])
    save(root / 'bag_validation.json', validation)
    print(json.dumps({k: v for k, v in validation.items() if k != 'topics'}, indent=2), flush=True)
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
