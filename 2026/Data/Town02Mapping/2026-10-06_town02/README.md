# Town02 mapping and localization ROS 2 dataset

Recorded October 6, 2026 from the existing `ego_58` vehicle on `Carla/Maps/Town02_Opt` with CARLA 0.10.0. The current vehicle, six sensors, sensor settings, and rainy weather were retained. All 24 traffic lights were frozen green throughout the recorded frames. The simulator was paused when recording finished.

The ROS 2 Humble SQLite bag is **`rosbag2/`**. Keep its `metadata.yaml` and database file together. Database size: 15.00 GiB. Recorded duration: **198.05 simulation seconds**, **3,962 complete frames**, **1.177 km** traveled, at the current **20 Hz** simulation step. Original simulation timestamps are preserved; `ros2 bag info` may display a date near 1970.

## Compressed copy

`rosbag2_zstd/` is a lossless compressed copy of all 18 topics: **7.18 GiB**, **52.1% smaller**. Every original CDR message and timestamp was verified after decompression, and ROS 2 Humble playback passed. See `COMPRESSION.md` for playback and package instructions. The original `rosbag2/` remains available.

## Road coverage

Recording was stopped at the user's request after **14 of 20 non-junction road segments** had at least one fully covered driving direction. **17/40 directional lanes** reached at least 98% coverage. A map lane sample is covered when an actual recorded ego pose lies within 3 m and its heading differs by at most 45 degrees. The map samples lanes at approximately 2 m intervals. This is a sample-based physical street coverage criterion. Exact fractions for each lane and junction connector are in `coverage_verified.json`; the trajectory figure is `road_coverage.png`. The check uses every ground-truth odometry message from the downloaded bag.

## Topics

| Topic | Messages |
|---|---:|
| `/clock` | 3,962 |
| `/carla/ego_58/odometry` | 3,962 |
| `/carla/ego_58/roof_lidar/points` | 3,962 |
| `/carla/ego_58/roof_lidar/metadata` | 3,962 |
| `/carla/ego_58/front_rgb/image` | 3,962 |
| `/carla/ego_58/front_rgb/metadata` | 3,962 |
| `/carla/ego_58/front_rgb/camera_info` | 3,962 |
| `/carla/ego_58/cabin_overview/image` | 3,962 |
| `/carla/ego_58/cabin_overview/metadata` | 3,962 |
| `/carla/ego_58/cabin_overview/camera_info` | 3,962 |
| `/carla/ego_58/front_radar/points` | 3,962 |
| `/carla/ego_58/front_radar/metadata` | 3,962 |
| `/carla/ego_58/imu/data` | 3,962 |
| `/carla/ego_58/imu/metadata` | 3,962 |
| `/carla/ego_58/gnss/data` | 3,962 |
| `/carla/ego_58/gnss/metadata` | 3,962 |
| `/tf` | 3,962 |
| `/carla/traffic_signals` | 3,962 |

Required streams are `/carla/ego_58/roof_lidar/points`, `/carla/ego_58/front_rgb/image`, `/carla/ego_58/imu/data`, and `/carla/ego_58/gnss/data`. Additional current sensors (cabin camera and radar), their metadata, front/cabin CameraInfo, `/clock`, `/tf`, ground-truth odometry, and traffic-light states are retained in the full recording.

## Calibration and coordinate conventions

`calibration.json` exports the **recorded TF transforms**, camera **K/R/P/D**, optical-frame transforms, creation settings, blueprint defaults, effective sensor parameters, LiDAR point layout, and direct IMU-to-LiDAR/camera/GNSS transforms. Matrices use `T_parent_from_child`, so `p_parent = T_parent_from_child @ p_child`. ROS frames use x forward, y left, z up. Camera optical axes are x right, y down, z forward. Raw CARLA `states.jsonl` and `map.json` use the simulator's left-handed axes; their y coordinates must be reflected for ROS use.

