# Project 2.2: Indoor Localization and Mapping

**Course:** Intro2AV  
**Format:** Group project  
**Due date:** October 31, 2026

## Your role

You are a localization and mapping software engineer at **UDrive**, an autonomous-driving startup. Your team will work with a supplied **1/10-scale autonomous vehicle** to investigate localization and mapping in an indoor environment. UDrive needs a map of the test area and a way to estimate the vehicle's position within that map.

Your software must use measurements collected by the physical vehicle to estimate its motion and construct a map of the area explored during your experiments.

## Your task

Develop a ROS 2 system for **indoor localization and mapping using both the forward-facing camera and the onboard 2D LiDAR**. Both sensors must contribute to your solution. Explain how your method uses camera images and LiDAR scans to estimate the vehicle's pose and build or maintain the map.

**No IMU or GNSS sensor is available.** Your method must operate without inertial measurements or satellite positioning. Choose an approach that works with the supplied camera and 2D LiDAR.

Estimate the vehicle's position and heading in a local map frame as it moves through the indoor area. You may estimate the poses and map together, or construct a map and then localize against it. Check whether the vehicle can recognize a previously visited area and remain consistent with its map.

A **2D occupancy map**, a **map of LiDAR returns in the scan plane**, or a **map combining geometric structure and visual landmarks** is acceptable. The map must describe the observed environment, and your report must explain the contribution of each sensor.

## What you are given

- A supplied **1/10-scale autonomous vehicle** for indoor experiments.
- A **forward-facing camera** providing images of the environment.
- An **onboard 2D LiDAR** providing planar range measurements.

This project uses a physical vehicle. Your group is responsible for collecting the observations needed to construct its map. You may process live measurements or replay recordings your group captures from the vehicle.

### Sensor and coordinate conventions

Inspect the vehicle's actual sensor topics, message timestamps, frame names, camera calibration, and camera-to-LiDAR mounting relationship. Verify the information needed by your method and document any calibration assumptions. Do not assume the simulated vehicle's topics, frame names, or calibration apply to this vehicle.

Associate camera images and LiDAR scans using their measurement timestamps, and express observations in consistent coordinate frames. The LiDAR measures a plane; explain what part of the indoor environment your map represents. If your camera method requires metric scale, explain how you obtain it using the available LiDAR measurements or stated physical constraints.

## Mapping requirements

Define a local map origin and axes, and use **metres** for map dimensions and vehicle position. Account for the sensors' mounting transforms when combining their observations or relating sensor poses to the vehicle. For a planar solution, estimate the vehicle's x and y position and heading.

Explore enough of the indoor area to construct a useful map, including a return to a previously visited location. Check for consistency between new observations and the existing map. Identify initialization periods, tracking failures, or areas that your method could not map reliably.

Save the final map in a format that can be opened and inspected. Explain what its occupied cells, scan points, or visual landmarks represent.

## Engineering expectations

Use **C++ or Python with ROS 2**. Existing libraries are allowed; cite their sources and explain your group's implementation, configuration, and integration work. Your approach must use both camera images and 2D LiDAR scans, with a clear role for each sensor.

Construct the map and estimate vehicle poses from the collected sensor measurements. Measurements of the room or selected reference locations may be used afterward to check your results. Do not substitute a manually drawn floor plan or manually entered vehicle positions for the estimated map and poses.

Validate your results with evidence from the physical environment. For example, compare a mapped distance with a measured distance, compare estimated positions at marked checkpoints, or measure the position discrepancy when returning to a known location. Explain what your measurement establishes and any uncertainty in the reference. Consistent repeated observations alone do not establish absolute accuracy.

## What to submit

### 1. Constructed map

As a group, submit the final indoor map constructed using the vehicle's camera and 2D LiDAR measurements. Include any companion files needed to open it. State the map format, coordinate conventions, and software needed to view it in your group's technical report.

### 2. One-page technical report

Submit **one technical report per group**, limited to **one page**. Explain:

- your localization and mapping approach and how **both the camera and 2D LiDAR** contribute;
- how you handled calibration, timestamps, coordinate frames, and operation without IMU or GNSS;
- how you checked localization and map quality, with **at least one numerical result** and an explanation of the reference measurement;
- a significant engineering problem and an observed failure case or limitation.

Briefly identify the submitted map's format and how to open it. Include a map figure or other evidence supporting your discussion. Distinguish observed results from assumptions, and explain the limitations of your indoor experiment.

### 3. Individual contribution summary report

**Each group member must submit a separate individual contribution summary report.** Identify your name and group, describe your specific contributions, and support them with evidence such as implemented components, experiments, data collection, or documentation. Explain your role in any work completed jointly with others.

This report is separate from the group's technical report and does not count toward its one-page limit.
