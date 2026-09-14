# Lecture 5 — Localization for Autonomous Driving

Approximately 75–85 minutes. ICP intuition and problems → AMCL benefits and problems → NDT benefits and problems → indoor/outdoor and static/dynamic operating conditions. The demonstrations remain instructor-led, with optional independent exploration.

## 1. Localization for autonomous driving

- Localization
- ICP → AMCL → NDT
- Introduction to Autonomous Driving · Fall 2026

Approximately 75–85 minutes with instructor-led demonstrations. Sequence: understand ICP, identify its limitations, introduce AMCL for pose uncertainty, then introduce NDT for distribution-based scan matching. End by selecting methods for actual operating conditions. A known map is assumed.

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 2. Localization in the autonomy stack

- Localization estimates the vehicle’s position and heading in a map.
- LiDAR measures nearby surfaces in the sensor frame.
- The estimated pose places those measurements in the map.

Use a vehicle near a building corner as the opening example. The immediate task is to find the vehicle pose that makes its scan agree with the existing map. Keep the opening focused on localization rather than repeating perception or calibration definitions.

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 3. The pose we want to estimate

- In 2D, estimate x, y, and heading θ.
- Calibration supplies the fixed sensor-to-vehicle transform.

q_map = R(θ) p_sensor + t
t = [x, y]ᵀ
T_map,base = T_map,sensor (T_base,sensor)⁻¹

Use 2D for visibility, then note that 3D poses contain translation plus roll, pitch, and yaw. Define T_map,sensor explicitly as mapping sensor coordinates into the map. With known sensor extrinsics, recover vehicle pose as T_map,base = T_map,sensor × inverse(T_base,sensor).

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 4. ICP: align the scan with the map

- Gray points belong to the map.
- Orange points are the scan under the current pose guess.
- We want one rigid transform that aligns them.

ICP block: about 20 minutes, slides 5–13. The scan is a sparse, partial observation of the map; point ordering does not tell us correspondences. Green is simulation truth and blue is the estimate. Truth is not given to ICP.

Visual: `icp-start.png`

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html

## 5. Nearest-point correspondences

- Place the scan using the current pose guess.
- Match each scan point to its nearest map point.
- Reject pairs farther apart than the distance gate.

A nearest neighbor is a candidate match. With a bad pose guess, a scan point from one wall may be paired with another wall. The gate rejects distant pairs, but an overly small gate can also remove useful matches before alignment.

Visual: `icp-pairs.png`

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html

## 6. The rigid alignment objective

- Keep the current correspondences fixed during this solve.
- Find the rotation and translation that minimize squared distances.

c(i) = nearest map point to R pᵢ + t
E(R, t) = Σᵢ ‖R pᵢ + t − q_c(i)‖²
RᵀR = I,   det(R) = +1

Explain p_i is a scan point, q_c(i) its current matched map point, and R must be a valid rotation. In 2D the centered dot/cross sums give the optimal angle; 3D commonly uses an SVD with a determinant correction. The matching problem and rigid solve are different subproblems.

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html

## 7. ICP: repeat matching and alignment

- Associate points.
- Solve the rigid update.
- Apply the update, then associate again.

Play the animation, then pause after one iteration in the live demo. Each displayed update is calculated from real nearest-neighbor pairs and a least-squares rigid solve. A stationary update can be a correct solution or a local minimum.

Visual: `icp-alignment.gif`

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html

## 8. ICP benefits

- The objective is easy to visualize and inspect.
- A good initial guess can give an accurate local alignment.
- Point-to-point and point-to-plane variants support 2D or 3D registration.

ICP provides a direct geometric measurement of alignment. It is useful for local tracking and registration when overlap and initialization are good. Point-to-plane methods need normals. Accuracy, speed, and convergence depend on the variant, data, and implementation; do not claim one universal ranking.

Visual: `icp-fit.png`

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html

## 9. ICP problem: a wrong initial guess

- A bad pose guess produces wrong point matches.
- The optimizer can settle at the wrong alignment.
- Small updates or a low residual do not prove the pose is correct.

