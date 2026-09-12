# Lecture 5 — Localization for Autonomous Driving

First teaching version: approximately 75 minutes. Order: **ICP → AMCL → NDT**. Assumes Lecture 4 frames, rigid transforms, and LiDAR geometry. All demonstrations are instructor-led and can also be explored independently.

## Learning objectives

- Explain scan-to-map alignment and why initialization matters.
- Trace motion, measurement, resampling, and KLD adaptation in AMCL.
- Interpret NDT map-cell means, covariance, and resolution.
- Distinguish optimizer convergence, measurement fit, and actual pose accuracy.

## Slide-by-slide teaching notes

### 1. Localization for autonomous driving

- Localization
- ICP → AMCL → NDT
- Introduction to Autonomous Driving · Fall 2026

Plan for about 75 minutes including instructor-led demos. Connect Lecture 4 sensor-to-vehicle calibration to today’s unknown vehicle-to-map pose. The map is assumed available. These are three major methods selected for this lecture, not an exhaustive list of localization methods.

### 2. Localization in the autonomy stack

- Perception: what is around the vehicle?
- Calibration: where is the sensor on the vehicle?
- Localization: where is the vehicle in the map?

Opening, 3 minutes. A LiDAR point can be correctly expressed in base_link while the vehicle is one lane away from its estimated map position. Calibration is a fixed relationship; localization changes as the vehicle moves.

### 3. The pose we want to estimate

- A 2D pose contains x, y, and heading θ.
- The map is fixed; the current scan is measured in the sensor frame.

Use 2D for visibility, then note that 3D poses contain translation plus roll, pitch, and yaw. Define T_map,sensor explicitly as mapping sensor coordinates into the map. With known sensor extrinsics, recover vehicle pose as T_map,base = T_map,sensor × inverse(T_base,sensor).

### 4. Tracking and global localization

- Tracking starts with a useful pose estimate.
- Global localization starts with uncertainty across the map.
- Relocalization is needed when the estimate becomes wrong.

3 minutes. Examples of initial estimates include GNSS, wheel/IMU odometry, a previous localization result, or a user-provided pose. Explain kidnapped robot: the physical pose changes without a matching odometry update. Localization assumes an existing map; SLAM also estimates the map.

### 5. ICP: a scan and a point map

- Gray points belong to the map.
- Orange points are the scan under the current pose guess.
- We want one rigid transform that aligns them.

ICP block: about 20 minutes, slides 5–13. The scan is a sparse, partial observation of the map; point ordering does not tell us correspondences. Green is simulation truth and blue is the estimate. Truth is not given to ICP.

Visual: `icp-start.png`

### 6. Nearest-point correspondences

- Transform the scan using the current pose.
- For each scan point, find the closest map point.
- Reject pairs that are too far apart.

Show the early correspondence lines. A wall point can be matched to another point along that wall. Correspondence rejection can suppress irrelevant pairs, but too small a gate can eliminate useful ones before alignment.

Visual: `icp-pairs.png`

### 7. The rigid alignment objective

- Keep the current correspondences fixed during this solve.
- Find the rotation and translation that minimize squared distances.

Explain p_i is a scan point, q_c(i) its current matched map point, and R must be a valid rotation. In 2D the centered dot/cross sums give the optimal angle; 3D commonly uses an SVD with a determinant correction. The matching problem and rigid solve are different subproblems.

### 8. One ICP iteration

- Associate points.
- Solve the rigid update.
- Apply the update, then associate again.

Play the animation, then pause after one iteration in the live demo. Each displayed update is calculated from real nearest-neighbor pairs and a least-squares rigid solve. A stationary update can be a correct solution or a local minimum.

Visual: `icp-alignment.gif`

### 9. Convergence and pose accuracy

- The orange scan approaches the map.
- The optimization stops when updates become small.
- Small updates alone do not prove the pose is correct.

Explain scan-to-map residual versus pose error. Real vehicles do not usually know their exact true pose online. Residual, overlap, temporal consistency, and independent sensors help judge reliability. The demo can show true error because its scene is synthetic.

Visual: `icp-fit.png`

### 10. ICP with a poor initial guess

- Wrong neighbors can support a wrong alignment.
- Repeated geometry makes the mismatch harder to detect.
- More iterations can refine the wrong solution.

Run the poor-guess preset. Ask whether the algorithm can know which wall is intended using only its current nearest neighbors. Compare the residual and the green true pose. Do not imply every poor guess fails, or that every low residual proves failure.

Visual: `icp-poor-guess.gif`

### 11. ICP variants and practical limits

- Point-to-point ICP minimizes Euclidean point distances.
- Point-to-plane ICP minimizes displacement along surface normals.
- Dynamic objects and weak overlap can corrupt either objective.

