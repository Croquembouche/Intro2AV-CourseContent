# Lecture 8: Control for autonomous driving

Open `index.html` in a modern browser. All six demonstrations run offline, with no installation or external libraries. In the complete lecture ZIP, open `START_HERE.html` after extraction. The lecture is designed for about 65–80 minutes, with instructor-led demonstrations and verbal discussion. No by-hand calculations, worksheets, or submitted results are required.

## Demonstrations

| View | Implemented controller | What to watch |
| --- | --- | --- |
| PID speed | P, I, filtered derivative on measurement, optional nominal drag feedforward, conditional anti-windup | Reject a hill load, then brake with/without anti-windup |
| Pure Pursuit | Rear-axle target geometry using actual target chord distance | Change lookahead and speed |
| Stanley | Front-axle cross-track and heading feedback, low-speed softening | Change gain and command delay |
| LQR | Discrete Riccati iteration, speed-dependent gain, curvature feedforward | Trade state error against steering effort |
| MPC | Finite-horizon linear error model, quadratic cost, angle/rate constrained QP | Change preview horizon, limits, and model mismatch |
| Compare | Four independent lateral closed loops with shared conditions | Compare measured behavior under a controlled scenario |

## Start with a guided case

Choose a case from the dropdown, press **Play** to watch the motion, then choose a contrasting case. Use **Step** to inspect one decision or **Run 20 s** to jump to a completed response. Guided cases set every parameter. Manual changes create a custom run. The P and PI hill presets both set Kd = 0, so the controller names match their implemented terms.

Changing settings, loading a new case, or resetting automatically saves a nonempty current run. Up to four saved runs stay in the comparison table, and the most recent is dashed on the plots. Each algorithm keeps its own settings, run progress and saved comparisons when switching tabs. These runs live only in the current page session; export before reloading or closing.

**Close-up** shows the vehicle, applied steering, reference, target/error geometry and current MPC prediction with equal axis scales. **Full route** enlarges the lateral axis to show small tracking differences. Use the close-up for interpreting angles. The explanatory decision text comes from the same calculation used to control the simulation, without advancing it. The input plot separates requested, limited and applied commands.

**Full run** includes initial recovery in the error metrics. **After 2 s** excludes it. Every table row uses the same selected window, and the duration column exposes incomplete runs. Compare equal-duration runs. An empty selected interval shows a dash instead of a misleading zero.

**Export CSV** saves the current run, including PID term contributions. The first line is `# settings=` metadata; skip it when parsing the table. **Export comparisons** saves the retained configurations and samples as JSON. These optional exports and numerical comparisons are inside a collapsed section. The [concept guide](concept-guide.html) explains each controller in words and suggests contrasting cases to replay.

## Teaching sequence

The 35-slide deck emphasizes concepts, visual behavior, and instructor demonstrations. There are no displayed equations, by-hand calculations, result tables to fill, or required exports.

1. **Feedback:** observe, correct, observe again. Contrast reaction with anticipation.
2. **PID:** watch the persistent speed gap on a hill, then the stored-correction problem during braking.
3. **Pure Pursuit and Stanley:** watch a target point versus heading/sideways correction. Compare gentle and strong responses, then add delay.
4. **LQR:** see how tracking priority and steering penalty change the feedback behavior. Contrast a preference with a physical limit.
5. **MPC:** follow the green prediction and the orange first action. Compare preview lengths, limits, and delayed actuation.
6. **Controller choice:** watch tracking, recovery, repeated swings, and steering activity under shared conditions.

The main demo explains decisions in ordinary language. Fine tuning, numerical comparisons, exports, and solver diagnostics are optional disclosures. The concept guide contains reading prompts rather than worksheet fields.

## Model and algorithm details

Coordinates use forward x, left y, and positive counterclockwise heading/steering. The vehicle position is the rear axle. Lateral errors are signed normal distances to a numerically located nearest point on the analytic reference. The initial `offset` is a world-y displacement, which differs slightly from a normal-distance offset on a sloped path.

