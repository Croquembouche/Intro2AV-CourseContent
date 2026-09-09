# Lecture 4: Sensor fusion for autonomous driving

Open **index.html** in Chrome, Edge, or Firefox. Keep **lab.js**, **scene3d.js**, and the **vendor** folder beside it. The 3D views use the bundled Three.js renderer, with 2D diagnostics as a fallback when WebGL is unavailable. The five experiments run entirely offline. No packages, account, camera, LiDAR, ROS installation, or internet connection are required.

For the complete lecture ZIP, extract all files first. Open the deck from `Presentations` and the demo from `Labs/SensorFusion/index.html`. The slide links use that relative folder layout. If PowerPoint blocks local HTML links, open the HTML directly and switch between the browser and slide show.

## Updated 3D controls

Every experiment now includes an orbitable 3D view. Drag the scene to orbit, scroll to zoom, use the perspective/top/side buttons, or use the arrow keys while the view has focus. On narrow screens the scene appears above the controls.

The LiDAR has **fixed 360° horizontal coverage**, including rear returns. The default street preset uses **32 elevation channels** and a **1° azimuth step**. Vehicles, pedestrians, buildings, lamp posts, and cones surround the ego vehicle. The rendered obstacle surfaces use the same cuboids as the range calculation, so the point cloud matches the modeled scene.

- **Scene + points / Point cloud only / Scene only:** compare geometry and sensor measurements.
- **Range / Height / Object:** change point coloring.
- **Pause sweep / Step 15°:** inspect a deliberately slowed azimuth sweep. The full point cloud stays visible, and the mint fan marks the current azimuth. This visual speed is not a hardware scan-rate simulation.
- **FOV envelope / Sensor frame:** toggle geometry guides.
- **Street / Dense / Sparse / Near blind zone:** change meaningful parameter combinations while keeping horizontal coverage at 360°.
- **Click an object:** inspect its return count and nearest return distance.

The ego car is a sensor-mounting reference and is excluded from self-returns. The scene is static and idealized, with no material-dependent intensity, noise, multipath, or moving-scan distortion. Lamp-post and person geometry consists of cuboids to keep displayed and measured surfaces identical.

The robot arm now shows physical link and joint geometry with local frame axes, while retaining the 2D coordinate plot and matrices. The camera experiment pairs a 3D viewing frustum with its image output. The checkerboard shows board pose in 3D alongside corner residuals. The fusion experiment shows target planes at multiple depths alongside their projections.

## Teaching sequence

The 30-slide deck is designed for approximately 80–90 minutes with discussion and all five demonstrations. For 75 minutes, shorten the checkerboard fitting activity and the final fusion-level discussion. The slides include speaker notes, worked examples, and source links.

| Slides | Topic | Approximate time |
|---|---|---:|
| 1–8 | Fusion motivation, frames, links, transforms, robot arm | 23 min |
| 9–13 | Projection, intrinsics, FOV, distortion, image changes | 15 min |
| 14–18 | LiDAR range, FOV, density, calibration categories | 15 min |
| 19–22 | Checkerboards and camera–LiDAR calibration | 13 min |
| 23–26 | Projection chain, worked example, alignment, timing | 14 min |
| 27–30 | Visibility, uncertainty, fusion levels, exit ticket | 8 min |

## Experiment 1: Robot arm

Each link frame sits at its distal end. Its x axis follows the link; y points 90 degrees counterclockwise. The orange point is the hand. Base and link axes appear simultaneously. The **Inspect transform** selector shows a link's local matrix and its cumulative transform into the base frame.

Add rotary, sliding, and fixed segments using the buttons. The simulator permits 1–8 links. Changing a parent joint affects every descendant. A sliding joint extends along its mounted local x direction.

Use column vectors and the convention `T_AB` maps coordinates **from B into A**:

```
T_previous,current = Rot(theta) Trans_x(length + extension)
T_base,hand = T_01 T_12 ... T_(n-1),n
p_base = T_base,hand [0, 0, 1]^T
```

For rotary joints, extension is zero and theta is the variable angle. Fixed and sliding segments use a fixed mount angle. These are planar 3×3 homogeneous transforms. In 3D, the corresponding transforms are 4×4.

