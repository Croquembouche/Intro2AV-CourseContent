#!/usr/bin/env python3
"""Write dataset usage notes, a trajectory figure, and local delivery checksums."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    validation = json.loads((root / 'bag_validation.json').read_text())
    coverage = json.loads((root / 'coverage_verified.json').read_text())
    calibration = json.loads((root / 'calibration.json').read_text())
    playback = json.loads((root / 'playback_validation.json').read_text())
    manifest = json.loads((root / 'manifest.json').read_text())
    download = json.loads((root / 'download_verification.json').read_text())
    if validation['status'] != 'passed' or playback['status'] != 'passed':
        raise RuntimeError('Dataset validation/playback failed')
    map_data = json.loads((root / 'map.json').read_text())
    trajectory = np.loadtxt(root / 'ground_truth_trajectory.tum')
    fractions = {l['lane_id']: l['fraction'] for l in coverage['lanes']}
    fig, ax = plt.subplots(figsize=(9, 9))
    for lane in map_data['lanes']:
        p = np.asarray(lane['points'])
        color = '#d2d7de' if lane['junction'] else '#16a085' if fractions[lane['id']] >= .98 else '#cc4433'
        ax.plot(p[:, 0], -p[:, 1], color=color, linewidth=1.8, alpha=.9)
    ax.plot(trajectory[:, 1], trajectory[:, 2], color='#25344b', linewidth=.6, alpha=.6, label='Recorded ego trajectory')
    ax.scatter(trajectory[0, 1], trajectory[0, 2], c='#e3a42b', s=65, zorder=5, label='Recording start')
    ax.scatter(trajectory[-1, 1], trajectory[-1, 2], c='#683bc8', marker='s', s=50, zorder=5, label='Recording end')
    ax.set_aspect('equal')
    ax.set_xlabel('ROS map x (m)')
    ax.set_ylabel('ROS map y (m)')
    ax.set_title(f"Town02 road coverage: {coverage['complete_lanes']}/{coverage['required_lanes']} directional lanes\n"
                 f"{validation['distance_m'] / 1000:.2f} km | {validation['duration_seconds']:.1f} simulation seconds", fontsize=14)
    ax.text(.01, -.12, 'Green: at least 98% of lane samples covered within 3 m and 45 degrees.\nRed: partial or unrecorded directions. Gray: junction connectors.\nCoverage measured from every recorded ground-truth odometry frame.', transform=ax.transAxes, fontsize=9)
    ax.grid(alpha=.12)
    ax.legend(loc='best')
    fig.tight_layout()
    fig.savefig(root / 'road_coverage.png', dpi=160, bbox_inches='tight')
    fig.savefig(root / 'road_coverage.svg', bbox_inches='tight')
    plt.close(fig)
    ego = calibration['ego_frame']
    prefix = '/carla/' + ego
    topics = '\n'.join(f"| `{name}` | {info['count']:,} |" for name, info in validation['topics'].items())
    bag_bytes = sum(f['bytes'] for name, f in download['files'].items() if name.endswith('.db3'))
    k = calibration['sensors']['front_rgb']['K']
    covered_roads = sorted({l['road_id'] for l in coverage['lanes'] if not l['junction'] and l['fraction'] >= .98})
    coverage_summary = (f"Every one of Town02's **20 non-junction road segments** was traversed in **both driving directions**: "
                        if coverage['complete'] else
                        f"Recording was stopped at the user's request after **{len(covered_roads)} of 20 non-junction road segments** had at least one fully covered driving direction. ")
    notes = f'''# Town02 mapping and localization ROS 2 dataset

Recorded October 6, 2026 from the existing `{ego}` vehicle on `{manifest['map']}` with CARLA {manifest['configuration']['server_version']}. The current vehicle, six sensors, sensor settings, and rainy weather were retained. All 24 traffic lights were frozen green throughout the recorded frames. The simulator was paused when recording finished.

The ROS 2 Humble SQLite bag is **`rosbag2/`**. Keep its `metadata.yaml` and database file together. Database size: {bag_bytes / 1024**3:.2f} GiB. Recorded duration: **{validation['duration_seconds']:.2f} simulation seconds**, **{validation['frames']:,} complete frames**, **{validation['distance_m'] / 1000:.3f} km** traveled, at the current **20 Hz** simulation step. Original simulation timestamps are preserved; `ros2 bag info` may display a date near 1970.

## Road coverage

{coverage_summary}**{coverage['complete_lanes']}/{coverage['required_lanes']} directional lanes** reached at least 98% coverage. A map lane sample is covered when an actual recorded ego pose lies within 3 m and its heading differs by at most 45 degrees. The map samples lanes at approximately 2 m intervals. This is a sample-based physical street coverage criterion. Exact fractions for each lane and junction connector are in `coverage_verified.json`; the trajectory figure is `road_coverage.png`. The check uses every ground-truth odometry message from the downloaded bag.

## Topics

| Topic | Messages |
|---|---:|
{topics}

Required streams are `{prefix}/roof_lidar/points`, `{prefix}/front_rgb/image`, `{prefix}/imu/data`, and `{prefix}/gnss/data`. Additional current sensors (cabin camera and radar), their metadata, front/cabin CameraInfo, `/clock`, `/tf`, ground-truth odometry, and traffic-light states are retained in the full recording.

## Calibration and coordinate conventions

`calibration.json` exports the **recorded TF transforms**, camera **K/R/P/D**, optical-frame transforms, creation settings, blueprint defaults, effective sensor parameters, LiDAR point layout, and direct IMU-to-LiDAR/camera/GNSS transforms. Matrices use `T_parent_from_child`, so `p_parent = T_parent_from_child @ p_child`. ROS frames use x forward, y left, z up. Camera optical axes are x right, y down, z forward. Raw CARLA `states.jsonl` and `map.json` use the simulator's left-handed axes; their y coordinates must be reflected for ROS use.

The front camera is 640 × 360 with 90-degree horizontal FOV. Its recorded pinhole matrix is:

```text
K = [{k[0]:.6f}, 0, {k[2]:.6f};
     0, {k[4]:.6f}, {k[5]:.6f};
     0, 0, 1]
```

The service emits `plumb_bob` with `D=[0,0,0,0,0]`. These are the service's pinhole assumptions. The saved CARLA lens parameters/defaults are also included because a zero emitted D is not a measured distortion calibration. Sensor mounts in the ego frame are roof LiDAR `(0,0,2.5)` m, front camera `(1.5,0,2.2)` m, IMU `(0,0,0)` m, and GNSS `(0,0,0)` m. All sensor extrinsics were checked for constancy over the entire bag.

The roof LiDAR retains the current 32 channels, 80 m range, 200,000 pulses per second configuration, 20 Hz rotation, full 360-degree horizontal FOV, and blueprint vertical limits of -30 to +10 degrees. The generic physical model's full receiver/beam settings are in `lidar_physical_profile_generic.json`; that file's SHA-256 matches the live server profile catalogue. Its declared calibration status is **uncalibrated**. This refers to the generic physical response profile; the simulated sensor mounts are recorded explicitly.

## Mapping/localization use

- **Time:** use sensor `header.stamp` and enable `use_sim_time` on downstream ROS nodes. `/clock` is already recorded. Playback does not need an additional generated clock.
- **LiDAR deskew:** each 64-byte point has `channel`, `time_offset`, intensity and physical-return fields. The sensor header marks **scan end**; absolute point firing time is **`scan_start + time_offset`**, with `scan_start` in the per-frame LiDAR metadata. Clouds contain motion distortion and should be deskewed for motion-sensitive mapping. Many mapping packages expect fields called `ring` and `time`; adapt `channel`/`time_offset` and the timestamp convention explicitly if needed.
- **IMU:** angular velocity is rad/s; acceleration is m/s² and includes gravity. Orientation is unavailable (`orientation_covariance[0] = -1`); use an estimator rather than the empty quaternion. The native compass is retained in metadata. Saved noise/bias settings and zero emitted covariances are simulator parameters.
- **GNSS:** the map's georeference is preserved in `map.xodr`. The GNSS antenna lever arm is in `calibration.json`.
- **Ground truth:** `{prefix}/odometry`, `map -> {ego}` in `/tf`, `states.jsonl`, and `ground_truth_trajectory.tum` are simulator reference data. Keep this reference pose separate from your estimated mapping/localization output. TUM timestamps are absolute simulation seconds and positions/quaternions use ROS map axes.
- **Images:** raw camera messages use `bgra8`. Convert to the encoding expected by your visual mapping pipeline. `front_camera_first_frame.png` is a convenience preview of the original first image.

```bash
source /opt/ros/humble/setup.bash
cd "{root}"
ros2 bag info rosbag2
ros2 bag play rosbag2 --rate 0.5 --read-ahead-queue-size 40
```

## Verification and provenance

`download_verification.json` verifies every downloaded source file against the server SHA-256 seal. `server_verification.json` checks stored source frames/sensors and the recording database. `bag_validation.json` checks every required sensor message, timestamps/counts, CameraInfo synchronization, point layout, recorded green-light states, and mounting-transform constancy. `playback_validation.json` verifies a short prefix through actual ROS 2 Humble DDS playback and sensor TF lookups in an isolated localhost domain. The complete bag's storage/timestamp checks are separate from the short playback check.

The original server session is `{manifest['id']}`. `provenance.json`, the initial/recording configurations, `events.jsonl`, route events, sensor catalogue, map/OpenDRIVE, and raw frame states retain the collection context. `SHA256SUMS` covers the delivered files. Run `sha256sum -c SHA256SUMS` from this directory to verify local integrity. The ROS bag has not been resampled, renamed, or repacked.
'''
    (root / 'README.md').write_text(notes)
    cache = download['files']
    with (root / 'SHA256SUMS').open('w') as out:
        for path in sorted(root.rglob('*')):
            if not path.is_file() or path.name == 'SHA256SUMS' or path.name.endswith('.download'):
                continue
            name = path.relative_to(root).as_posix()
            if name in cache and path.stat().st_size == cache[name]['bytes']:
                checksum = cache[name]['sha256']
            else:
                h = hashlib.sha256()
                with path.open('rb') as stream:
                    for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
                        h.update(chunk)
                checksum = h.hexdigest()
            out.write(checksum + '  ' + name + '\n')
    print('Dataset notes, trajectory plot, and delivery checksums written to', root)


if __name__ == '__main__':
    main()