Run the poor-guess preset. Ask whether the algorithm can know which wall is intended using only its current nearest neighbors. Compare the residual and the green true pose. Do not imply every poor guess fails, or that every low residual proves failure.

Visual: `icp-poor-guess.gif`

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html

## 10. ICP problems: geometry and moving objects

- A long wall or repeated corridor leaves some motion hard to observe.
- Low overlap and moving objects create misleading matches.
- Large point clouds increase correspondence-search work.

Along an ideal straight wall, motion parallel to the wall is weakly constrained. Repeated rooms or poles can produce several plausible alignments. Moving cars and people may not belong to the static map. Filtering, robust rejection, good priors, and informative stable geometry matter. ICP can still be useful in dynamic scenes if enough static structure remains.

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://pointclouds.org/documentation/classpcl_1_1_iterative_closest_point_with_normals.html
- https://arxiv.org/abs/2104.03657

## 11. ICP interactive demo

- Drag the pose guess to a different wall or heading.
- Inspect a scan point and its nearest map match.
- Compare nearby and poor guesses, then change the gate.

Demonstration, 4 minutes. Choose Set scan pose guess and drag to set position and heading. Use Inspect to view the current nearest-neighbor distance. Compare a good initialization with a wrong basin. Ask why more iterations cannot necessarily repair a wrong correspondence pattern.

Visual: `icp-failure.png`

Demo: https://croquembouche.github.io/Intro2AV-CourseContent/localization/#icp

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html

## 12. ICP limitation: only one pose hypothesis

- If the starting location is unknown, one pose guess may be insufficient.
- Keep several possible positions and headings instead.
- AMCL updates those hypotheses using motion and repeated scans.

This is the motivation for AMCL: representing pose uncertainty over time. A particle filter can retain several regions; a local scan matcher typically optimizes one initialization. AMCL is a Bayesian localization filter; ICP is a registration algorithm. AMCL does not solve every ICP failure, especially missing or ambiguous static geometry.

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/

## 13. AMCL: a particle is a pose hypothesis

- Each arrow represents x, y, and heading.
- Its weight describes compatibility with the evidence.
- The population approximates a pose distribution.

AMCL block: about 22 minutes, slides 14–23. Interpret spread in position and heading separately. If two clusters survive, the weighted mean can be physically implausible between them. Inspect clusters rather than treating the blue mean arrow as guaranteed truth.

Visual: `amcl-prior.png`

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html

## 14. Motion prediction

- Odometry predicts how each hypothesis moves.
- Motion noise spreads the hypotheses.
- Uncertainty grows before the next informative measurement.

bel̄(xₜ) = ∫ p(xₜ | uₜ, xₜ₋₁) bel(xₜ₋₁) dxₜ₋₁
Particle motion: xₜ⁽ⁱ⁾ ~ p(xₜ | uₜ, xₜ₋₁⁽ⁱ⁾)

Explain the integral as all previous poses contributing to the new belief through a motion model. u_t is odometry, z_t is the scan, m is the map. Our demo uses noisy body-frame increments, not the full production Nav2 differential or omnidirectional model.

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/

## 15. Measurement weighting

- Place the measured scan at each candidate pose.
- Endpoints near occupied map geometry earn larger likelihoods.
- Normalize the particle weights after the update.

In the likelihood-field model, use endpoint distance to the nearest occupied surface. It is not direct point-to-point scan registration. A random-measurement term prevents every imperfect scan from receiving zero likelihood. Beam skipping and dynamic-object handling matter in production.

Visual: `amcl-weighted.png`

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/

## 16. The Bayesian measurement update

- The prior carries history into the current update.
- The likelihood scores the current observation.

bel(xₜ) ∝ p(zₜ | xₜ, m) bel̄(xₜ)
wₜ⁽ⁱ⁾ ∝ wₜ₋₁⁽ⁱ⁾ p(zₜ | xₜ⁽ⁱ⁾, m)
Σᵢ wₜ⁽ⁱ⁾ = 1

Explain proportionality and normalization. If we just resampled, weights begin uniform. Otherwise multiply existing weights, as the demo does. Use log likelihoods in code to avoid numerical underflow from multiplying many small numbers.

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/

