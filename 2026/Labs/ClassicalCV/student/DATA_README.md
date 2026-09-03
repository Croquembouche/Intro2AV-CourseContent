# Supplied data

- `digit_0.csv` … `digit_9.csv`: clean 10×10 binary templates. The clean 2 and
  5 intentionally have identical x/y projection descriptors, so histogram-only
  matching reports an ambiguity instead of inventing a winner.
- `digit_variants/digit_3_*.csv`: shifted, thick, thin, gapped, and noisy 3s
  that fool naive x/y histogram matching.
- `digit_variants/digit_0_thick.csv`: erosion exercise.
- `digit_variants/digit_8_thin.csv`: dilation exercise.
- `digit_variants/digit_7_slanted.csv`: diagonal-stroke test for fixed
  horizontal/vertical kernels and the advanced edge pipeline.
- `digit_variants/digit_3_curved.csv`: curved-stroke test for the advanced edge
  pipeline; Hough can group only its locally straight edge fragments.
- `road_straight.png`: straight-lane Canny/Hough exercise.
- `road_curved.png`: curved-lane edge and polynomial-fit exercise.

The `msg/` folder contains the same digit matrices already flattened as YAML
message data. These are inspectable inputs for the ROS 2 CLI, not helper code:

```bash
ros2 topic pub --once /perception/digit_matrix \
  std_msgs/msg/Int32MultiArray "$(cat msg/d3.yaml)"
```

Digit matrices use `std_msgs/msg/Int32MultiArray`; image paths use
`std_msgs/msg/String`. The perception nodes themselves save the
visualizations.