Illustrate verbally: sliding along a perfect wall changes little, while moving through the wall increases error. Corners constrain more directions. Downsampling and outlier rejection trade retained geometry against cost. This demo implements point-to-point only.

### 12. ICP interactive demo

- Watch the correspondence lines update.
- Compare nearby and poor initial guesses.
- Reduce the correspondence gate and inspect the match count.

Instructor-led demo, 4 minutes. Nearby: reset, play to alignment. Poor guess: reset and show wrong convergence. Set a tiny gate to explain insufficient support. Ask why reducing a threshold can prevent recovery.

Visual: `icp-failure.png`

Online demo: https://croquembouche.github.io/Intro2AV-CourseContent/localization/#icp

### 13. Pose uncertainty beyond one guess

- A scan matcher follows one current pose guess.
- The vehicle may plausibly be in several places.
- A localization filter can preserve competing hypotheses.

Transition, 2 minutes. AMCL is a Bayesian filtering method, while ICP and NDT are registration methods used within localization systems. They are not interchangeable algorithms at the same level. Multiple hypotheses are helpful when the prior is broad; finite particle budgets still limit global coverage.

### 14. AMCL: a particle is a pose hypothesis

- Each arrow represents x, y, and heading.
- Its weight describes compatibility with the evidence.
- The population approximates a pose distribution.

AMCL block: about 22 minutes, slides 14–23. Interpret spread in position and heading separately. If two clusters survive, the weighted mean can be physically implausible between them. Inspect clusters rather than treating the blue mean arrow as guaranteed truth.

Visual: `amcl-prior.png`

### 15. Motion prediction

- Odometry predicts how each hypothesis moves.
- Motion noise spreads the hypotheses.
- Uncertainty grows before the next informative measurement.

Explain the integral as all previous poses contributing to the new belief through a motion model. u_t is odometry, z_t is the scan, m is the map. Our demo uses noisy body-frame increments, not the full production Nav2 differential or omnidirectional model.

### 16. Measurement weighting

- Place the measured scan at each candidate pose.
- Endpoints near occupied map geometry earn larger likelihoods.
- Normalize the particle weights after the update.

In the likelihood-field model, use endpoint distance to the nearest occupied surface. It is not direct point-to-point scan registration. A random-measurement term prevents every imperfect scan from receiving zero likelihood. Beam skipping and dynamic-object handling matter in production.

Visual: `amcl-weighted.png`

### 17. The Bayesian measurement update

- The prior carries history into the current update.
- The likelihood scores the current observation.

Explain proportionality and normalization. If we just resampled, weights begin uniform. Otherwise multiply existing weights, as the demo does. Use log likelihoods in code to avoid numerical underflow from multiplying many small numbers.

### 18. Resampling concentrates hypotheses

- Draw new particles according to the normalized weights.
- Strong hypotheses are likely to be copied.
- After resampling, the new particles have equal weights.

Show the cycle. Distinguish a copied particle from a better measured pose. Too few particles can eliminate a useful mode. Motion noise can spread the surviving particles at the next prediction. In our demo the last measurement ESS remains visible after resampling and is labeled that way.

Visual: `amcl-cycle.gif`

### 19. The adaptive part of AMCL

- KLD sampling counts occupied bins in pose space.
- More occupied bins generally require more samples.
- The sample count stays inside configured limits.

KLD sampling bounds approximation error under its assumptions; it is not a correctness certificate for the true pose. Our demo samples until the occupied-bin formula is met, clamped to 150–800. For one occupied bin it retains the maximum, following a conservative special case. Tighten epsilon to request more samples. z=2.326 is the normal quantile used in this example.

### 20. AMCL after several observations

- Prediction spreads the particles.
- Measurements favor compatible poses.
- Adaptive resampling changes the population size.

Compare the initial population to this later result. A concentrated cloud can still be wrong if the map is ambiguous or the right hypothesis was lost. The demo is deterministic for reproducibility; a different random seed can change global-localization outcomes.

Visual: `amcl-localized.png`

### 21. The kidnapped vehicle problem

- The true pose changes without matching odometry.
- The particle cloud remains around the old estimate.
- The next scan is inconsistent with those hypotheses.

Use the green ring to distinguish a physical pose change from a filter update. Automatic recovery mechanisms may inject random poses depending on configuration. Do not promise automatic recovery from ordinary resampling. Our demo deliberately requires explicit global reinitialization.

Visual: `amcl-kidnapped.gif`

### 22. Global reinitialization

- Spread pose hypotheses over the map.
- Use new measurements to favor compatible regions.
- Several observations may be needed to resolve ambiguity.

