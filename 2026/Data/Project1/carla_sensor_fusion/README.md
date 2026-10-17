# Project 1: camera–LiDAR fusion in ROS 2

> **Revised September 12 release:** Both bags were recaptured with CPU LiDAR and front-camera hardware ray tracing disabled. The blocking lead vehicles were removed; the new driving clip covers 449.73 m with 99.6% moving time. Both bags passed integrity, synchronization and ROS 2 Humble playback checks. Ground truth, visibility review and the scorer match these replacement timestamps.

Use a front-camera object detector to classify scene objects, associate its detections with roof-LiDAR measurements, estimate each object's planar location, and publish the results in ROS 2. The supplied bags replay without a running CARLA simulator.

## Dataset

Captured September 12, 2026 from CARLA 0.10.0 on Town10HD_Opt:

| Sequence | Duration | Exact camera/LiDAR pairs | Ego distance |
|---|---:|---:|---:|
| Stationary | 5.05 s | 102 | 0 m |
| Driving | 60.10 s | 1,203 | 449.73 m |

Both sequences are 20 Hz in simulated time with zero camera/LiDAR header timestamp skew. The driving sequence contains 59.85 seconds of motion above 0.2 m/s (99.6% of its duration). Its longest stopped interval is 0.25 seconds at startup; `driving/motion_validation.json` records the full trajectory check.

- `stationary/bag/`: short stationary capture for debugging calibration, synchronization, projection and detection.
- `driving/bag/`: approximately one minute of simulated driving through Town10HD_Opt. The ego follows a clear route past roadside objects.
- Each sequence includes camera and LiDAR previews, `calibration.json`, `validation.json`, and `playback_validation.json`. The driving contact sheet shows six camera frames along the sequence.
- `instructor/`: separate CARLA ground truth and capture provenance; withhold this folder from students during development if desired.

**Scenario settings:** The two added moving lead cars were removed. Parked vehicles and sidewalk pedestrians remain. The ego Traffic Manager was configured to ignore traffic lights and signs for this controlled perception exercise, while retaining collision avoidance. Signals can therefore appear red while the ego proceeds; this dataset is not an example of traffic-rule-compliant driving.

The front camera is 640 × 360 pixels with a 90-degree horizontal field of view. Its ROS image encoding is `bgra8`: convert to `bgr8` or `rgb8` as required by the detector. The roof LiDAR is configured for 32 channels, 80 m range, 200,000 points/s and 20 Hz rotation. Actual delivered scan sizes are reported in each sequence's validation file; do not assume a fixed number of points. The simulator uses a 0.05-second step. Full sensor samples are retained, with no LiDAR downsampling or JPEG compression. The front RGB camera uses `use_ray_tracing=false`; CPU ray casting remains enabled for LiDAR.

| Topic | ROS 2 type | Frame / purpose |
|---|---|---|
| `/camera/front/image_raw` | `sensor_msgs/msg/Image` | `front_camera`; detector input |
| `/camera/front/camera_info` | `sensor_msgs/msg/CameraInfo` | `front_camera`; intrinsics corresponding to each image |
| `/lidar/roof/points` | `sensor_msgs/msg/PointCloud2` | `top_lidar`; float32 x, y, z, intensity |
| `/tf` | `tf2_msgs/msg/TFMessage` | `map → base_link`, `base_link → top_lidar`, `base_link → front_camera_mount → front_camera` |
| `/clock` | `rosgraph_msgs/msg/Clock` | Recorded simulation time |

Camera, CameraInfo and LiDAR messages have identical header timestamps for each captured frame. Sensor transforms are repeated on `/tf` at every frame, including the fixed mounts. There is no required `/tf_static` topic. Timestamps retain CARLA simulation time and therefore do not start at zero. These are standard ROS 2 Humble SQLite3/CDR bags. Other ROS distributions require their own playback check.

## Playback

Extract the student ZIP and open a terminal in its `carla_sensor_fusion` folder:

