# Lecture 7: Path planning

Open `index.html` in Chrome, Edge, or Firefox. All code and scenes are local, so the demo runs without network access or a ROS installation. Extract the ZIP before opening its files.

Choose an experiment from the grouped menu on a wide screen or the experiment selector on a tablet or phone. Playback sits above the simulation; live results appear below it. Settings are grouped on the right on desktop and below the simulation on smaller screens. **Focus view** expands the simulation for projection. Returning to a phone width restores the settings automatically.

The nine experiments use `engine.js` and `advanced.js`. The latter adds Theta*, PRM, RRT*, Informed RRT*, and a simplified MPPI-style controller. The slides contain notes explaining the algorithms, their assumptions, and primary sources.

| Experiment | Starting settings | Experiment and expected observation |
| --- | --- | --- |
| A* and graph search | Rough terrain, BFS | Run to result, then choose A*. BFS uses fewer edges but crosses cost-6 terrain. A* minimizes the same weighted costs as Dijkstra. Record total cost and expansions separately. |
| D* Lite replanning | Default two-wall map | Click a blue route cell to block it. D* Lite repairs stored g/rhs values. Compare the latest processed-state count and route cost with a new A* search. Reopen the cell and move the start with the button. |
| Robot clearance | Radius 0.4, margin 0.2 | Increase the radius to 2.0. The orange forbidden region closes the passage. Decide whether the cause is physical clearance, conservative grid resolution, or search. |
| Attraction and repulsion | Single obstacle | Run to result, then choose U-shaped trap. The net force approaches zero inside the U even though the goal remains far away. Changing repulsion can change the motion but does not guarantee a route. |
| Theta* and any-angle | Two walls, Theta* | Run to result. Compare the blue route with the gray eight-neighbor A* reference on the same map. Switch to eight-neighbor A*. Record Euclidean length and expanded states; explain why a geometric shortcut does not establish steering feasibility. |
| PRM roadmaps | Two walls, seed 7, 8 neighbors, 300 attempts | Build the roadmap with Run to result. Click to move the selected endpoint, or swap start and goal. Existing samples and edges remain. Reduce neighbors or sample budget to explore disconnected queries; increase the budget and run again to extend the same roadmap. |
| RRT / RRT* / Informed RRT* | Two walls, seed 7, extension 2, 900 attempts | Compare the three algorithms using the same settings. RRT stops at its first route. RRT* and Informed RRT* continue to the sample budget. Compare first/best route lengths, rewires, and the convergence plot. Informed sampling displays a green ellipse only after finding a route. Increase the budget and run again to continue the same tree. A finite-budget failure does not prove the scene has no route. |
| Global and local | Horizon 3 s, obstacle present | Play the scene. The blue global route stays visible while local rollouts change. Disable moving obstacle to make a permanent blockage. The local controller can stall. Click **Update global map and replan** to run A* with the current obstacle occupancy, then continue local execution. A moving obstacle can invalidate that occupancy snapshot again. |
| MPPI within Global and local | MPPI controller, horizon 3 s, 96 rollouts, temperature 3 | Play and inspect the control-sequence rollouts. Lower and raise temperature; compare effective weighted rollouts. Change control noise, rollout count and horizon. Compare with constant-velocity sampling on the same scene. A weighted control update is collision-checked again before use. |
| Pose imagination | Doorway 2.4, robot 4 × 1.5 | Test all orientations. At 0° the short side faces the opening and the translation fits. At 90° it collides. Widen the opening to 5.0 to make every tested orientation fit. |

For a short class exercise, record the algorithm/scene settings, what changed, and the reason for one success and one failure. Include a screenshot and distinguish graph cost, collision clearance, vehicle kinematics, and prediction timing.

## Models and limits

