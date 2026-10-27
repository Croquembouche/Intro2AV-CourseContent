# 2026 data and lab downloads

Lecture and lab packages small enough for Git are versioned here:

| Package | Repository download |
| --- | --- |
| Classical CV student starter | [ClassicalCV_student.zip](ClassicalCV_student.zip) |
| Classical CV instructor reference | [ClassicalCV_answers.zip](ClassicalCV_answers.zip) |
| Neural Vision student demos | [NeuralVision_student.zip](NeuralVision_student.zip) |
| Lecture 4: Sensor fusion | [Lecture4_SensorFusion.zip](Lecture4_SensorFusion.zip) |
| Lecture 5: Localization | [Lecture5_Localization.zip](Lecture5_Localization.zip) |
| Lecture 6: Mapping | [Lecture6_Mapping.zip](Lecture6_Mapping.zip) |
| Lecture 7: Path planning | [Lecture7_PathPlanning.zip](Lecture7_PathPlanning.zip) |
| Lecture 8: Control | [Lecture8_Control.zip](Lecture8_Control.zip) |

Editable demo sources and runtime assets are under [`2026/Labs`](../Labs/).
Large dataset releases and ROS bag payloads remain outside Git. Existing Drive
copies are preserved:

| Download | Google Drive | Local path |
| --- | --- | --- |
| Classical CV student package | [Download ZIP](https://drive.google.com/file/d/15JSaotsxEXHAcFdtfUTNPBkq8JsG8RKH/view?usp=drivesdk) | `ClassicalCV_student.zip` |
| Classical CV instructor answers | [Download ZIP](https://drive.google.com/file/d/1T-T6MEuUFDQnOdIP00VjdTA2B1eGpe-B/view?usp=drivesdk) | `ClassicalCV_answers.zip` |
| Project 1 simulated ROS bag | [Download ZIP](https://drive.google.com/file/d/1zd5GGe6t-UIEEMK9XJ1UCwRFa9NWEHrm/view?usp=drivesdk) | `project1_simulated_data_short.zip` |

A repository push does not replace a Drive file. The raw dataset ZIPs can remain
local without appearing in Git status.

## Revised CARLA camera–LiDAR capture (September 12, 2026)

The local [Project 1 sensor-fusion package](Project1/carla_sensor_fusion/README.md)
contains a 5.05-second stationary bag and a 60.10-second driving bag, with
synchronized front RGB images, roof-LiDAR point clouds, CameraInfo, TF and clock.
Both were verified through ROS 2 Humble playback. These new releases are local;
the existing Google Drive download above has not been replaced.

- `project1_carla_student.zip`: both bags, calibration, previews, project instructions,
  and the classification/x/y ROS message definitions.
- `project1_carla_instructor.zip`: timestamp-matched CARLA ground truth, source
  provenance, full bounding-box-center ground truth, 29 visibility-reviewed
  keyframes and a ROS-output grading tool.

**Project 1 corrected release:** These local ZIPs now contain replacement CPU-ray
recordings. Both bags passed synchronization, downloaded-file integrity and full
ROS 2 Humble playback checks. The driving clip covers 449.73 m with 99.6% moving time after clearing the lead
vehicles and disabling signal waits for this perception exercise. The instructor
evaluation contains 19 car and three person instances with visually checked
LiDAR body support, plus frames with no eligible target. The original failed
GPU recordings have been superseded. The Google Drive download above is unchanged.

## Lecture 8: Control lab

`Lecture8_Control.zip` includes the concept-first 35-slide editable PowerPoint, PDF, and six browser experiments covering PID speed control, Pure Pursuit, Stanley, LQR, MPC, and shared-scenario comparison. Extract the ZIP and open `Lecture8/START_HERE.html`. No installation or network is needed. Demo guidance and model limitations are in [the control lab README](../Labs/Control/README.md).