```bash
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=71
export ROS_LOCALHOST_ONLY=1
ros2 bag info stationary/bag
ros2 bag play stationary/bag --delay 3
# Next, use the longer sequence:
ros2 bag play driving/bag --delay 3
```

Use the same domain and localhost setting in each student-node/RViz terminal. Enable `use_sim_time` on the fusion node and RViz. The bag already contains `/clock`; the playback commands above use that recorded clock. Start subscribers before playback, or use `--delay`. For slow detectors, replay with `--rate 0.5`. Use one pass for grading. Stop and restart RViz and other TF-consuming nodes before restarting a bag or switching sequences: the new pass can begin earlier than transforms cached by the previous pass. `--loop` resets recorded time; it is suitable only when every consumer clears its TF, synchronizer and tracker caches on a backward clock jump. Setting `use_sim_time` is necessary but does not add reset handling to every TF buffer implementation.

Use `qos_profile_sensor_data` for sensor subscriptions, and a TF listener for transforms at the sensor timestamp. For a lossless offline evaluation run, use reliable subscriptions with sufficient queue depth; the supplied playback validation uses reliable QoS and depth 100. Best-effort subscriptions can drop messages under load even when the stored bag has complete pairs. In RViz, use `base_link` as the fixed frame and display the image and point cloud. The raw image topic can also be viewed with `rqt_image_view`.

### TF_OLD_DATA during replay

This warning means the listener has newer transforms cached for the same frame. The driving bag spans simulation time about 20.025–80.125 s; replaying it with `--loop` jumps back to 20.025 s after every pass. A warning at 51.775 s can therefore refer to a replayed transform that is older than the end of the previous pass. Both released bags have strictly increasing TF timestamps within a pass. Do not run two players or a live TF/clock publisher on the same ROS domain.

Restart the TF-consuming program before a fresh pass. For RViz, use the same ROS domain and localhost settings as the player:

```bash
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=71
export ROS_LOCALHOST_ONLY=1
rviz2 --ros-args -p use_sim_time:=true
```

Then play one bag with the commands above. The bag already publishes recorded `/clock`; do not add a second clock publisher. For repeated playback in a custom node, register a backward clock-jump callback that clears its TF buffer and the node's own synchronization/tracking state. The installed Humble Python TF buffer on the instructor host does not automatically register that callback. `Authority undetectable` does not identify the offending publisher; inspect `ros2 topic info /tf --verbose` and `/clock` if warnings occur in a fresh, single-pass run.

The message frame IDs are **`top_lidar`** for PointCloud2 and **`front_camera`** for both Image and CameraInfo. Topic names are unchanged. `front_camera_mount` is the intermediate body-axis mounting frame; `front_camera` retains optical axes.

## Coordinates and calibration

All **bag** point coordinates already use ROS conventions:

- `base_link` and `top_lidar`: x forward, y left, z up, metres.
- `front_camera`: x right, y down, z forward.
- Camera mount: 1.5 m forward and 2.2 m above the ego actor origin.
- LiDAR mount: 2.5 m above the ego actor origin.

Do not flip LiDAR y again: the recorder already converted CARLA's raw handedness to ROS. `base_link` is the ego actor reference origin; it is not a rear-axle origin inferred from vehicle geometry.

Read intrinsics from CameraInfo and obtain extrinsics from TF. `calibration.json` provides the same fixed transformation matrices for inspection: `p_target = T_target_from_source @ [x,y,z,1]`. Project only points with positive optical z. CameraInfo declares a pinhole model with zero distortion; the first-frame overlay was inspected, but no independent physical camera calibration is claimed.

## Student work and output

