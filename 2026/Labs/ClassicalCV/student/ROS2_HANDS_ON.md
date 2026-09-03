# Direct ROS 2 commands for every checkpoint

Do not use a wrapper script. For every checkpoint: rebuild after editing,
source the workspace in each terminal, run the node, inspect the topics, echo
the result topic, and publish one supplied input message.

Before the first checkpoint, follow the three setup slides or `README.md`:
unpack to `~/cisc647/cv_lab`, install dependencies with `rosdep`, verify that
`cv2`, NumPy, and `rclpy` import with the system Python, create the separate
`cv_practice` package, and build the supplied `cv_lab` package.

| Topic | Student node | Student TODOs | Result topic |
|---|---|---|---|
| Projection histograms | `digit_recognizer_node.py` | `HIST-ROS`, `HIST-CV`, `HIST-PUB` | `/perception/digit_report` |
| Morphology | `digit_recognizer_morphology.py` | `MORPH-ROS`, `MORPH-CV`, `MORPH-PUB` | `/perception/morph_digit_report` |
| Fixed kernels | `digit_kernel_node.py` | `KERNEL-ROS`, `KERNEL-CV`, `KERNEL-PUB` | `/perception/kernel_digit_report` |
| Sobel/Canny/Hough | `digit_edge_node.py` | `EDGE-ROS`, `EDGE-CV`, `EDGE-PUB` | `/perception/edge_digit_report` |
| Straight lanes | `lane_detector_node.py` | `LANE-ROS`, `STRAIGHT-CV`, `LANE-PUB` | `/perception/lane_report` |
| Curved lanes | `lane_detector_node.py` | `CURVE-CV` | `/perception/lane_report` |

## Reusable ROS 2 pattern

```bash
# Build terminal, after each code change
cd ~/cisc647/cv_lab/ws
colcon build --symlink-install --packages-select cv_lab
source install/setup.bash
cd ..

# Node terminal
ros2 run cv_lab EXECUTABLE --ros-args -p output_dir:="$PWD/outputs"

# Observer terminal
ros2 node list
ros2 topic list -t
ros2 topic info INPUT_TOPIC --verbose
ros2 topic echo --once RESULT_TOPIC

# Publisher terminal
ros2 topic pub --once INPUT_TOPIC MESSAGE_TYPE "$(cat msg/INPUT.yaml)"
```

## Exact inputs

Use `std_msgs/msg/Int32MultiArray` on `/perception/digit_matrix` for all digit
experiments.

```bash
ros2 topic pub --once /perception/digit_matrix \
  std_msgs/msg/Int32MultiArray "$(cat msg/d3.yaml)"
```

Change only the YAML filename to test clean digits `d0.yaml` through
`d9.yaml`, histogram failures `d3_shift.yaml`, `d3_thick.yaml`,
`d3_thin.yaml`, `d3_holes.yaml`, and `d3_dots.yaml`, morphology inputs
`d0_thick.yaml` and `d8_thin.yaml`, or edge-shape inputs `d7_slant.yaml`
and `d3_curve.yaml`.

For morphology, keep the node running and set parameters before publishing:

```bash
ros2 param set /digit_recognizer_morphology operation closing
ros2 param set /digit_recognizer_morphology kernel horizontal2
ros2 param set /digit_recognizer_morphology case_name 3_holes
ros2 param set /digit_recognizer_morphology expected_digit 3
```

For a road image, use `std_msgs/msg/String` and publish its absolute path:

```bash
ros2 topic pub --once /perception/road_image_path \
  std_msgs/msg/String "{data: '$PWD/inputs/road_straight.png'}"
```

Change the lane mode before the curved-road input:

```bash
ros2 param set /lane_detector mode curved
ros2 topic pub --once /perception/road_image_path \
  std_msgs/msg/String "{data: '$PWD/inputs/road_curved.png'}"
```

`prediction=-1; ambiguous=true` is a valid result: more than one clean
template has the same best projection-histogram descriptor. Every node writes a
PNG to the `output_dir` parameter; that visualization code is supplied.
