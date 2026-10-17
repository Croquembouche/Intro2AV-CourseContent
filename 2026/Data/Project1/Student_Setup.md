# Project 1: Perception for UDrive

Read **Project1_Description.pdf** for the assignment. The Markdown file contains the same text in an editable format.

## Contents

- `stationary/bag/`: a short stationary recording for initial testing.
- `driving/bag/`: a longer driving recording.
- `project1_interfaces/`: the required ROS 2 output message definitions.

Each bag contains camera images, CameraInfo, LiDAR points, `/tf`, and `/clock`. Intrinsics and extrinsics are included in those messages. No running CARLA simulator or separate calibration file is needed. These bags were tested with ROS 2 Humble.

## Playback

Run these commands from this extracted `project1_udrive` directory:

```bash
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=71
export ROS_LOCALHOST_ONLY=1
ros2 bag info stationary/bag
ros2 bag play stationary/bag --delay 3
# Play the other sequence separately:
ros2 bag play driving/bag --delay 3
```

Use the same domain and localhost settings in every terminal running your program, RViz, or bag playback. Start your subscribers before playback. Slower playback is permitted, for example `--rate 0.5`.

The bags already publish recorded `/clock`. Start RViz with:

```bash
rviz2 --ros-args -p use_sim_time:=true
```

Set RViz's fixed frame to `base_link`. Enable simulated time on your time-dependent nodes as well. Begin with single-pass playback. Restart TF-consuming nodes before replaying from an earlier time or switching bags. `--loop` moves time backward and requires consumers to reset their state; old cached transforms can produce `TF_OLD_DATA` warnings.

## Build the output message definitions

From the extracted `project1_udrive` directory:

```bash
mkdir -p ~/project1_ws/src
cp -r project1_interfaces ~/project1_ws/src/
cd ~/project1_ws
source /opt/ros/humble/setup.bash
colcon build --packages-select project1_interfaces
source install/setup.bash
ros2 interface show project1_interfaces/msg/DetectedObjectArray
```

Source `~/project1_ws/install/setup.bash` in terminals that use this interface. Implement and document your own perception package; this package defines only the required output messages.

## Integrity

From this extracted directory, `sha256sum -c SHA256SUMS` verifies the distributed files.