1. Subscribe to the front image, CameraInfo and roof point cloud. Synchronize image/cloud pairs by their header timestamps.
2. Run an image detector and retain class, confidence and 2D bounding box for each detection.
3. Transform LiDAR points to the camera optical frame and project them into the image. Associate appropriate points with detected boxes. Handle ground points, occlusion, background contamination and boxes with no usable LiDAR support.
4. Estimate each object's location in `base_link`. For the supplied grading benchmark, use the estimated object center. Clearly document any visible-surface or cluster-center approximation; the default location gates are 3 m for cars and 1 m for people.
5. Publish one `/project1/detected_objects` message per processed sensor pair, including an empty array when no supported detections remain. Preserve the original sensor timestamp.

The included `project1_interfaces` package fixes a simple output contract:

```text
DetectedObjectArray:
  std_msgs/Header header       # stamp = sensor stamp; frame_id = "base_link"
  DetectedObject[] objects

DetectedObject:
  string class_name
  float32 confidence           # image detector confidence, [0,1]
  float64 x                    # metres forward
  float64 y                    # metres left
```

Build the message definitions in a ROS workspace (replace `/path/to/...` with the extracted folder):

```bash
mkdir -p ~/project1_ws/src
cp -r /path/to/carla_sensor_fusion/project1_interfaces ~/project1_ws/src/
cd ~/project1_ws
source /opt/ros/humble/setup.bash
colcon build --packages-select project1_interfaces
source install/setup.bash
ros2 interface show project1_interfaces/msg/DetectedObjectArray
```

In the student's Python node, the publisher is created with:

```python
from project1_interfaces.msg import DetectedObjectArray
publisher = self.create_publisher(
    DetectedObjectArray, '/project1/detected_objects', 10)
```

The reviewed benchmark evaluates the exact class strings `car` and `person`. Other classes may be published but are outside this benchmark. The detector, association, location estimator and publishing loop are student work. Suggested submissions: the ROS package, a launch command, an annotated detection/projection video or images, the recorded output topic, and a report explaining synchronization, coordinate frames, association failures and evaluation results.

## Instructor ground truth

`instructor/*_ground_truth.jsonl.gz` contains one JSON record per recorded sensor frame. Its `stamp_ns` matches the corresponding bag timestamps. Each object includes CARLA actor ID, original blueprint, class mapping, bounding-box-center x/y/z in ROS `base_link`, CARLA world pose, full actor-local bounding-box geometry, and the box-to-base transformation matrix. Actor-origin coordinates are retained separately for diagnosis. Actor IDs stay in the instructor file and are not provided as sensor labels.

**The corrected ground-truth position is the CARLA bounding-box center.** The recorder's timestamped actor poses are combined with full actor-local box offsets and rotations queried from CARLA while paused between the two captures. Those fixed local boxes are stored in `instructor/actor_geometry.json`. Exported box vertices were checked against the simulator host's CARLA geometry API. The exporter uses this CARLab build's `Rz(yaw) @ Ry(pitch) @ Rx(roll)` rotation convention; older upstream CARLA wheels use different pitch/roll signs. Every exported ego rotation was also checked against the actual TF quaternion in the delivered bag (`instructor/pose_tf_validation.json`). The grader uses explicit coarse planar tolerances: car 3 m, person 1 m. These allow practical surface/cluster estimates without claiming exact hidden-center reconstruction.

The raw scene labels cover 21 cars, four trucks, four people and one motorcycle, including parked vehicles. They include actors outside the field of view and occluded actors. They do not establish visibility and do not cover every static map object. The included `instructor/front_camera_evaluation/` subset contains 29 explicitly reviewed keyframes and 22 supported instances: 19 cars and three people, representing ten distinct cars and two distinct people. Fifteen keyframes contain eligible targets; fourteen have no eligible target. Use this subset for precision/recall; all-scene actor counts are not detector recall denominators. The class mapping is recorded in `tools/extract_ground_truth.py`; unmapped vehicle types remain `vehicle`. The reviewed set is a small course benchmark with repeated views and a very small pedestrian sample, not a broad detector-validation dataset.

