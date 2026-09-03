# Instructor command and result reference

All observations and publications use the ROS 2 CLI directly. In each new
terminal run `source /opt/ros/humble/setup.bash` and
`source ws/install/setup.bash` first.

Before the first build, run `rosdep install --from-paths src --ignore-src -r -y`
from `ws`. The package metadata declares OpenCV, NumPy, and the ROS Python
dependencies used by the nodes.

| Experiment | Executable | Input | Result topic | Reference result |
|---|---|---|---|---|
| Clean histogram | `digit_recognizer_node` | `msg/d3.yaml` | `/perception/digit_report` | `prediction=3`, distance 0 |
| Histogram collision | same | `msg/d5.yaml` | same | `prediction=-1`, matches `[2,5]` |
| Histogram failures | same | `d3_shift`, `d3_thick`, `d3_thin`, `d3_holes`, `d3_dots` | same | `-1, 9, 7, 7, 9` |
| Morphology | `digit_recognizer_morphology` | `d0_thick`, `d8_thin`, `d3_dots`, `d3_holes` | `/perception/morph_digit_report` | repaired to `0, 8, 3, 3` |
| Fixed kernels | `digit_kernel_node` | `d7_slant`, `d3_curve` | `/perception/kernel_digit_report` | `1, 3` |
| Advanced edges | `digit_edge_node` | `d7_slant`, `d3_curve` | `/perception/edge_digit_report` | `7, 3` |
| Straight lane | `lane_detector_node` | `road_straight.png` | `/perception/lane_report` | 11 Hough segments |
| Curved lane | same, `mode=curved` | `road_curved.png` | same | 2 fitted curves |

Digit publication:

```bash
ros2 topic pub --once /perception/digit_matrix \
  std_msgs/msg/Int32MultiArray "$(cat msg/d7_slant.yaml)"
```

Morphology parameter sets:

| Input | operation | kernel | expected_digit |
|---|---|---|---|
| `d0_thick.yaml` | `erode` | `square2` | 0 |
| `d8_thin.yaml` | `dilate` | `square2` | 8 |
| `d3_dots.yaml` | `opening` | `square2` | 3 |
| `d3_holes.yaml` | `closing` | `horizontal2` | 3 |

Set the four parameters with `ros2 param set`, arm a fresh `ros2 topic echo
--once`, and publish the selected YAML input. The completed node saves every
PNG through its `output_dir` parameter; no separate figure-generation script
exists.