## 17. Resampling concentrates hypotheses

- Draw new particles according to the normalized weights.
- Strong hypotheses are likely to be copied.
- After resampling, the new particles have equal weights.

Show the cycle. Distinguish a copied particle from a better measured pose. Too few particles can eliminate a useful mode. Motion noise can spread the surviving particles at the next prediction. In our demo the last measurement ESS remains visible after resampling and is labeled that way.

Visual: `amcl-cycle.gif`

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html

## 18. The adaptive part of AMCL

- KLD sampling counts occupied bins in pose space.
- More occupied bins generally require more samples.
- The sample count stays inside configured limits.

N ≈ (k − 1)/(2ε) ×
[1 − 2/(9(k − 1)) + z √(2/(9(k − 1)))]³
k: occupied pose bins; ε: approximation tolerance

KLD sampling bounds approximation error under its assumptions; it is not a correctness certificate for the true pose. Our demo samples until the occupied-bin formula is met, clamped to 150–800. For one occupied bin it retains the maximum, following a conservative special case. Tighten epsilon to request more samples. z=2.326 is the normal quantile used in this example.

Sources:
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/

## 19. AMCL benefits

- Particles can represent several possible locations.
- Odometry and successive scans refine the pose over time.
- Adaptive sampling adjusts the particle count to the belief.

With enough samples covering the correct region, AMCL can perform global localization or track a known pose. Its multimodal belief is useful in ambiguous environments, unlike a single pose guess. KLD adaptation changes the computational budget within limits. Nav2 AMCL is designed around a 2D pose and a static occupancy map.

Visual: `amcl-localized.png`

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html

## 20. AMCL problem: losing the correct hypothesis

- The true pose changes without matching odometry.
- The particle cloud remains around the old estimate.
- The next scan is inconsistent with those hypotheses.

Use the green ring to distinguish a physical pose change from a filter update. Automatic recovery mechanisms may inject random poses depending on configuration. Do not promise automatic recovery from ordinary resampling. Our demo deliberately requires explicit global reinitialization.

Visual: `amcl-kidnapped.gif`

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/

## 21. AMCL recovery: global reinitialization

- Sample positions and headings across the map.
- New scans favor hypotheses that agree with the map.
- Recovery depends on covering the right region and observing useful geometry.

This animation uses 800 initial samples in the bounded room, including uniformly sampled heading. It is a small teaching example, not evidence of reliable recovery on a large road map. The scan and odometry are the only update inputs; the initialization does not center on truth.

Visual: `amcl-global.gif`

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html

## 22. AMCL problems: coverage, maps, and scale

- A large search area needs more particles to cover plausible poses.
- Repeated layouts or changed obstacles can keep the belief wrong.
- Standard 2D AMCL does not model a vehicle’s full 3D pose.

Finite sampling may miss a narrow correct region or lose it during resampling. More particles can improve coverage but cost more computation. A stale occupancy map and blocked walls weaken measurement likelihoods. Beam skipping can help with some inconsistent observations, but does not reconstruct missing static evidence. Standard Nav2 AMCL is planar; a particle filter over six pose dimensions is possible but much harder to cover efficiently.

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html
- https://arxiv.org/abs/2104.03657

## 23. AMCL interactive demo

- Place the vehicle and particle prior in different locations.
- Drive through the map and inspect particle weights.
- Compare a local prior with global reinitialization.

Demonstration, 4 minutes. Map action Place / kidnap vehicle changes the physical pose only; Place AMCL prior changes the belief only. Inspect a particle to display its projected scan. Drive with the arrow buttons. Compare local coverage, a wrong prior, and global reinitialization. Neither recovery nor correct convergence is guaranteed.

Visual: `amcl-kidnap.png`

Demo: https://croquembouche.github.io/Intro2AV-CourseContent/localization/#amcl

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html

## 24. NDT: match against local map distributions

- AMCL handles pose uncertainty; it is not the only way to match a scan.
- For local alignment, summarize map regions with Gaussians.
- NDT scores scan points against those distributions.