Open `instructor/front_camera_evaluation/review.html` to inspect RGB decisions, LiDAR overlays and exclusions. Follow `instructor/front_camera_evaluation/GRADING.md` to score a student output bag or JSONL file using `tools/grade_detections.py`. Matching requires the correct class and location at the original sensor timestamp. Missing reviewed timestamps count as empty outputs; an empty/blocked evaluation cannot produce a perfect score.

## Reproduce and validate

Instructor tools are in the separate instructor ZIP under `tools/`. They are excluded from the student ZIP. Extract both ZIPs into the same parent folder to reproduce capture and validation.

If a connection is interrupted after recording, use `--resume-session SESSION_ID` with the same output folder to recover that session. The script saves the ID in `session.json`; it handles slow server finalization and checks downloaded files against the server SHA-256 seal.

The simulator launcher must use `--backend cpu` for this corrected workflow. `tools/set_ray_backend.py` makes a backed-up launcher change; the simulator must be restarted for it to take effect. The supplied GPU/CPU probe evidence is in `instructor/recapture_diagnostics/`. The final free-flow scene and its required per-camera/Traffic Manager settings are saved there too. Hardware camera ray tracing was disabled after an earlier attempt exhausted host RAM; this is a capture mitigation, not a claim that the underlying Unreal memory problem has been fixed.

The capture tool uses the WebUI API and its existing synchronous clock; it does not start a second CARLA clock. It records on the server, stops and finalizes the session, then downloads the bag and state records. Run only when the shared simulator is available for the intended capture. For stationary recording, first disable ego autopilot and hold its brake while the simulation clock advances; verify zero movement in the exported summary. For driving, restore the saved free-flow scene, apply the ego Traffic Manager settings described in `instructor/recapture_diagnostics/freeflow_scenario.json`, and assign its route through the owner API. The restoration configuration alone does not save the Traffic Manager ignore-light/sign percentages. Stop and freshly restart the simulator before a long recapture if its sensor workers have accumulated substantial memory.

```bash
python3 tools/capture_session.py --url http://SERVER:8095 \
  --seconds 5 --output /path/to/new_stationary_capture
python3 tools/capture_session.py --url http://SERVER:8095 \
  --seconds 60 --drive-ego EGO_ACTOR_ID --pause-at-end \
  --output /path/to/new_driving_capture
```

Driving destinations default to spawn indices 14, 0, 30 in the current Town10 map; they are scenario-specific. Pass `--destinations` for another route. Driving requires a Traffic Manager ego. Recording duration is simulated time; capture can take several times longer in wall time.

Run `tools/collect_actor_geometry.py` on the simulator host with its CARLA Python environment while paused and save its JSON output as `actor_geometry.json`. It only reads actor geometry and does not tick the world. Then, after sourcing ROS 2 Humble:

```bash
python3 tools/package_bag.py /path/to/capture/rosbag2 /path/to/sequence/bag --ego EGO_ACTOR_ID
python3 tools/extract_ground_truth.py /path/to/capture/states.jsonl \
  /path/to/instructor/sequence_ground_truth.jsonl.gz --ego EGO_ACTOR_ID \
  --geometry /path/to/actor_geometry.json
ROS_DOMAIN_ID=71 ROS_LOCALHOST_ONLY=1 python3 tools/validate_playback.py /path/to/sequence/bag
```

The packager checks complete 20 Hz pairs, exact sensor/header timestamps and finite point data. Motion validation requires at least 90% moving time for the driving release. Playback validation launches `ros2 bag play` and checks actual receipt of every image, calibration, cloud, TF and clock message. The scripts use NumPy, Pillow and SciPy in addition to the ROS Python packages. On the instructor host, `PYTHONNOUSERSITE=1 /usr/bin/python3` avoids incompatible user-installed NumPy versions.

Capture implementation and source format: [CARLA_MCP](https://github.com/Croquembouche/CARLA_MCP), particularly `recording.py` and `rosio.py`. CARLA/Unreal scene and asset licenses remain applicable to redistributed recordings; see that repository's asset notices.
