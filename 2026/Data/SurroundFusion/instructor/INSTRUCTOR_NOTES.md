# Surround asynchronous fusion dataset

The student release is a separate dataset and does not replace the existing front-camera Project 1 recordings. The student ZIP contains only the bag, concise task/setup instructions, output message definitions, a preview contact sheet, and validation summaries.

## Timing exercise

The recorder requires complete 20 Hz synchronous source frames. `tools/package_async_bag.py` selects genuine camera samples at distinct deterministic schedules on odd source frames and retains roof LiDAR scans on even source frames. The retained camera intervals are 100 or 200 ms and the retained LiDAR interval is 100 ms. All measurements remain on a common, trustworthy simulation clock. Timestamps are not modified to create a false timing mismatch.

The six camera schedules use separate random seeds and different interval probabilities. Occasional simultaneous images across some cameras are possible, as in independently sampled streams, but no retained camera measurement has the same timestamp as a retained LiDAR scan. For interior camera samples, the nearest LiDAR scan is about 50 ms away. Each retained PointCloud2 preserves a complete source scan message. No partial scans are concatenated, and the exporter checks returns around the full azimuth range. Rotation frequency is configured to 20 Hz; use the measured point counts rather than inferring scan size from nominal points per second.

Ego odometry and TF are simulator-derived and retained at 20 Hz. They supply motion information for the temporal fusion exercise. Object annotations and original scene state records are confined to `instructor/`. Do not include these records in student distributions. The old Project 1 front-camera visibility annotations and grader timestamps do not apply here. A new reviewed annotation set would be needed for an automated precision/recall grading benchmark; no such benchmark is claimed by this delivery.

## Capture settings and reproducibility

The camera centers lie around a small roof-mounted ring at 2.2 m above the actor origin, with yaw directions of 0, ±60, ±120, and 180 degrees. Each camera uses 640 × 360 BGRA with 90 degree horizontal field of view and camera hardware ray tracing disabled. The LiDAR uses 32 channels, 80 m range, 200000 configured points per second, 20 Hz rotation, and standard XYZ/intensity output. Material and physical-model extensions are disabled for this controlled exercise.

A single GPU render-worker profile was used after the automatic multi-worker setup failed during rig startup. No source patch was made for this new capture. The clean scenario uses parked map vehicles, four sidewalk pedestrians, and a Traffic Manager ego vehicle. For this controlled perception recording the ego ignores lights and signs while retaining collision avoidance; it is not a traffic-rule demonstration. The initial desired speed is 28 km/h, although route control may adjust it. Weather is clear with the sun 55 degrees above the horizon.

`before_configuration.json` and `before_status.json` preserve the original scene configuration. They are configuration snapshots, not exact physics checkpoints. `capture_configuration.json` records the actual prepared scene. `source_capture/` preserves the source bag, source states, recording manifest, and server verification. The source capture tool is the existing `Project1/carla_sensor_fusion/tools/capture_session.py`.

Recreate the released streams by sourcing ROS 2 Humble and running:

```bash
python3 tools/package_async_bag.py instructor/source_capture/rosbag2 new_release/bag --ego 61
python3 tools/check_projection.py instructor/source_capture/rosbag2 instructor/projection_check --ego 61
ROS_DOMAIN_ID=72 ROS_LOCALHOST_ONLY=1 python3 tools/validate_playback.py new_release/bag
```

Use the actor ID from the new capture configuration if recapturing; IDs do not remain stable across simulator restarts. The exporter refuses to overwrite an existing bag. Its validation checks original timestamps, complete calibration/image pairs, distinct camera schedules, zero exact camera/LiDAR matches, finite point data, and ego displacement. Playback validation subscribes to every delivered topic and tests cross-time TF lookups through `map`.

## Verified release

The completed source recording contains 1,201 complete frames over 60.000000894 simulated seconds. Server checks verified all 8,407 source sensor samples and the downloaded files matched the server SHA-256 seal. The student export contains 2,483 images, 601 scans and 9,170 messages across 16 topics. All 3,084 exported image/cloud payloads and measurement timestamps were independently compared against the source. SQLite integrity and actual ROS 2 Humble playback passed, with every message received and 87 cross-time TF lookups checked.

The ego moved 421.6 m and stayed above 0.2 m/s throughout the recording. CameraInfo/image timestamps agree within each camera; there are zero exact image/LiDAR timestamp matches. Every scan contains returns in all 36 ten-degree azimuth sectors. Two nearby cars were checked explicitly: the retained scan at 26.762790798 s contains 351 and 264 points inside their respective actor bounding boxes with a 10 cm tolerance. These checks establish usable returns for those cars, not an exhaustive target-visibility review.

`ground_truth.jsonl.gz` retains the full source-frame actor reference positions and bounding-box geometry. It covers 22 cars, four people, four trucks, one bus and one motorcycle, including distant and occluded actors; these totals must not be used as visible-target recall denominators. Ground truth is excluded from the student ZIP. The illustrative surround preview uses actual exported camera messages near 27.2–27.3 s, with their individual timestamps labeled.

An earlier short attempt stopped during Unreal texture compilation and is not included in the student release. The subsequent full recording passed all source completeness checks. Finalization of the full recording exceeded an HTTP request timeout, but the server completed and verified it; the finalized session was downloaded through the supported resume workflow.
