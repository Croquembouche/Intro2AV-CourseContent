# Synchronized camera/LiDAR overlay: 3D geometry evaluation

This package evaluates students' measured **3D object centers and axis-aligned
3D bounding boxes** for the 1-camera + 1-LiDAR exercise. It does not score object
detection, mAP, precision, recall, or confidence. No orientation is required.

The evaluator runs locally without ROS, CARLA, a GPU, or the input sensor bags.
Students still use the course bags to produce their measurements.

## Install and run

Use Python 3.10–3.13. Extract the ZIP and open a terminal in its folder.
Install dependencies once (internet needed); evaluation then runs offline.

Windows PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe evaluate_sync.py measurements.jsonl --output geometry_errors.json
```

macOS / Linux:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python evaluate_sync.py measurements.jsonl --output geometry_errors.json
```

Keep `evaluate_sync.py` and `evaluation_set.json` together. File arguments may
be absolute paths. The evaluator accepts JSON/JSONL, not ROS bag directories.

## Student submission

One JSONL line per synchronized sensor timestamp:

```json
{"stamp_ns":12345678900,"frame_id":"base_link","objects":[{"class_name":"car","center":[12.0,-2.0,0.8],"size":[4.5,1.8,1.6]}]}
```

The example timestamp and numbers are fictional. A JSON array of frame records
is also accepted. Each object requires only:

- `class_name`: `car` or `person`.
- `center`: `[x,y,z]`, in metres, in `base_link` at the sensor timestamp.
- `size`: full positive `[extent_x,extent_y,extent_z]`, in metres, along the **base_link axes**.

The coordinate axes are x forward, y left, z up. A box is axis-aligned:
minimum corner = center − size/2; maximum corner = center + size/2.
Size is not half-extents or intrinsic vehicle length/width when the vehicle is angled.
The reference uses the enclosing axis-aligned box of the recorded CARLA cuboid.
There is no orientation or confidence field to estimate.

Preserve the original synchronized camera/LiDAR header timestamp:

```python
stamp_ns = int(msg.header.stamp.sec) * 1_000_000_000 + int(msg.header.stamp.nanosec)
```

Do not round timestamps or use wall-clock/arrival times. Put every object measured
at one timestamp into a single `objects` array. An empty measurement array is `[]`.
Invalid numeric values, nonpositive sizes, duplicate stamps, and wrong frames are rejected.
The old x/y-only ROS message is insufficient; export the above JSON from the fusion node
or from your own richer measurements.

## Which objects to measure

`targets.json` lists the selected timestamps, sequence names, classes, and optional
object IDs. The public reference contains **22 measurements: 19 car views and three
person views**, across 15 positive keyframes. The original review spans 29 keyframes
including 14 with no eligible targets. These come from the replacement synchronized
Project 1 stationary and driving recordings, not the six-camera dataset.

Students may measure the listed objects manually from their overlay or use a script.
No automatic detector is required. To fix correspondence explicitly, add the optional
`target_id` from `targets.json` to the object record. An ID identifies a particular
object at a particular timestamp; it is not a tracking task.

Without IDs, the evaluator pairs same-class objects at each timestamp by the minimum
total 3D center distance, one-to-one, with **no distance cutoff**. This supports the
required class/center/size-only format. Large overlay errors therefore remain large
errors. With multiple nearby same-class objects, optional IDs avoid an incorrect
correspondence concealing an error. Unknown IDs or ID/class inconsistencies are rejected.

Submit measurements for the designated objects. Missing measurements and unused
submissions are listed separately. They do not incur a detection penalty, but any
incomplete result is labeled accordingly. Errors are computed only for matched
measurements. No matches produces null errors, never an apparently perfect zero.
Other timestamps are not evaluated.

## Reported errors (all in metres; lower is better)

1. **3D center error:** Euclidean distance between submitted and reference centers.
   The report also gives signed errors in x, y, and z.
2. **Box dimension error:** absolute errors in x, y, and z extents, and their mean.
   This isolates size accuracy from position accuracy.
3. **3D box corner error:** mean Euclidean distance between the eight corresponding
   corners of submitted and reference boxes. Corners correspond by the signs of
   their offsets in the common base_link axes. This measures position and size together.
   Per-object maximum corner error is also included.

Aggregate results include mean, median, RMSE, p90, and maximum for center error and
per-object mean corner error, plus dimension MAE by axis and overall. RMSE for the
box metric is taken over per-object mean corner errors. Results appear overall,
by class, and for each measured object. No automatic course grade is assigned.

The reference labels are included for self-checking; do not use them to create the
submitted measurements. This small subset includes repeated views of ten cars and two
people, so it does not establish broad performance. Visual target eligibility was
prepared by Codex, without instructor sign-off.

These errors assess the resulting 3D measurements. They do not directly measure
pixel reprojection error or inspect the overlay image. An overlay screenshot remains
useful if the instructor also wants to check visual alignment.

## Check the installation

Use your venv Python in place of `python` below:

```bash
python -m unittest -v test_evaluator.py
python evaluate_sync.py examples/empty_predictions.jsonl --output empty_errors.json
```

Expected empty example: zero measured objects, 22 missing measurements, undefined
(null) errors, and incomplete status. `examples/format_example.jsonl` is a fictional
format example. See VALIDATION.md for verification and tested-platform coverage.
