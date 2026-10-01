# Lecture 6: Mapping

Open `index.html` directly for offline playback, or use the course website's `/mapping/` route. All image frames and calculation traces are included. Students need no NAS connection or installation.

The two modes use the same KITTI tracking sequence 0001, original frames 20–99. The visual mapper uses only camera images. The LiDAR mapper uses only range scans. Reference poses are not estimator inputs.

Visual mapping uses Shi-Tomasi detection, forward/backward Lucas-Kanade tracks, essential-matrix initialization, triangulation, and PnP RANSAC with pose refinement. Its coordinate scale is arbitrary. LiDAR mapping uses voxel sampling, PCA planarity, and robust point-to-plane ICP against a local map of eight preceding scans. Its coordinates are in meters.

Use Play, Previous, Next, or the frame slider. Toggle observations, matches, and map accumulation. Select a visual pose inlier to highlight its map landmark. Both the map and the current LiDAR scan use perspective 3D rendering. Drag to orbit horizontally and vertically; Shift-drag, right-drag, or choose Pan to move the camera target. Use the wheel or Zoom buttons to zoom. One touch rotates; two touches pan and pinch to zoom. Keyboard arrows rotate, Shift+arrows pan, +/− zoom, F fits the visible data, and R resets. Fit and Reset controls are available for each view. Camera settings remain in place during playback. The page replays precomputed estimator results; display controls do not rerun the estimators.

These are local odometry and mapping teaching traces. They omit bundle adjustment, loop closure, IMU integration, semantic dynamic-object filtering, and per-point LiDAR deskew. Low inlier residuals are not a trajectory-accuracy benchmark. Image colors indicate geometric use or rejection, not semantic motion labels. Relative time uses the nominal 10 Hz recording rate.

Data and derived data: [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/). KITTI attribution: Andreas Geiger, Philip Lenz, Raquel Urtasun, *Are we ready for Autonomous Driving? The KITTI Vision Benchmark Suite*, CVPR 2012. [KITTI website](https://www.cvlibs.net/datasets/kitti/).

Preparation code is in `tools/slides/lecture6/prepare_data.py`. The published excerpt contains resized/compressed image derivatives and computed traces, not the full NAS dataset.

The offline bundle includes Three.js r160 under the MIT license (`vendor/THREE-LICENSE.txt`), reused from the existing Sensor Fusion demo. Source: https://github.com/mrdoob/three.js/tree/r160 .