Transition: NDT revisits the map representation used for scan matching. It addresses a different issue from AMCL: scoring a scan against local statistical geometry, rather than maintaining a pose distribution. It can be a local measurement source inside a broader localization system. NDT is not an automatic replacement for AMCL or a guaranteed solution to ICP initialization problems.

Visual: `ndt-grid.png`

Sources:
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 25. Cell mean and covariance

- The mean locates the local point cluster.
- Covariance describes its spread and orientation.
- Thin wall distributions need numerical regularization.

μ = (1/n) Σⱼ qⱼ
Σ = (1/(n − 1)) Σⱼ (qⱼ − μ)(qⱼ − μ)ᵀ
Σ_regularized = Σ + λI

Explain an elongated ellipse: points spread along a wall but little across it. Sample covariance can be singular with too few or nearly collinear points. Our 2D demo requires five points per cell and adds 0.012 m² to covariance diagonal entries. These are teaching settings, not PCL defaults.

Sources:
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 26. Scoring a transformed scan point

- Measure displacement from a cell mean.
- Scale that displacement by the cell covariance.
- High Gaussian scores indicate better geometric agreement.

r = R p + t − μ
d² = rᵀ Σ⁻¹ r
Gaussian score ∝ exp(−d² / 2)

Mahalanobis distance penalizes displacement across a thin wall more than along it. Explain inverse covariance qualitatively before presenting the expression. Production variants differ in Gaussian normalization, outlier mixture, neighboring-cell support, and optimizer. The demo minimizes an average negative log score with an outlier floor.

Sources:
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 27. NDT pose optimization

- Transform the scan using the current pose.
- Evaluate agreement with the map distributions.
- Change pose to improve the aggregate score.

Show the animation. The demo evaluates neighboring cells and uses coordinate search to make each optimization step inspectable. PCL uses a different optimizer; the teaching output is not a PCL benchmark. A stationary score can still correspond to a wrong local solution.

Visual: `ndt-alignment.gif`

Sources:
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 28. NDT benefits

- Each supported map cell summarizes many points with a mean and covariance.
- The score reflects local surface orientation and spread.
- A precomputed 3D map can support repeated LiDAR localization.

The distribution representation avoids a direct nearest raw-point correspondence for every point in the same form as point-to-point ICP. Covariance gives directional information about local geometry. Precomputed cell statistics can be reused. Runtime and accuracy still depend on resolution, point count, optimizer, and implementation. Autoware provides a concrete 3D LiDAR scan-to-map NDT localizer; this is an application example, not evidence that NDT always outperforms ICP.

Sources:
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html
- https://autowarefoundation.github.io/autoware_core/latest/localization/autoware_ndt_scan_matcher/

## 29. NDT problem: choosing the cell size

- Fine cells preserve local detail but may be undersupported.
- Coarse cells combine more geometry into each Gaussian.
- Initialization and scene structure still affect convergence.

Compare 0.5 m and 2 m. A cell containing a corner mixes two surface directions into one covariance. Too small a cell may lack enough points. Coarse-to-fine registration is a useful strategy in some systems, but this demo runs one selected resolution at a time.

Visual: `ndt-coarse.gif`

Sources:
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 30. NDT problems: initialization and map mismatch

- A poor initial pose can still lead to the wrong solution.
- Sparse or repetitive geometry can leave the alignment weak.
- Moving objects and map changes can distort the scan score.

NDT is generally used as a local registration method and benefits from an initial pose estimate. A Gaussian representation does not make dynamic returns static or resolve an unobservable direction. Sparse cells need adequate support and covariance regularization. Reject inconsistent returns, retain stable structures, and monitor the estimate against other sensors. Dynamic map loading in Autoware refers to loading map regions; it does not mean NDT inherently tracks moving objects.

Sources:
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html
- https://autowarefoundation.github.io/autoware_core/latest/localization/autoware_ndt_scan_matcher/
- https://arxiv.org/abs/2104.03657

## 31. NDT interactive demo

- Change cell size and inspect a cell’s statistics.
- Move the vehicle, then align the new scan.
- Try a poor pose guess and watch for a wrong solution.

