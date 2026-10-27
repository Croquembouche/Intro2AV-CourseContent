# Lecture 7 algorithm and display audit

Audited October 27, 2026. Scope: the nine Path Planning experiment families in `2026/Labs/PathPlanning`, including the selectable search, sampling, and local-control variants. This audit does not cover the separate Lecture 8 Control engine or certify a production robot planner.

## Confirmed faults and corrections

| Fault reproduced | Correction |
| --- | --- |
| Basic RRT accepted a segment with only 0.1948344754 cells of clearance for a radius-0.2 robot because its point samples missed the closest approach. | Replaced sampled segment checking with exact segment-to-rectangle distance; RRT, RRT*, PRM and Theta* now share that geometry routine. |
| Start and goal at the same free location could produce a roughly 4-cell RRT loop or a positive-cost RRT* loop. | Return the zero-motion route immediately and avoid duplicate coincident goal points. |
| The basic RRT legend described an orange sample point but the engine never supplied its position. | Store the actual attempted sample, including rejected samples, for rendering. |
| RRT* retained the previous attempt's magenta rewiring highlights after rejecting the next attempt; this occurred on 73 of the first 900 attempts in the seed-7 two-wall case. | Clear the latest-rewire list at the beginning of every attempt. |
| Local candidate curves were prepended with the robot's post-execution position, although their points had been predicted from the pre-execution position. | Preserve the planning origin and timestamp with each result and draw candidates from that origin. |
| The moving obstacle was drawn at the previous planning time while the displayed clock and robot had advanced 0.1 seconds. | Draw its current position separately from its planning-time outline. |
| Theta* displayed the completed search's collision/visibility-check count while zero expansions were visible. | Store a cumulative check count for each expansion and reveal the corresponding count with the animation. |
| The MPPI-style view could label an absent motion as “Safe fallback.” | Report weighted proposal, sample/stop fallback, or no valid sequence, without an unsupported safety label. |
| Reusing an MPPI warm start with a lower speed limit could leave the nominal candidate above the new limit; the UI normally resets on this change, but the planner API did not enforce it. | Clamp the retained nominal sequence to current speed and turn bounds before evaluation. |
| Changing the any-angle algorithm reset user-edited obstacles; Step could extend RRT* beyond its stated sample budget. | Preserve the edited map when changing the algorithm and enforce the budget for manual steps too. |
| Changing doorway orientation during playback continued translating immediately and left stale candidate-status text. | Pause on orientation changes, invalidate candidate results, and ask for a new test. |

## Independent numerical checks

`node tools/slides/lecture7/audit-algorithms.cjs` passed:

- 40 random weighted maps: BFS edge count and Dijkstra/A* path cost checked against a separate binary-heap uniform-cost oracle, with independently generated coordinate transitions; Weighted A* checked against its configured weight-3 cost bound.
- 480 D* Lite obstacle/cost changes, plus moves of the start, compared with fresh oracle solutions.
- Eight-neighbor A* cost compared with an eight-neighbor oracle; Basic Theta* checked for route existence and collision-free segments, not global continuous optimality.
- 1,000 segment/rectangle distances compared with an independent convex one-dimensional minimization; the recorded grazing-collision regression is rejected.
- Returned clearance paths checked against continuous circular-footprint geometry across radii from 0 to 2.5 cells.
- Nine seeded sampling runs: collision-free edges, parent-cost consistency, absence of cycles, monotonic best cost for the star variants, and correct per-attempt rewiring highlights; 2,261 informed samples checked against the ellipse bound that existed when sampled.
- Zero-motion start/goal cases and PRM query reuse without modifying the roadmap.
- Four potential-field gradient checks by finite differences away from the singularity clamp; 252 doorway cases compared with the rectangle's analytic vertical projection.
- Local planner origin/time, empty-route handling, MPPI-style control bounds after changing limits, and normalized exponential weights.

The browser audit additionally checks actual orange RRT pixels, progressive Theta* counts, map preservation, budget enforcement, the canvas drawing origin and obstacle position for both local controllers, absent-motion labels, orientation changes, and all nine mobile views. Both existing full-demo suites passed, including offline/network-blocked operation and zero JavaScript errors.

## Interpretation and remaining model limits

- The grid searches use positive costs with minimum 1, so the four-neighbor Manhattan heuristic is a valid lower bound in these scenes; changing those assumptions would require reviewing the heuristic.
- D* Lite is distinct from original D*, and Basic Theta* is not guaranteed to find the globally shortest continuous route; the implementation and labels retain those distinctions. See the [D* Lite paper](https://idm-lab.org/bib/abstracts/papers/aaai02b.pdf) and [Theta* paper](https://arxiv.org/abs/1401.3843).
- PRM is an incremental fixed-k teaching roadmap, not PRM*; a finite RRT* or Informed RRT* run is not an optimality certificate. The asymptotic result has assumptions beyond finite demonstration outcomes: [Karaman and Frazzoli](https://arxiv.org/abs/1105.1186).
- The MPPI-style example uses clipped, correlated perturbations, exponential cost weighting, and collision rejection; it omits the formal importance-sampling terms of the [MPPI reference method](https://arxiv.org/abs/1509.01149). It is labeled as an instructional variant, not a reproduction of that method or Nav2.
- Local rollouts and execution checks remain discrete 0.1-second unicycle simulations with ideal obstacle prediction and no acceleration/braking constraints; passing these checks does not establish continuous-time or physical-vehicle safety.
- Obstacle inflation deliberately excludes whole cells conservatively, and the doorway model tests fixed-orientation translations rather than rotations or learned affordances.

The checked cases provide regression evidence for these finite models, not a proof that all inputs or robot behaviors are correct.