This animation uses 800 initial samples in the bounded room, including uniformly sampled heading. It is a small teaching example, not evidence of reliable recovery on a large road map. The scan and odometry are the only update inputs; the initialization does not center on truth.

Visual: `amcl-global.gif`

### 23. AMCL interactive demo

- Step through motion, weighting, and resampling.
- Compare tight and loose KLD error tolerances.
- Kidnap the vehicle, then reinitialize globally.

Instructor-led demo, 4 minutes. Point out the stage title and last-measurement ESS. Large sigma makes the sensor less discriminating. Smaller epsilon typically demands more particles, subject to limits. Turn adaptation off to retain 800 samples.

Visual: `amcl-kidnap.png`

Online demo: https://croquembouche.github.io/Intro2AV-CourseContent/localization/#amcl

### 24. NDT: a different representation of the map

- Return to matching a scan from one pose guess.
- Partition the map points into spatial cells.
- Represent each supported cell with a Gaussian distribution.

NDT block: about 18 minutes, slides 24–30. Normal means Gaussian distribution, not a surface normal. The 2D demo uses grid cells; 3D implementations use voxels. AMCL particle spread is uncertainty in pose, whereas NDT covariance describes local map-point geometry.

Visual: `ndt-grid.png`

### 25. Cell mean and covariance

- The mean locates the local point cluster.
- Covariance describes its spread and orientation.
- Thin wall distributions need numerical regularization.

Explain an elongated ellipse: points spread along a wall but little across it. Sample covariance can be singular with too few or nearly collinear points. Our 2D demo requires five points per cell and adds 0.012 m² to covariance diagonal entries. These are teaching settings, not PCL defaults.

### 26. Scoring a transformed scan point

- Measure displacement from a cell mean.
- Scale that displacement by the cell covariance.
- High Gaussian scores indicate better geometric agreement.

Mahalanobis distance penalizes displacement across a thin wall more than along it. Explain inverse covariance qualitatively before presenting the expression. Production variants differ in Gaussian normalization, outlier mixture, neighboring-cell support, and optimizer. The demo minimizes an average negative log score with an outlier floor.

### 27. NDT pose optimization

- Transform the scan using the current pose.
- Evaluate agreement with the map distributions.
- Change pose to improve the aggregate score.

Show the animation. The demo evaluates neighboring cells and uses coordinate search to make each optimization step inspectable. PCL uses a different optimizer; the teaching output is not a PCL benchmark. A stationary score can still correspond to a wrong local solution.

Visual: `ndt-alignment.gif`

### 28. The effect of cell size

- Fine cells preserve local detail but may be undersupported.
- Coarse cells combine more geometry into each Gaussian.
- Initialization and scene structure still affect convergence.

Compare 0.5 m and 2 m. A cell containing a corner mixes two surface directions into one covariance. Too small a cell may lack enough points. Coarse-to-fine registration is a useful strategy in some systems, but this demo runs one selected resolution at a time.

Visual: `ndt-coarse.gif`

### 29. NDT interactive demo

- Compare the map ellipses at different resolutions.
- Watch the Gaussian cost and true pose error.
- Repeat with a poor initial guess.

Instructor-led demo, 3 minutes. Reset for each resolution so the initial pose is identical. Explain that NDT cost is not in meters, while ICP RMSE is. Do not directly rank the algorithms using incomparable scores or this tiny synthetic scene.

Visual: `ndt-fit.png`

Online demo: https://croquembouche.github.io/Intro2AV-CourseContent/localization/#ndt

### 30. ICP, AMCL, and NDT in one system



Comparison, 3 minutes. All three assume a map in this lecture. ICP and NDT are local registration methods here. AMCL maintains a temporal belief and can start globally if sufficiently covered. Systems may use registration measurements inside a filter. Avoid the claim that NDT is always superior to ICP or AMCL.

### 31. Localization reliability

- Check geometry support and temporal consistency.
- Treat dynamic objects and map changes as possible mismatches.
- Use independent information when available.

Closing, 3 minutes. Ask: a long corridor produces a low residual but position jumps along the corridor; what is missing? Answer: observability along the repeated direction and independent constraints. Ask: would simply increasing iterations resolve a wrong correspondence basin? Usually no. Mention GNSS/IMU/wheel odometry as sources of prior or consistency evidence, without presenting this lecture as a complete fusion design.

### 32. Lecture resources and discussion

- Why can ICP converge to the wrong pose?
- What does resampling do to particle weights?
- Why is NDT covariance different from pose covariance?

Expected answers: locally consistent wrong correspondences; selection proportional to weights followed by equal output weights; covariance of map points versus uncertainty over the vehicle state. Suggested pacing: introduction 8, ICP 20, AMCL 22, NDT 18, comparison and discussion 7 minutes. No student installation is required.

## Sources

- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html