Demonstration, 3 minutes. Inspect shows cell point count, mean, and covariance. Compare 0.5 m, 1 m, and 2 m cells using the same initial pose. A lower cost is not a calibrated pose probability. The demo uses a simplified optimizer and is not a performance comparison with PCL or AMCL.

Visual: `ndt-fit.png`

Demo: https://croquembouche.github.io/Intro2AV-CourseContent/localization/#ndt

Sources:
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 32. Indoor localization: useful starting points



Situation | Candidate | What it needs
2D mobile robot | AMCL | Occupancy map; odometry
Local scan alignment | ICP | Good guess; scan overlap
3D mapped building | NDT | Dense map; useful geometry

These are conditional engineering choices, not indoor-only restrictions. A mapped office or warehouse with planar motion and a 2D laser fits the assumptions of standard AMCL. ICP is useful for local scan registration with a reliable prior. NDT can also work indoors with a sufficiently detailed point-cloud map and supported cells. Repeated aisles can confuse all methods; distinct structure and independent constraints remain important.

Sources:
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 33. Outdoor localization: map and sensor matter



Situation | Candidate | What it needs
Mapped urban route | NDT or ICP | Stable 3D structure; prior
Flat mapped campus | AMCL possible | Useful 2D map; odometry
Open, sparse terrain | Additional sensors | GNSS/IMU; more constraints

NDT is used in Autoware for 3D LiDAR localization against a point-cloud map. ICP can also register outdoor scans; outdoors is not a reason to rule it out. AMCL can work on a mostly planar outdoor site with a stable 2D map. An open field or feature-poor road can provide too little geometry for any LiDAR-map method; GNSS/IMU or other independent constraints may be needed. These comparisons are inferences from algorithm assumptions and documented system designs, not benchmark rankings.

Sources:
- https://autowarefoundation.github.io/autoware_core/latest/localization/autoware_ndt_scan_matcher/
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/

## 34. Static and dynamic environments



Scene | Effect | Practical response
Mostly static | Map agreement is useful | Any method; match assumptions
People / traffic | Occlusion and outliers | Use stable returns; reject outliers
Changed layout | The map may be wrong | Update map; check localization

Static means stable map geometry, not a stationary robot. All three methods can localize a moving robot. In dynamic scenes, people and vehicles may hide mapped surfaces or generate conflicting returns. ICP can reject bad pairs; AMCL can use robust measurement models or beam skipping; NDT needs robust scoring or preprocessing as well. None is inherently immune to moving objects. Long-term map changes may require map maintenance or relocalization; simply tuning an optimizer cannot restore absent geometry.

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html
- https://arxiv.org/abs/2104.03657

## 35. Choosing a localization method



Method | Best fit | Main limitation
ICP | Local geometric alignment | Wrong matches / initial pose
AMCL | 2D tracking or global belief | Particle coverage / map fit
NDT | Local alignment to a 3D map | Cell scale / initial pose

Start with the map and the state to estimate. Is there a 2D occupancy map or a 3D point-cloud map? Is a good pose prior available, or is the robot globally uncertain? Then consider stable geometry, dynamics, computation, and recovery. These methods can be combined; a registration result can feed a filter. Avoid universal rankings by indoor/outdoor alone.

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html

## 36. Discussion and demo links

- Why can both ICP and NDT converge to a wrong pose?
- When does keeping several pose hypotheses help?
- What changes when moving objects hide most of the map?

Answers: both optimize locally and can be misled by initialization, ambiguity, or map mismatch. Multiple hypotheses help with uncertain or ambiguous location if particles cover the correct region. Heavy occlusion reduces stable evidence for every method; reject inconsistent returns and use other constraints rather than assuming a more complex method will fix it. Suggested pacing: setup 5, ICP 20, AMCL 23, NDT 20, comparisons and discussion 12 minutes.

Sources:
- https://pointclouds.org/documentation/tutorials/iterative_closest_point.html
- https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/
- https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html
- https://papers.nips.cc/paper_files/paper/2001/hash/c5b2cebf15b205503560c4e8e6d1ea78-Abstract.html
