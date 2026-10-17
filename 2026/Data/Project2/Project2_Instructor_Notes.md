# Project 2 instructor notes

The description follows Project 1's UDrive scenario. Students choose camera, LiDAR, or both for localization and mapping; GNSS and IMU may assist. The only deliverables are the constructed map and a technical report of no more than one page. There is no software, result-bag, trajectory-file, video, or individual contribution submission requirement, and no assessment section in the student handout.

## Dataset and reference data

The current input is `../Town02Mapping/Town02Mapping_2026-10-06_lossless.zip`. It contains the complete recorded 198.05-second sequence, not complete coverage of Town02. The compressed bag is 7.18 GiB and was verified against all 71,316 original messages. It includes the requested sensors and calibration, along with other sensor streams and simulator reference data.

The current archive includes `/carla/ego_58/odometry` and `map -> ego_58` in `/tf`, plus `states.jsonl`, `ground_truth_trajectory.tum`, `map.json`, `map.xodr`, and a trajectory coverage figure. These are reference material, not estimator inputs. The student description permits their use for evaluation or visualization only and prohibits using them to set metric scale. The archive has not been changed or reduced as part of writing this handout.

If preparing a student package with hidden evaluation references, filter world-to-ego ground-truth transforms from `/tf` while preserving ego-to-sensor mounting transforms; exclude ground-truth odometry, raw simulator states, reference trajectories, road geometry, and trajectory-derived previews/reports. Keep the camera, LiDAR, CameraInfo, IMU, GNSS, clock, relevant sensor metadata, and calibration. Revalidate the resulting bag and regenerate its checksums. The recorded cabin camera and radar are outside the required camera/LiDAR task.

## Before posting

- Announce the due date, submission location, and group-size policy. None has been invented in this handout.
- Students identify their map format, coordinate conventions, and viewing software in the one-page report. Any companion files necessary to open the map are part of the map deliverable; a separate README is not required.
- Use a common trajectory-error calculation with original timestamps, documented interpolation, and one fixed rigid alignment when the student map has a local origin. Keep initialization time, tracking failures, and output coverage visible in the evaluation. Do not silently use a fitted scale factor for metric trajectories.
- Evaluate map structure in the form submitted: sparse visual landmarks, point clouds, or occupancy maps. Do not grade point density as if the camera and LiDAR options must produce identical representations. No common numerical map-quality threshold or grading script is supplied by this wording task.
- GNSS is a permitted measurement stream and should be distinguished from simulator ground-truth pose. Students may choose not to use GNSS or IMU, but must explain metric scale and the limitations of their selected method.

## Scope

Students must estimate vehicle poses as part of localization and construct a map from observations, but submit only the constructed map and one-page report. Joint localization and mapping is acceptable; a separate mapping pass followed by localization is also acceptable. Localization against a saved map on a later pass, sensor ablations, and loop closure are useful extensions, but are not mandatory additional projects.