- Grid search uses four neighbors, positive entry costs, and Manhattan distance. “Weighted A*” changes the heuristic multiplier, so exact optimality no longer follows from the ordinary A* assumptions.
- D* Lite uses a fixed goal, backward g/rhs estimates, lexicographic priorities, and the moving-start key adjustment. It handles increased and decreased occupancy/terrain costs. Expansion counts measure states processed, not wall-clock runtime.
- Clearance conservatively excludes entire cells that intersect obstacle expansion. It can remove a continuous path near the clearance threshold. It includes an extra margin but no stochastic localization model.
- Potential fields sum attraction to a goal and repulsion from circular obstacles. Integration caps displacement and rejects collisions. The scene demonstrates an ordinary local minimum.
- Theta* uses line-of-sight parent shortcuts during search on an eight-neighbor cell-center graph. Both Theta* and its eight-neighbor A* baseline use uniform Euclidean edge costs, the same exact segment/rectangle distance check, and a circular radius of 0.2 cells. Basic Theta* is not guaranteed to find the shortest continuous path. Neither planner models steering. Weighted terrain remains in the original graph-search experiment.
- PRM accepts free 2D samples, connects up to k nearby existing vertices with collision-free edges, and uses Dijkstra for endpoint queries on a persistent graph. It is finite, fixed-k PRM, not PRM*. Changing the map, seed or neighbor count rebuilds the graph; changing the sample budget or query endpoints retains it.
- Basic RRT uses continuous 2D samples, exact segment/rectangle clearance checks and goal bias. It stops at the first feasible solution. RRT* chooses lower-cost parents, rewires nearby vertices and propagates descendant costs. Its connection radius decreases with sample count, capped at 4.5 cells. Informed RRT* directly samples a uniform 2D improvement ellipse after a solution exists. All three variants use the same exact segment/rectangle distance check for a 0.2-cell circular footprint. Finite sample budgets and seeds do not certify completeness or optimality. All three use distance cost and omit vehicle steering; terrain-cost maps are excluded from this experiment.
- Local control samples constant forward speed and angular velocity in a unicycle model, predicts an ideal sinusoidal obstacle, and applies the first 0.1 s of a rollout. It omits acceleration reachability and braking constraints. An execution check prevents sampled collisions. The constant-velocity option is an instructional sampled controller, not production Nav2 DWB or MPC.
- The MPPI-style option optimizes bounded unicycle speed/turn-rate sequences with correlated Gaussian perturbations, exponential trajectory-cost weights, a shifted warm start and receding-horizon execution. Temperature controls weight concentration. It rejects rollouts that fail the configured sampled collision checks, rechecks the weighted sequence, and falls back to a valid candidate or stationary rollout; if none passes, it reports no valid motion. Hard rejection, clipped controls, simplified costs and omitted formal importance-sampling corrections differ from theoretical MPPI. It runs on the CPU and is not the Nav2 implementation. Prediction remains ideal; acceleration and braking constraints are omitted.
- Pose imagination checks sampled straight translations of an oriented rectangle using polygon/rectangle separation. It illustrates testing candidate motions. It does not reproduce Chirikjian’s physics-based affordance learning, PRIMP, or RAIL.

## Sources

- [LaValle, Planning Algorithms](https://lavalle.pl/planning/), Chapters 2, 4, 5, 8 and 13.
- [Stentz, The D* Algorithm for Real-Time Planning of Optimal Traverses, 1994](https://publications.ri.cmu.edu/the-d-algorithm-for-real-time-planning-of-optimal-traverses).
- [Koenig and Likhachev, D* Lite, AAAI 2002](https://idm-lab.org/bib/abstracts/papers/aaai02b.pdf).
- [Daniel, Nash, Koenig and Felner, Theta*: Any-Angle Path Planning on Grids, JAIR 2010](https://arxiv.org/abs/1401.3843).
- [Gammell, Srinivasa and Barfoot, Informed RRT*, IROS 2014](https://robotic-esp.com/papers/gammell_iros14).
- [Williams, Aldrich and Theodorou, Model Predictive Path Integral Control using Covariance Variable Importance Sampling](https://arxiv.org/abs/1509.01149).
- [Karaman and Frazzoli, Sampling-based Algorithms for Optimal Motion Planning](https://arxiv.org/abs/1105.1186).
- [Nav2 planners and controllers](https://docs.nav2.org/jazzy/getting_started/navigation_concepts/navigation_servers/) and [MPPI documentation](https://docs.nav2.org/rolling/configuration_and_development/configuration_guide/controller_plugins/mppi_controller/configuring_mppic/).
- [Greg Chirikjian’s 2024 Robot Imagination seminar](https://ame.nd.edu/events/from-state-estimation-to-affordance-learning-and-robot-imagination/).
- [PRIMP](https://arxiv.org/abs/2305.15761) and [RAIL](https://arxiv.org/abs/2403.19369).

## Algorithm and display audit — October 27, 2026

The [audit report](https://github.com/Croquembouche/Intro2AV-CourseContent/blob/main/tools/slides/lecture7/algorithm-audit.md) records the corrected cases and tested limits. From the repository root, run `node tools/slides/lecture7/audit-algorithms.cjs` for independent numerical checks and `node tools/slides/lecture7/audit-display.cjs` for browser checks. The existing `check-demo.cjs` and `check-advanced.cjs` suites also cover complete demonstrations.

The local view displays predictions from their recorded decision pose and time, with the obstacle's current position filled red and its planning-time position outlined. Prediction checks remain discrete; the display does not claim continuous-time collision avoidance. Theta* check counts advance with the animation, the RRT sample marker represents an actual attempted sample, and RRT* highlights only rewires from the current attempt.