The lateral plant is a nonlinear kinematic bicycle, wheelbase 2.7 m, fixed chosen speed, Euler step 0.05 s. Every method uses the same steering angle/rate bounds, first-order actuator lag and optional command delay/steering bias. There are no road boundaries, obstacles, tire slip, localization noise, or collision avoidance. The full-route view enlarges the lateral axis to reveal tracking differences; the close-up uses equal axis scales.

Pure Pursuit selects a forward reference point at least the chosen lookahead distance away, in 0.1 m search increments. It uses the actual chord distance in `delta = atan(2 L y_target / distance^2)`. Stanley uses `delta = path_heading - heading + atan(-gain * e_front / (speed + 0.5))`. Heading differences are wrapped. The common error plot and metrics always use the rear axle, even for Stanley.

LQR uses `A = [[1,v*dt],[0,1]]`, `B = [0,v*dt/L]^T`, `Q = diag(q,2)`, and `R = r`. A discrete Riccati iteration computes the gain when settings change. Curvature feedforward `atan(L*kappa)` accompanies feedback. The design omits actuator dynamics and input constraints. Clipping can invalidate the nominal linear behavior.

MPC optimizes N absolute steering inputs. Its linear error predictor includes the upcoming path curvature. The cost sums lateral error, heading error, and steering effort; the Tracking priority and Avoid large steering commands sliders adjust those preferences. There is no terminal penalty/set. Input angle and consecutive-input rate constraints include the currently applied steering. A 90-iteration ADMM solve approximates the convex QP, with shifted previous inputs as initialization and a final feasible angle/rate projection. An advanced disclosure shows the raw primal constraint residual before that projection. It is **not** an optimality certificate. The predictor omits lag, delay, bias and nonlinear tire behavior. This formulation does not impose road-edge or obstacle constraints and does not establish closed-loop stability.

The speed plant uses `dv/dt = actual_acceleration - 0.08*v - grade`. Acceleration limits are −4 to 2.5 m/s². The hill begins at 6 s. The braking reference changes to 4 m/s at 9 s. Derivative acts on speed and uses a 0.15 s low-pass filter. Anti-windup conditionally freezes the integral when saturation and error point in the same direction. Optional feedforward compensates nominal drag only.

## Metrics and interpretation

RMS/peak error use the selected Full run or After 2 s window. Command RMS is the limited steering request in degrees in the comparison table and radians in the CSV. It is not energy or a complete comfort metric. Actuator limiting counts command requests outside the angle/rate envelope; MPC can sit exactly at a legal bound without being counted as clipped. PID limiting counts acceleration saturation. Final error is signed.

This is a deterministic teaching comparison with illustrative tuning, not a production benchmark or an equal-tuning-effort ranking. Compare identical scenarios and report every setting. A lower RMS alone does not establish safety, robustness, or actuator feasibility.

## Sources

- [Coulter (1992), Implementation of the Pure Pursuit Path Tracking Algorithm](https://www.ri.cmu.edu/pub_files/pub3/coulter_r_craig_1992_1/coulter_r_craig_1992_1.pdf)
- [Thrun et al. (2006), Stanley: The Robot That Won the DARPA Grand Challenge](https://robots.stanford.edu/papers/thrun.stanley05.pdf). The lab implements the core geometric law, not the full vehicle controller.
- [MIT Underactuated Robotics, Linear Quadratic Regulators](https://underactuated.mit.edu/lqr.html)
- [do-mpc, Basics of Model Predictive Control](https://www.do-mpc.com/en/latest/theory_mpc.html)
- [MathWorks, Anti-Windup Control Using PID Controller Block](https://www.mathworks.com/help/simulink/slref/anti-windup-control-using-a-pid-controller.html)

Authoring and verification: `tools/slides/lecture8/`. This release is local; no Pages or Drive publication is implied.
