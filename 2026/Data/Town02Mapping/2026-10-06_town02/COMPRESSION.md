# Lossless compressed Town02 recording

The complete ROS 2 recording is in `rosbag2_zstd/`, with **Zstandard message compression**. Database size is **7.18 GiB**, down **52.1%** from the original 15.00 GiB. All **71,316 messages**, **18 topics**, **198.05 seconds**, sensor data, original timestamps, calibration, and ground truth are retained. Every decompressed CDR payload and timestamp was compared against the original using per-topic SHA-256; all matched. A short ROS 2 Humble DDS playback and sensor TF lookup check also passed.

```bash
source /opt/ros/humble/setup.bash
# Run from the extracted dataset directory:
ros2 bag info rosbag2_zstd
ros2 bag play rosbag2_zstd --rate 0.5 --read-ahead-queue-size 40
```

ROS decompresses individual messages during playback. The compressed bag does not need to be expanded into a 15 GiB database first. It uses the standard `rosbag2_compression_zstd` plugin, verified on this ROS 2 Humble installation. If a different installation reports that this plugin is missing, install `ros-humble-rosbag2-compression-zstd`.

`calibration.json` contains sensor intrinsics/extrinsics and the direct mapping transforms. `ground_truth_trajectory.tum`, `coverage_verified.json`, map/OpenDRIVE, creation settings, and the physical LiDAR profile are included. `compression_validation.json` and `compressed_playback_validation.json` document the compressed copy checks. `ORIGINAL_RECORDING_README.md`, source verification reports, and `source_recording_SHA256SUMS.txt` describe the original recording and its provenance. The original uncompressed bag is retained locally alongside this copy and is excluded from this smaller ZIP.

`SHA256SUMS` verifies the files in this compressed package. Run `sha256sum -c SHA256SUMS` after extraction. The ZIP stores the already compressed database without another compression pass and compresses its metadata/reference files.
