# Student evaluator: 1 camera + 1 LiDAR, synchronized

This ZIP is a complete offline scoring package. It includes the reference subset,
Python scripts, message definitions, dependency list, tests, and an empty-output example.
It does not include the large sensor recordings or a detector. Keep all files together.
Use this package only with the corresponding released course dataset.

## Install once

Use Python 3.10–3.13. Internet is needed only to install dependencies; scoring then runs locally.
The evaluator reads JSON/JSONL and ROS 2 SQLite bag directories without ROS, CARLA,
a GPU, or a compiled message workspace. Running your fusion node still needs its own environment.

Windows (PowerShell, from the extracted folder):

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe evaluate_sync_1cam1lidar.py path\to\student_predictions --output score.json
```

macOS / Linux (from the extracted folder):

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python evaluate_sync_1cam1lidar.py /path/to/student_predictions --output score.json
```

Pass your **prediction bag directory** containing metadata.yaml and its database(s),
not the input sensor bag and not a lone .db3 file. The default output topic is
`/project1/detected_objects`; use `--topic` if you recorded a different name.
The bundled .msg files let the reader decode the custom type directly.
If your node runs under ROS, record its output before replaying the input dataset:

```bash
ros2 bag record -o student_predictions /project1/detected_objects
```

## JSON / JSONL alternative

Pass `predictions.jsonl` in place of the bag directory. Each line is one array:

```json
{"stamp_ns": 12345678900, "frame_id": "base_link", "objects": [{"class_name": "car", "confidence": 0.9, "x": 12.0, "y": -2.0}]}
```

That timestamp is illustrative. Use the actual integer nanosecond stamp:
`int(msg.header.stamp.sec) * 1000000000 + int(msg.header.stamp.nanosec)`.
Do not pass through floating-point seconds. A JSON array of these rows is also accepted.
Publish `"objects": []` when there are no detections. Duplicate timestamps,
wrong frames, unknown class names, and invalid numeric values are rejected.

## Timing and coordinates

Publish one array per synchronized camera/LiDAR pair. Preserve the original shared acquisition header stamp. Process both the stationary and driving recordings into one predictions file/bag (1,305 reference scans total).

Use exact class strings `car` and `person`. Coordinates are metres: x forward,
y left, signed, relative to the ego vehicle. Estimate the object bounding-box center.
The evaluator checks exact timestamps; it never silently aligns or retimestamps predictions.
The JSON report includes timing diagnostics, full-input scan coverage, and reviewed-frame coverage.
Scoring applies only to listed reviewed frames; other valid scan outputs are not scored.
Missing reviewed output counts as an empty array and produces false negatives.

## Metrics and public reference scope

29 reviewed keyframes: 19 eligible car instances and three eligible person instances, with 14 frames containing no eligible targets. Repeated views cover ten distinct cars and two people.

Both evaluators use confidence >= 0.25 and one-to-one matching within each class,
with planar distance gates of 3 m for cars and 1 m for people. The report contains
precision, recall, F1, TP/FP/FN, mean/median/p90 matched xy error, and per-frame matches.
The score percentage is 100 × micro F1; it is not automatically a course grade.
Duplicate detections near eligible targets count as false positives. Predictions near
known excluded actors are ignored unless they duplicate an eligible target.
Location errors describe successful matches only; interpret them together with recall.
Undefined metrics appear as JSON null.

Reference labels are deliberately included for student self-checking. They must not be
used as detector inputs. These are small public subsets, unsuitable as hidden final tests
or full-sequence performance estimates. Classes with few distinct actors have especially
limited coverage. A score alone cannot establish that your implementation used both
modalities or performed temporal compensation; explain that method separately.
Visual references were prepared by Codex; no course-instructor sign-off is implied.

## Check your installation

Use your venv Python (Windows: `.\.venv\Scripts\python.exe`; macOS/Linux: `.venv/bin/python`):

```bash
python -m unittest -v test_scoring.py
python evaluate_sync_1cam1lidar.py examples/empty_predictions.jsonl --output empty_score.json
```

The supplied example intentionally predicts nothing: expected F1/score 0,
reviewed-frame coverage 1, and every eligible target missed. It is not a detector result.
See VALIDATION.md for tested environments and limitations.