**Prediction:** set two 1 m links to 90° and −90°. The hand is **(1,1) m**, with 0° orientation. Another solution is 0° and 90°, with 90° orientation. A 1 m base link followed by a 1 m slider with 1 m extension, all along the first link's 90° direction, ends at **(0,3) m**.

Model limits: kinematics only; no motor dynamics, gravity, collisions, or inverse-kinematics solver. Slider ranges are teaching controls rather than physical joint limits.

## Experiment 2: Camera intrinsics

An 800×500 synthetic street image updates when you change fx, fy, cx, cy, or k1. Camera pose and scene geometry remain fixed. The red cross marks the principal point.

```
u = fx X/Z + cx
v = fy Y/Z + cy
```

The initial values are `fx=fy=600`, `cx=400`, `cy=250` pixels. `(X,Y,Z)=(1,0,10)` m projects to **(460,250) px**. After doubling both focal lengths, it projects to **(520,250) px**.

- Doubling both focal lengths increases magnification and narrows FOV.
- Changing cx translates ideal pixel locations horizontally, without changing object size.
- Changing only fx changes horizontal scale.
- Changing k1 bends otherwise straight lines using a one-term radial model.

For a centred, undistorted pinhole camera, `horizontal FOV = 2 atan(W/(2 fx))`. The initial horizontal FOV is **67.38°**, falling to **36.87°** at fx=1200. For an off-centre principal point, the display uses `atan(cx/fx)+atan((W−cx)/fx)`. The reported FOV excludes distortion.

In a real camera, editing calibration metadata alone does not change captured pixels. Lens changes and image resampling can change the image. After uniform resizing by s, scale fx, fy, cx, and cy by s. After cropping at pixel offset `(x0,y0)`, subtract that offset from `(cx,cy)`. Exact resampling conventions can introduce pixel-centre details beyond this introductory model.

## Experiment 3: LiDAR sampling

The primary view shows the complete 3D scene and point cloud. Expand the diagnostics for elevation and top views. Rays intersect a flat ground plane and the surrounding obstacle surfaces. The return counter measures valid nearest returns, not just emitted beams.

Controls include upper and lower elevation, vertical channel count, azimuth step, sensor height, minimum range, and maximum range. Horizontal coverage is fixed at 360°. All beam elevations are uniformly spaced in this model.

```
x = r cos(elevation) cos(azimuth)
y = r cos(elevation) sin(azimuth)
z = r sin(elevation)
```

Sensor height adds an offset to world z. At height h, the lowest downward beam intersects unobstructed flat ground at `h/tan(abs(lower elevation))`.

**Predictions:** at h=1.8 m, a −25° lower limit reaches the ground at **3.86 m**. A −5° limit reaches it at **20.57 m**. Increasing channels at fixed FOV decreases angular spacing. Increasing FOV at fixed channels increases spacing. A larger azimuth step can skip small objects.

These are settings for a hypothetical sensor. Real devices may have fixed channel counts, nonuniform beam patterns, beam-origin corrections, intensity/reflectivity effects, multiple returns, noise, and scan motion. None of those effects is simulated. A ray blocked by an object inside the minimum range does not see through it to the next surface.

## Experiment 4: Checkerboard correspondences

The board has **9×6 inner corners**, **10×7 squares**, and 0.20 m square spacing. Orange dots are observed corners. Blue rings are model predictions. Connecting segments are residuals. The displayed RMS is `sqrt(mean(du²+dv²))`, in pixels per corner.

Change focal length and principal point to reduce residuals, then choose **Fit K to visible corners**. The noise-free fit recovers **fx=fy=800, cx=410, cy=245 px**. Change board yaw, pitch, and distance to see how the same board appears in different views.

This is deliberately a **simplified least-squares problem**: board poses are known, fx equals fy, and distortion is zero. The fit solves for one shared focal length and two principal-point coordinates. It is not OpenCV's full calibration algorithm.

A real camera-calibration workflow estimates K, distortion, and unknown board poses from multiple diverse views. Use a flat rigid target, known square dimensions, sharp corners, varied tilt, and image-edge coverage. Validate on new views. The origin in the lesson's board equation is the first inner corner. The renderer uses an equivalent centred-board representation with the corresponding translation.

For camera–LiDAR extrinsic calibration, the camera sees printed corners while LiDAR typically measures board plane/edge geometry. Do not assume that each printed inner corner creates a LiDAR return. Multiple target poses constrain the fixed sensor transform. A plane normal and offset from one pose alone do not fully determine all six extrinsic degrees of freedom.

