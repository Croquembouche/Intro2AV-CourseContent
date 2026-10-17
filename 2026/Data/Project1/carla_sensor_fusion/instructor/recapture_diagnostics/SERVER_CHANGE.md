# Applied server change and verified recapture

The control-center launcher was switched from `--backend gpu` to `--backend cpu`
on September 11, 2026. CARLA was shut down through its owner API, the control-center
service was restarted, and a fresh simulator process was started. The saved
scene was restored and the new ego/target IDs were checked before probing.

The running service uses `/mnt/simulations/control-center/controller.py`.
Its launcher scripts are under `/media/william/mist1/Simulations/scripts`.
The only controller-source change is the literal backend argument. Its backup is:

```
/mnt/simulations/control-center/controller.py.before-ray-backend-20260911-230634-530167.bak
```

The active service is `carla-control-center.service` in the user's systemd session.
The final source diff was checked against the backup and contains that one change.

## Evidence

- GPU probe: ten frames, zero candidate vehicle-body returns in every frame.
- CPU probe: ten frames, 545–1,395 candidate vehicle-body returns per frame.
- The CPU overlay visibly follows the car's roof and body. The scene was restored,
  but the exact pose and actor IDs differ slightly between probes.
- September 12 stationary capture: 102 image/cloud pairs, 5.05 s, zero ego movement.
- September 12 driving capture: 1,203 pairs, 60.10 s, 449.73 m of travel;
  99.6% moving time and a longest stopped interval of 0.25 s.
- Both corrected bags passed complete ROS 2 Humble playback and exact timestamp checks.
- The grading subset has 29 RGB/point-overlay-reviewed keyframes and 22 eligible
  instances: 19 cars and three people. Only those listed keyframes are graded.

`backend_verification.json`, `gpu_probe/`, and `cpu_probe/` contain the evidence.
`original_gpu_review/` preserves the failed review's machine-readable audit.
The corrected review is at `../front_camera_evaluation/review.html`.

This is a verified CPU-backend workaround. The precise GPU implementation defect
has not been isolated or repaired. Do not switch back to GPU for these sensor
captures without repeating the body-return check.

To inspect or reverse the launcher choice, run the supplied script on the host:

```bash
python3 set_ray_backend.py --backend gpu --check
python3 set_ray_backend.py --backend gpu
```

A simulator restart is required to apply another backend change. The script
checks syntax and creates a separate backup; it does not restart services.
The current simulator was left paused, with no active recording and with the
corrected front RGB / roof-LiDAR loadout.

## September 12 scenario and resource changes

The two added moving cars were removed to clear the ego lane. The replacement
uses the saved roadside vehicles and sidewalk pedestrians, with ego Traffic
Manager light/sign waits disabled and collision avoidance retained. See
`freeflow_scenario.json` and `freeflow_scene_to_restore.json`; the Traffic
Manager percentage settings must be applied separately from scene restoration.

The first free-flow attempt ended after about 44 seconds when a camera worker
exhausted host RAM and the operating system killed a simulator process. That
partial recording is excluded. The front RGB camera now explicitly uses
`use_ray_tracing=false`; CPU ray casting remains enabled for LiDAR. A fresh
simulator completed both replacement captures with this setting. The underlying
Unreal memory defect has not been isolated or claimed fixed. After capture,
a fresh scene was restored to release accumulated worker memory; final RAM use
was about 39 GiB of 125 GiB and the simulator was left connected and paused.

The ground-truth exporter was also corrected for this CARLab build's
`Rz(yaw) @ Ry(pitch) @ Rx(roll)` convention. It differs from older upstream
CARLA Python wheels. Verification against the simulator host's API passed,
and every exported ego rotation matched the TF quaternion in the delivered
bags. See `../geometry_validation.json` and `../pose_tf_validation.json`.
