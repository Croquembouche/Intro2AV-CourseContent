# Project 1 — instructor notes (do not distribute)

The companion Project1_Description.md matches the current camera/LiDAR bags: cars and pedestrians, local planar position, and the existing project1_interfaces message contract. It removes the unsupported STAR Campus, IMU/GNSS, stop-sign and global-coordinate promises from the original draft. The bags were captured in CARLA Town10HD_Opt; describing a simulated urban environment avoids a false campus claim.

## Minimum information students need

Provide the student-facing description, the two bag directories, and the project1_interfaces source package. Calibration, TF and clock messages are already inside the bags. The output topic, class labels, timestamp rule, reference frame, units and position convention are requirements, not implementation hints; students need these to produce comparable submissions.

Do not distribute the instructor folder, scorer, reference annotations, source simulator labels or reviewed frames as development inputs. The existing student ZIP has a detailed README, numeric calibration summaries and projection previews. If limited guidance is the goal, do not distribute that ZIP unchanged: give students a separate handout and a reduced data package. The new `2026/Data/project1_udrive_student.zip` is the reduced distribution: it contains the description, a short setup README, both complete bags, and the output interface source. The older `project1_carla_student.zip` remains the more detailed package.

## Decisions to make before posting

- Fill in the due date and add the course's group-size, submission-location, late-work and academic-integrity policies as appropriate. The brief intentionally does not invent them.
- Confirm the suggested 3–5 minute video length. The one-page report excludes the source README and the separate contribution table.
- Decide whether to distribute playback commands and frame IDs immediately or introduce them during class. The brief gives the two sensor frame names but does not provide projection formulas, numerical extrinsics, detector recommendations or a fusion procedure.
- Choose and announce grade weights. A possible 100-point rubric is: detection/localization 40; ROS 2 integration and reproducibility 20; validation and failure analysis 15; one-page report 10; demonstration video 10; individual contributions 5. These are proposed weights, not an existing course policy.
- The finalized description publishes the current scorer settings: confidence at least 0.25, planar matching error at most 3 m for cars or 1 m for people, with one-to-one matching. Update the description if these settings change. Keep reference labels and reviewed timestamps private; do not hide the meaning of correctness. The description fixes object-center position to avoid confusing surface range with the scorer's position target.

## Evaluation boundaries

The available reference set covers reviewed portions of the provided recordings, not every visible object in every frame. Follow the current instructor/front_camera_evaluation/GRADING.md and the current evaluation set when scoring. Do not treat unreviewed portions as fully annotated ground truth, and do not infer general detector performance from this small simulated dataset. Slower playback is allowed; retaining original sensor timestamps is required for matching outputs to the reference set.

If global geographic coordinates are introduced in a later project, first provide a usable geographic reference and sufficient ego pose/orientation information. The current camera/LiDAR student package does not supply GNSS/IMU streams or a specified geographic conversion. That extension would also require revising the message definitions and grading interface.
