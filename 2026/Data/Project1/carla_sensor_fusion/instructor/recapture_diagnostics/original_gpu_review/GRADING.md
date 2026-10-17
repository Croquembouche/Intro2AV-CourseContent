# Grading status: blocked pending corrected sensor data

The 20 keyframes have been visually reviewed. There are 16 camera-visible car
instances that would be reasonable image-detection targets, but none passes the
minimum five geometric LiDAR body-support candidates. The counted points are
restricted to the reviewed image box, nearby actor position and body height.
Ground points and distant points behind a visible car are not accepted as object
support. Some residual points can belong to thin poles or scenery, so even a
count above threshold would still require inspecting the support overlay.

Do not assign localization scores from this dataset or treat zero eligible
targets as a perfect student score. The review is useful as a data-quality audit
and as provisional camera annotations, not an approved fusion benchmark.

`review.html` shows original images, visual decisions, candidate body returns,
CARLA actor origins and exclusion reasons. `review_decisions.json` contains
explicit Codex visual-review decisions; the instructor has not signed them off.
`evaluation_set.json` carries `status: blocked_missing_lidar_body_returns`.
Only the listed timestamps are reviewed; no labels are inferred for other frames.

The raw CARLA scene labels remain available for diagnosis. A new background
vehicle probe also produced zero body-height LiDAR returns in ten frames. See
`../recapture_diagnostics/SERVER_CHANGE.md` for the next controlled test using
the CPU ray-sensor backend. Once returns are verified, collect replacement data,
repeat the visibility review, and define the final location convention and
scoring tolerance before releasing a grader.
