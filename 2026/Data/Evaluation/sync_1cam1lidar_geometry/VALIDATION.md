# Verification

Tested on Linux with Python 3.13, NumPy 2.5.3, and SciPy 1.18.1.
Windows and macOS installation commands are included but were not executed here.

- 14 regression tests passed: exact geometry, known translation and size errors,
  explicit and inferred correspondence, large errors without a distance cutoff,
  missing/extra measurements, invalid IDs and numeric inputs, timestamp checks,
  and the required no-confidence/no-orientation format.
- All 22 reference AABBs were checked against the extrema of all eight transformed
  corners of their original CARLA cuboids.
- Synthetic reference-derived measurements over the complete subset returned
  zero center, dimension, and corner errors. This checks the evaluator, not a
  student implementation.
- Adding [3,4,0] metres to every center returned center error 5 m, dimension
  error 0 m, and mean corner error 5 m.
- Adding 2 m only to each x dimension returned center error 0 m, dimension
  MAE 2/3 m, and mean corner error 1 m.
- Empty and off-clock submissions returned null errors and 22 missing measurements.
- Reference lookup was tested from a different working directory.
- The final ZIP was extracted separately; CRCs and SHA-256 hashes, all regression
  tests, and the empty-example CLI run passed from that extracted copy.

The reference is a small public self-check subset, not a full-sequence benchmark.

## Independent delivered-data audit

The evaluator and reference geometry were independently checked against the actual
stationary and driving ROS 2 bags and original recorded CARLA ground-truth records.
See GROUND_TRUTH_AUDIT.json for per-object evidence.

- All 102 stationary and 1,203 driving camera/LiDAR/CameraInfo header timestamps
  agree exactly and match their ground-truth records. The reference's complete
  valid-timestamp list matches all 1,305 scans.
- Reconstructed all 22 object boxes from actor world poses and separately captured
  actor-local box geometry, then used the inverse map-to-base_link transform read
  from the bag. This check did not reuse the precomputed object-to-base transform.
- Maximum center disagreement: 0.0000031984 m. Maximum dimension disagreement:
  0.0000003841 m. These differences are consistent with recorded TF precision.
- All 29 original review images are pixel-identical to the bag camera images.
- All 22 original LiDAR support counts were independently reproduced using their
  documented 0.15 m box margin, bottom-0.25 m exclusion, and reviewed image bounds.
  Minimum support is five points. These are geometric associations, not semantic labels.
- Both audited bag databases match the copies inside project1_udrive_student.zip
  byte-for-byte by SHA-256. The target list agrees with all 22 evaluator references.
- The evaluator logic and reference values needed no correction in this audit.
