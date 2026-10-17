# Project 2: Localization and Mapping for UDrive

**Course:** Intro2AV  
**Format:** Group project  
**Due date:** October 20, 2026

## Your role

You are a localization and mapping software engineer at **UDrive**, an autonomous-driving startup. Your team has received a recording from a simulated vehicle driving through Town02. UDrive's planning team needs to know **where the vehicle is** and needs a **map of the surrounding environment** to support navigation.

Your software must use the recorded sensor measurements to estimate the vehicle's trajectory and build a map of the area observed during the drive.

## Your task

Develop a ROS 2 system that performs **localization and mapping**. You may use **the front camera, the roof LiDAR, or both** as your main source of observations. **GNSS and IMU measurements are also available** to help estimate motion, determine metric scale, or reduce drift. Explain which sensors your group uses and what each contributes.

Your system must estimate the vehicle's pose over time and construct a map from camera or LiDAR observations. You may estimate the poses and map together, or build a map and then localize against it. A GNSS track or an integrated IMU trajectory alone does not satisfy the mapping requirement.

A sparse visual landmark map, a LiDAR point-cloud map, or an occupancy map is acceptable. The map should represent observed environmental structure and remain consistent with the estimated trajectory. You are responsible for mapping the **recorded route**; the recording does not cover every road in Town02.

## What you are given

- A ROS 2 bag containing approximately **198 seconds** of driving data over a **1.18 km** route in Town02.
- Front-camera images and CameraInfo, roof-LiDAR point clouds, GNSS fixes, IMU measurements, sensor mounting transforms, and recorded simulation time.
- A calibration file containing camera intrinsics and sensor extrinsics.

The bag has been tested with **ROS 2 Humble** and can be replayed without running CARLA. The supplied lossless compressed copy preserves the original measurements and timestamps.

### Data conventions

The ego reference frame is `ego_58`. Sensor frames include `ego_58/roof_lidar`, `ego_58/front_rgb_optical`, `ego_58/imu`, and `ego_58/gnss`. Body and LiDAR axes are x forward, y left, z up; camera optical axes are x right, y down, z forward. Point clouds already use ROS coordinates.

Use the supplied intrinsics and mounting transforms. Camera images use `bgra8` encoding. IMU acceleration includes gravity, angular velocity is in radians per second, and an IMU orientation estimate is not provided. LiDAR points include channel and firing-time information; inspect the recorded field layout and timing convention if your method needs motion compensation.

Enable `use_sim_time` on time-dependent nodes, including RViz. The bag already contains `/clock`. Associate measurements and timestamp your results using their original simulation times.

## Mapping requirements

Construct the map in a consistent coordinate frame. Use metres for position and map dimensions, and explain how you define the map origin and axes. If your method estimates camera or LiDAR poses, account for the sensor's mounting transform when relating those poses to the vehicle.

The final map must represent the environmental structure observed along the recorded route. Explain what its landmarks, points, or cells represent, and save it in a format that can be opened and inspected.

Process the full recording, including difficult sections. Slower-than-real-time playback is acceptable. Use original measurement timestamps, account for initialization and tracking failures, and do not replace failed estimates with reference poses.

## Engineering expectations

Use **C++ or Python with ROS 2**. Select your methods, inspect the data, and handle calibration, timestamps, and coordinate frames. Existing libraries are allowed; cite their sources and explain your group's implementation, configuration, and integration work.

Calculate your poses and map from the permitted sensor measurements. Simulator ground-truth odometry, recorded world-to-ego transforms, raw simulator states, reference trajectories, and the supplied road geometry may be used only for evaluation or visualization. Do not feed them into your estimator, use them to set trajectory scale, or submit them as your estimated map.

GNSS measurements are permitted inputs. Document their conversion to a local metric frame and any assumptions about uncertainty. If you use monocular images, explain how you obtain metric scale from available measurements or stated physical constraints. Use an estimated transform for your own map and body frames; do not reuse the recorded ground-truth vehicle transform.

## What to submit

### 1. Constructed map

Submit the final map constructed from the supplied camera and/or LiDAR measurements. A sparse visual landmark map, a LiDAR point-cloud map, or an occupancy map is acceptable. Include the files needed to open the map in your chosen format, and state the format, coordinate conventions, and software needed to view it in your technical report.

Do not resubmit the input recording or supplied simulator road map.

### 2. One-page technical report

In no more than one page, explain:

- your approach, sensor choices, and why you chose them;
- how you checked localization accuracy, with at least one numerical result;
- evidence of map quality, such as consistency when revisiting an area, duplicated structures, or alignment of new observations with the map;
- a significant engineering problem and an observed failure case or limitation.

Briefly identify the submitted map's format, coordinate conventions, and how to open it. Use a map figure or other evidence to support your discussion.

Support your claims with evidence and explain your evaluation procedure. A reference trajectory may be used after estimation to measure error. If your map uses a local origin, apply one fixed rigid alignment for evaluation and report it; do not fit a different alignment at each timestamp or rescale a metric trajectory to improve the reported error.
