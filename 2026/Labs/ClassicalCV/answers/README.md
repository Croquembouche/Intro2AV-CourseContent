# Classical perception lab — instructor answers

This package intentionally contains no build, topic, publishing, or experiment
wrapper scripts. Use the same direct ROS 2 commands shown to students.

Install dependencies from the package metadata before the first build:

```bash
source /opt/ros/humble/setup.bash
cd ws
rosdep install --from-paths src --ignore-src -r -y
```

This installs the declared OpenCV (`python3-opencv`) and NumPy
(`python3-numpy`) dependencies along with any missing ROS dependencies. If
`which python3` points to Anaconda or Miniconda, deactivate that environment
before sourcing ROS 2 Humble.

```bash
source /opt/ros/humble/setup.bash
cd ws
colcon build --symlink-install --packages-select cv_lab
source install/setup.bash
cd ..

# Terminal 1
ros2 run cv_lab digit_recognizer_node --ros-args \
  -p output_dir:="$PWD/outputs"

# Terminal 2
ros2 node list
ros2 topic list -t
ros2 topic info /perception/digit_matrix --verbose
ros2 topic echo --once /perception/digit_report

# Terminal 3
ros2 topic pub --once /perception/digit_matrix \
  std_msgs/msg/Int32MultiArray "$(cat msg/d3.yaml)"
```

Expected first result: `prediction=3`, `ambiguous=false`, and `distance=0`.
The node writes `outputs/histogram_digit.png`. See `ROS2_HANDS_ON.md` for
every node, input, parameter, result topic, and reference result.
