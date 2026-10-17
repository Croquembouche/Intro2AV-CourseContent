# Surround camera and LiDAR sensor fusion

This dataset extends the UDrive perception task to six cameras covering the vehicle's surroundings and one roof LiDAR. Detect cars and pedestrians, combine camera and LiDAR measurements, and estimate object positions relative to the ego vehicle. Your system must handle measurements captured at different times and avoid reporting the same object twice when it appears in overlapping camera views.

## Dataset and timing

Captured on September 14, 2026 in CARLA 0.10.0 on Town10HD_Opt, this bag contains 60.0 seconds of driving over 421.6 m. It contains six distinct RGB views: front, front left, rear left, rear, rear right, and front right. Each camera has a 90 degree horizontal field of view at 640 × 360 pixels. Adjacent views overlap. Images use `bgra8` encoding. The roof sensor supplies complete 360 degree LiDAR scans with 32 channels and an 80 m configured range.

**The streams are asynchronous.** Camera timestamps differ from LiDAR timestamps, and the six cameras have different sample schedules. Camera intervals vary between 100 and 200 ms; LiDAR scans are retained every 100 ms. Use the original `header.stamp` values. Equal message indices do not identify simultaneous measurements.

This is a controlled asynchronous dataset: different genuine samples were selected from a common 20 Hz simulator recording. Retained images and point clouds keep their original measurement timestamps. The dataset does not simulate independent clock drift or unknown clock offsets. The irregular camera schedules are intentional, not bag corruption. `validation.json` gives measured counts, rates, and timestamp offsets.

The bag contains 2,483 images and 601 LiDAR scans. CameraInfo is included for every image.

| Camera | Images | Measured average rate |
|---|---:|---:|
| Front | 398 | 6.63 Hz |
| Front left | 493 | 8.23 Hz |
| Rear left | 369 | 6.17 Hz |
| Rear | 422 | 7.06 Hz |
| Rear right | 455 | 7.63 Hz |
| Front right | 346 | 5.81 Hz |

The LiDAR rate is 10 Hz, with 23,072–40,426 points per scan. Every image is approximately 50 ms from its nearest retained LiDAR scan. Simulation timestamps run from about 10.163 to 70.163 seconds; dates shown near 1970 by `ros2 bag info` reflect these simulation timestamps, not the recording's calendar date.

## Topics and coordinates

For each camera name `front`, `front_left`, `rear_left`, `rear`, `rear_right`, and `front_right`:

- `/camera/<name>/image_raw` — `sensor_msgs/msg/Image`.
- `/camera/<name>/camera_info` — `sensor_msgs/msg/CameraInfo`, with the same timestamp as its associated image.

Other topics:

- `/lidar/roof/points` — `sensor_msgs/msg/PointCloud2`, XYZ and intensity in `top_lidar`.
- `/ego/odometry` — `nav_msgs/msg/Odometry`, simulator-derived ego pose and velocity at 20 Hz. This is supplied motion information, not a student localization estimate.
- `/tf` — timestamped `map → base_link` poses and fixed sensor mounting transforms, repeated at 20 Hz.
- `/clock` — recorded simulation time at 20 Hz.

Positions are in metres. `base_link` and `top_lidar` use x forward, y left, z up. Each `<name>_camera` is an optical frame with x right, y down, z forward; `<name>_camera_mount` is its mounting frame. Read intrinsics from CameraInfo and extrinsics from TF. The point cloud already uses ROS coordinates. Do not repeat the CARLA handedness conversion.

The ego reference origin is the CARLA vehicle actor origin. Calibration is provided; you do not need to calibrate the sensors again. The bag contains no object-class annotations or reference object positions.

## Student task

Develop a ROS 2 system that uses all six cameras and the roof LiDAR to detect cars and pedestrians and estimate their horizontal object-center positions. Decide how to associate measurements in time, handle vehicle motion, and combine detections across overlapping views. A measurement from an earlier time must not silently be treated as current.

Publish `project1_interfaces/msg/DetectedObjectArray` on `/project1/detected_objects`, using the supplied message definitions. Use `car` and `person` as the class strings; confidence must be between 0 and 1. Report signed object-center `x` and `y` coordinates in `base_link`.

Publish one output array per retained LiDAR scan, including an empty array when no supported detections remain. Set the output header to that LiDAR scan's original timestamp. All positions in the array must refer to `base_link` at that reference time. Do not report the same object multiple times at one reference timestamp. Do not fabricate a position when the available measurements cannot support an estimate.

Process the entire bag. Slower playback is acceptable. Document your use of past or future measurements, buffering delay, assumptions about object motion, and cases that your system cannot resolve. Ego odometry alone does not describe the motion of other road users.

Submit runnable ROS 2 software and build/run instructions, an output result bag, a one-page report, a 3–5 minute demonstration video, and an individual contribution summary. In the report, quantify the timing mismatch you observed and provide evidence for how it affects your fusion results. Show representative results across the surround views and at least one failure case. Existing libraries and pretrained models are allowed with attribution.

## Playback on ROS 2 Humble

The input bag uses only standard ROS message types and can be played without building the output message package. Run the following from the extracted `surround_fusion_async` folder:

```bash
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=71
export ROS_LOCALHOST_ONLY=1
ros2 bag info bag
ros2 bag play bag --delay 3 --rate 0.5
```

Build the supplied output message definitions when developing your solution. From the extracted dataset folder:

```bash
mkdir -p ~/surround_fusion_ws/src
cp -r project1_interfaces ~/surround_fusion_ws/src/
cd ~/surround_fusion_ws
source /opt/ros/humble/setup.bash
colcon build --packages-select project1_interfaces
source install/setup.bash
ros2 interface show project1_interfaces/msg/DetectedObjectArray
```

Source that workspace in terminals that run your output publisher or inspect its messages. Use the same ROS domain settings in all subscriber terminals. Enable `use_sim_time:=true` on time-dependent nodes and RViz. The bag already contains `/clock`; use a single player and do not add another clock publisher. Start subscribers before playback. Restart TF-consuming programs before replaying from the beginning, to avoid keeping transforms from the previous pass. The input rates and timestamps remain measurement-time values when playback is slowed down.