The front camera is 640 × 360 with 90-degree horizontal FOV. Its recorded pinhole matrix is:

```text
K = [320.000000, 0, 320.000000;
     0, 320.000000, 180.000000;
     0, 0, 1]
```

The service emits `plumb_bob` with `D=[0,0,0,0,0]`. These are the service's pinhole assumptions. The saved CARLA lens parameters/defaults are also included because a zero emitted D is not a measured distortion calibration. Sensor mounts in the ego frame are roof LiDAR `(0,0,2.5)` m, front camera `(1.5,0,2.2)` m, IMU `(0,0,0)` m, and GNSS `(0,0,0)` m. All sensor extrinsics were checked for constancy over the entire bag.

The roof LiDAR retains the current 32 channels, 80 m range, 200,000 pulses per second configuration, 20 Hz rotation, full 360-degree horizontal FOV, and blueprint vertical limits of -30 to +10 degrees. The generic physical model's full receiver/beam settings are in `lidar_physical_profile_generic.json`; that file's SHA-256 matches the live server profile catalogue. Its declared calibration status is **uncalibrated**. This refers to the generic physical response profile; the simulated sensor mounts are recorded explicitly.

## Mapping/localization use

- **Time:** use sensor `header.stamp` and enable `use_sim_time` on downstream ROS nodes. `/clock` is already recorded. Playback does not need an additional generated clock.
- **LiDAR deskew:** each 64-byte point has `channel`, `time_offset`, intensity and physical-return fields. The sensor header marks **scan end**; absolute point firing time is **`scan_start + time_offset`**, with `scan_start` in the per-frame LiDAR metadata. Clouds contain motion distortion and should be deskewed for motion-sensitive mapping. Many mapping packages expect fields called `ring` and `time`; adapt `channel`/`time_offset` and the timestamp convention explicitly if needed.
- **IMU:** angular velocity is rad/s; acceleration is m/s² and includes gravity. Orientation is unavailable (`orientation_covariance[0] = -1`); use an estimator rather than the empty quaternion. The native compass is retained in metadata. Saved noise/bias settings and zero emitted covariances are simulator parameters.
- **GNSS:** the map's georeference is preserved in `map.xodr`. The GNSS antenna lever arm is in `calibration.json`.
- **Ground truth:** `/carla/ego_58/odometry`, `map -> ego_58` in `/tf`, `states.jsonl`, and `ground_truth_trajectory.tum` are simulator reference data. Keep this reference pose separate from your estimated mapping/localization output. TUM timestamps are absolute simulation seconds and positions/quaternions use ROS map axes.
- **Images:** raw camera messages use `bgra8`. Convert to the encoding expected by your visual mapping pipeline. `front_camera_first_frame.png` is a convenience preview of the original first image.

```bash
source /opt/ros/humble/setup.bash
cd "/media/william/blueicedrive/Github/Intro2AV-CourseContent/2026/Data/Town02Mapping/2026-10-06_town02"
ros2 bag info rosbag2
ros2 bag play rosbag2 --rate 0.5 --read-ahead-queue-size 40
```

## Verification and provenance

`download_verification.json` verifies every downloaded source file against the server SHA-256 seal. `server_verification.json` checks stored source frames/sensors and the recording database. `bag_validation.json` checks every required sensor message, timestamps/counts, CameraInfo synchronization, point layout, recorded green-light states, and mounting-transform constancy. `playback_validation.json` verifies a short prefix through actual ROS 2 Humble DDS playback and sensor TF lookups in an isolated localhost domain. The complete bag's storage/timestamp checks are separate from the short playback check.

The original server session is `20261006-150452-85236e`. `provenance.json`, the initial/recording configurations, `events.jsonl`, route events, sensor catalogue, map/OpenDRIVE, and raw frame states retain the collection context. `SHA256SUMS` covers the delivered files. Run `sha256sum -c SHA256SUMS` from this directory to verify local integrity. The ROS bag has not been resampled, renamed, or repacked.
