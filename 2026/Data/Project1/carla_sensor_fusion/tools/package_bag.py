#!/usr/bin/env python3
"""Keep Project 1 sensor inputs, normalize names, and check exact synchronization."""
import argparse
import collections
import json
from pathlib import Path
import numpy as np
import rosbag2_py
from rclpy.serialization import deserialize_message, serialize_message
from rosidl_runtime_py.utilities import get_message


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    p.add_argument('output', type=Path)
    p.add_argument('--ego', type=int, required=True)
    a = p.parse_args()
    ego = f'ego_{a.ego}'
    prefix = '/carla/' + ego
    names = {prefix + '/front_rgb/image': '/camera/front/image_raw',
             prefix + '/front_rgb/camera_info': '/camera/front/camera_info',
             prefix + '/roof_lidar/points': '/lidar/roof/points',
             '/tf': '/tf', '/clock': '/clock'}
    frames = {ego: 'base_link', ego + '/front_rgb': 'front_camera_mount',
              ego + '/front_rgb_optical': 'front_camera',
              ego + '/roof_lidar': 'top_lidar'}
    if a.output.exists():
        raise FileExistsError(a.output)
    reader = rosbag2_py.SequentialReader()
    reader.open(rosbag2_py.StorageOptions(uri=str(a.source), storage_id='sqlite3'), rosbag2_py.ConverterOptions('', ''))
    types = {t.name: t.type for t in reader.get_all_topics_and_types()}
    missing = set(names) - set(types)
    if missing:
        raise RuntimeError(f'Missing required topics: {missing}')
    writer = rosbag2_py.SequentialWriter()
    writer.open(rosbag2_py.StorageOptions(uri=str(a.output), storage_id='sqlite3'), rosbag2_py.ConverterOptions('', ''))
    for source, dest in names.items():
        writer.create_topic(rosbag2_py.TopicMetadata(name=dest, type=types[source], serialization_format='cdr'))
    counts = collections.Counter()
    stamps = collections.defaultdict(list)
    point_counts = []
    first = {}
    while reader.has_next():
        topic, data, timestamp = reader.read_next()
        if topic not in names:
            continue
        msg = deserialize_message(data, get_message(types[topic]))
        if topic == '/tf':
            msg.transforms = [tf for tf in msg.transforms if tf.child_frame_id in frames]
            for tf in msg.transforms:
                tf.header.frame_id = frames.get(tf.header.frame_id, tf.header.frame_id)
                tf.child_frame_id = frames[tf.child_frame_id]
        elif hasattr(msg, 'header'):
            msg.header.frame_id = frames[msg.header.frame_id]
            ns = msg.header.stamp.sec * 10**9 + msg.header.stamp.nanosec
            assert ns == timestamp, (topic, ns, timestamp)
            stamps[names[topic]].append(ns)
        if topic.endswith('/points'):
            assert msg.point_step == 16 and len(msg.data) == msg.row_step
            xyz = np.frombuffer(msg.data, dtype='<f4').reshape(-1, 4)
            assert len(xyz) > 0 and np.isfinite(xyz).all()
            point_counts.append(len(xyz))
        dest = names[topic]
        first.setdefault(dest, msg)
        writer.write(dest, serialize_message(msg), timestamp)
        counts[dest] += 1
    del writer
    times = stamps['/camera/front/image_raw']
    assert times and times == stamps['/lidar/roof/points'] == stamps['/camera/front/camera_info']
    assert all(y > x for x, y in zip(times, times[1:]))
    dt = np.diff(times) / 1e9
    assert np.allclose(dt, 0.05, atol=1e-6), 'Missing simulation frames'
    report = {'counts': dict(counts), 'synchronized_pairs': len(times),
              'duration_seconds': (times[-1] - times[0]) / 1e9,
              'rate_hz': float(1 / np.median(dt)), 'max_camera_lidar_skew_ns': 0,
              'points_per_scan_min': min(point_counts), 'points_per_scan_max': max(point_counts),
              'frames': frames, 'source_bag': str(a.source), 'ego_actor': a.ego}
    (a.output.parent / 'validation.json').write_text(json.dumps(report, indent=2))
    preview(first, a.output.parent)
    print(json.dumps(report, indent=2))


def preview(first, output):
    from PIL import Image, ImageDraw
    from scipy.spatial.transform import Rotation
    im = first['/camera/front/image_raw']
    assert im.encoding == 'bgra8'
    rgb = Image.frombytes('RGBA', (im.width, im.height), bytes(im.data), 'raw', 'BGRA').convert('RGB')
    rgb.save(output / 'front_camera.png')
    cloud = first['/lidar/roof/points']
    xyz = np.frombuffer(cloud.data, dtype='<f4').reshape(-1, 4)[:, :3]
    transforms = {}
    for tf in first['/tf'].transforms:
        q = tf.transform.rotation
        t = tf.transform.translation
        matrix = np.eye(4)
        matrix[:3, :3] = Rotation.from_quat([q.x, q.y, q.z, q.w]).as_matrix()
        matrix[:3, 3] = [t.x, t.y, t.z]
        transforms[tf.child_frame_id] = matrix
    base_camera = transforms['front_camera_mount'] @ transforms['front_camera']
    camera_lidar = np.linalg.inv(base_camera) @ transforms['top_lidar']
    optical = (camera_lidar @ np.column_stack((xyz, np.ones(len(xyz)))).T).T[:, :3]
    optical = optical[optical[:, 2] > 0.1]
    k = np.array(first['/camera/front/camera_info'].k).reshape(3, 3)
    uvz = optical @ k.T
    uv = uvz[:, :2] / uvz[:, 2:]
    draw = ImageDraw.Draw(rgb)
    n = 0
    for (u, v), point in zip(uv, optical):
        if 0 <= u < im.width and 0 <= v < im.height:
            depth = min(point[2] / 60, 1)
            draw.ellipse((u-1, v-1, u+1, v+1), fill=(int(255*(1-depth)), int(255*depth), 70))
            n += 1
    assert n > 0
    rgb.save(output / 'camera_lidar_projection.png')
    # A display image only; the bag retains the full XYZ/intensity point cloud.
    top = Image.new('RGB', (640, 640), '#101c29')
    draw = ImageDraw.Draw(top)
    for x, y, z in xyz:
        u, v = 320 - y*4, 320 - x*4
        if 0 <= u < 640 and 0 <= v < 640:
            draw.point((u, v), fill='#47d9e8')
    draw.ellipse((316,316,324,324),fill='white')
    draw.text((12,12),'Roof LiDAR: up = forward, left = vehicle left; 4 px/m',fill='white')
    top.save(output / 'roof_lidar.png')
    calibration = {'camera_K': k.tolist(), 'T_camera_optical_from_lidar': camera_lidar.tolist(),
                   'T_base_from_lidar': transforms['top_lidar'].tolist(),
                   'projected_points_first_frame': n,
                   'convention': 'p_target = T_target_from_source @ [x,y,z,1]'}
    (output / 'calibration.json').write_text(json.dumps(calibration, indent=2))


if __name__ == '__main__':
    main()