## Experiment 5: Fusion alignment and timing

Three synthetic target point planes at depths 10, 20, and 35 m demonstrate error patterns. These target planes are independent of the background street drawing. Orange points use the reference transform. Blue points use the perturbed transform. The app does not run a detector or data-association algorithm.

Use **Introduce a fault**, then change yaw, translation, and time offset one at a time. Reset restores exact alignment.

The nominal geometry is a LiDAR frame at ground level with x forward, y left, z up, and a camera 1.5 m above it:

```
X_camera = -Y_lidar
Y_camera = 1.5 - Z_lidar
Z_camera = X_lidar
```

Thus `(10,−1,0.5)` m becomes `(1,1,10)` m in the camera frame and **(460,310) px** at the baseline K.

The yaw control rotates the LiDAR coordinates before optical-axis conversion. The translation control adds an optical-X offset. Time offset shifts each target laterally at a constant speed. At 10 m/s and 100 ms, lateral displacement is **1 m**. At 10 m depth and fx=600, that becomes **60 px** of horizontal error.

Angular errors have roughly depth-independent pixel effects near the optical axis; translation errors grow for nearby points. The simulation assumes constant target motion and no ego-motion. Real systems need clock alignment, motion compensation, scan deskewing, visibility handling, and association.

## Additional discussion

- **Visibility:** points inside the image may be behind another surface. A 2D box may include background returns.
- **Uncertainty:** inverse-variance fusion assumes the same quantity, unbiased estimates, and correctly handled correlations. Shared calibration errors can make naive fusion overconfident.
- **Fusion level:** measurements, learned features, or tracks can be combined, but each approach still needs meaningful geometry and timing.

## Primary references

- [Modern Robotics: homogeneous transforms](https://modernrobotics.northwestern.edu/nu-gm-book-resource/3-3-1-homogeneous-transformation-matrices/)
- [ROS REP 103: units and coordinate conventions](https://raw.githubusercontent.com/ros-infrastructure/rep/master/rep-0103.rst)
- [OpenCV: projection and camera models](https://docs.opencv.org/4.13.0/d9/d0c/group__calib3d.html)
- [OpenCV: checkerboard camera calibration](https://docs.opencv.org/4.10.0/dc/dbb/tutorial_py_calibration.html)
- [Ouster: beam and sensor coordinate conversion](https://docs.ouster.com/sensor-docs/coordinate-system)
- [MathWorks: LiDAR–camera calibration](https://www.mathworks.com/help/lidar/ug/lidar-camera-calibration.html)

All scenes and numeric exercises are synthetic teaching examples, not recordings or measured sensor performance.

## Third-party renderer

The offline bundle includes Three.js r160 under the MIT license. The license is in `vendor/THREE-LICENSE.txt`. Source: https://github.com/mrdoob/three.js/tree/r160 .

### Channel count and perception at range
The prominent LiDAR density panel provides 2–128 channels and quick 8/16/32/64/128 buttons. The channel count and horizontal angular step control both the surround scan and the range comparison. Compare identical 0.6 × 1.8 m front-facing targets at 10, 30, and 60 m, independently without clutter or occlusion. Each panel shows exact sampled intersections, total points, and channels that hit, at the same physical scale. Default maximum range is 80 m. Start at 8 channels, then 32 and 128 while holding FOV and horizontal step fixed; next change horizontal step. Counts can jump due to discrete beam alignment. A return count is evidence available to perception, not a detection probability or guaranteed recognition. The approximate vertical gap r tan(Δφ) is a near-horizontal illustration; actual hits use ray geometry and slant-range limits.

## Published course materials

- [Live Sensor Fusion demos](https://croquembouche.github.io/Intro2AV-CourseContent/sensor-fusion/)
- [Lecture 4 PowerPoint](https://croquembouche.github.io/Intro2AV-CourseContent/downloads/Lecture%204%20Sensor%20Fusion%20for%20Autonomous%20Driving.pptx)
- [Complete offline package](https://croquembouche.github.io/Intro2AV-CourseContent/downloads/Lecture4_SensorFusion.zip)
- [Neural Vision demos](https://croquembouche.github.io/Intro2AV-CourseContent/)
