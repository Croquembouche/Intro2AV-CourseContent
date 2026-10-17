# Grade the reviewed camera–LiDAR detections

This evaluation covers the exact keyframes listed in `evaluation_set.json`.
Only cars and people that were visually reviewed and have at least five
body-height LiDAR support candidates are eligible. `review.html` shows the
RGB decisions, point overlays, CARLA identities and reasons for exclusion.
Frames between the listed timestamps have not been visibility reviewed.

The annotations were prepared by Codex through visual inspection; this does
not imply that the course instructor has signed them off. There are 29 reviewed
frames: 15 with eligible targets and 14 without an eligible target. The 22
instances comprise 19 car views and three pedestrian views, representing ten
distinct cars and two distinct people. Repeated views and the very small
pedestrian sample limit statistical coverage. The full-frame CARLA labels
are separate from this reviewed subset and must not be used directly as the
detector recall denominator. Use the September 12 replacement student bag;
older recordings have different timestamps and labels.

## Position and matching rules

- Coordinates: metres in ROS `base_link`, x forward, y left.
- Reference: CARLA bounding-box center, using the recorded actor pose and the
  full actor-local box offset/rotation saved in `../actor_geometry.json`.
- Evaluated classes: exact strings `car` and `person`.
- Confidence threshold: 0.25; lower-confidence predictions are not scored.
- Planar matching tolerances: car 3 m, person 1 m. These are explicit,
  configurable benchmark defaults. The car tolerance allows a coarse
  visible-surface/cluster estimate; it does not demand exact hidden-center
  reconstruction from a single view.
- Matching is one-to-one within each class: maximize the number of valid
  matches, then minimize total x/y error. A duplicate near an eligible target
  counts as a false positive.
- An unmatched prediction near a known excluded actor of the same class is
  ignored. It cannot hide a duplicate prediction near an eligible target.
- Missing output at a reviewed timestamp counts as an empty prediction array,
  producing false negatives for its eligible targets. Output coverage is
  reported separately. Unreviewed timestamps are not scored.
- An empty evaluation set or a set marked blocked/pending cannot be scored.

The report contains per-class and overall precision, recall, joint
classification/localization F1, matched-location errors, output coverage, and
per-frame matches. `joint_detection_localization_score_percent` is 100 × micro
F1. It is a benchmark metric; the instructor decides how it contributes to
the course grade. Location errors describe matched predictions only, so read
them together with recall and coverage.

## Record and score a student output bag

Build and source the supplied `project1_interfaces` package and the student
node's ROS workspace. Use ROS 2 Humble, the same ROS domain in all terminals,
and `use_sim_time:=true` for the student node. Start the node and this recorder
before replaying either input sequence:

```bash
ros2 bag record -o student_predictions /project1/detected_objects
```

Replay both sequences into this one output recording, one after the other:

```bash
ros2 bag play stationary/bag --delay 3 --rate 0.5
ros2 bag play driving/bag --delay 3 --rate 0.5
```

Slow playback further if the detector cannot process all frames. Stop the
output recorder after both sequences finish. The student must preserve the
input image/LiDAR stamp and publish exactly one array per processed pair,
including empty arrays. Use reliable subscriptions and sufficient queue depth
for lossless offline evaluation.

With the ROS interface workspace sourced, run from `carla_sensor_fusion`:

```bash
python3 tools/grade_detections.py student_predictions \
  --evaluation instructor/front_camera_evaluation/evaluation_set.json \
  --output student_score.json
```

The grader uses NumPy and SciPy. On the course workstation, use
`PYTHONNOUSERSITE=1 /usr/bin/python3` after sourcing ROS and the interface
workspace if user-installed Python packages conflict with ROS dependencies.

Alternatively, pass a JSONL file containing one row per output timestamp:

```json
{"stamp_ns": 12345678900, "frame_id": "base_link", "objects": [{"class_name": "car", "confidence": 0.9, "x": 12.0, "y": -2.0}]}
```

The timestamp and values above are an example, not a dataset answer. An empty
output uses `"objects": []`. Duplicate timestamps, wrong frame IDs, invalid
confidence values and nonfinite positions are rejected.

## Instructor checks

`summary.json` lists the final reviewed coverage and support counts.
`../geometry_validation.json` checks the box transforms against CARLA's own
geometry functions on the simulator host. `../pose_tf_validation.json` also
checks every exported ego rotation against the delivered bag TF. `tools/test_grade_detections.py` checks matching and scoring
edge cases. The final grader validation uses synthetic ground-truth-derived
outputs solely to test scoring and ROS bag decoding; it is not a detector or
an accuracy result for a student implementation.
