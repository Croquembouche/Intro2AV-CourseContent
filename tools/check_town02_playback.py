#!/usr/bin/env python3
"""Play a short prefix in an isolated ROS domain and verify sensor delivery and TF."""
import argparse
import json
from pathlib import Path
import signal
import subprocess
import time
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from rclpy.time import Time
from rosgraph_msgs.msg import Clock
from sensor_msgs.msg import CameraInfo, Image, Imu, NavSatFix, PointCloud2
from tf2_ros import Buffer, TransformListener


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--bag-name', default='rosbag2')
    parser.add_argument('--report-name', default='playback_validation.json')
    parser.add_argument('--console-name', default='playback_console.log')
    args = parser.parse_args()
    root = args.root.resolve()
    config = json.loads((root / 'configuration.json').read_text())
    ego = next(a for a in config['actors'] if a['role'] == 'ego')['id']
    prefix = f'/carla/ego_{ego}'
    required = {
        '/clock': Clock, prefix + '/front_rgb/image': Image,
        prefix + '/front_rgb/camera_info': CameraInfo,
        prefix + '/roof_lidar/points': PointCloud2,
        prefix + '/imu/data': Imu, prefix + '/gnss/data': NavSatFix}
    rclpy.init()
    node = Node('town02_recording_playback_check')
    counts = {key: 0 for key in required}
    latest = {}
    subscriptions = []
    for name, cls in required.items():
        def callback(msg, topic=name):
            counts[topic] += 1
            latest[topic] = msg
        subscriptions.append(node.create_subscription(cls, name, callback, qos_profile_sensor_data))
    buffer = Buffer()
    listener = TransformListener(buffer, node)
    log = (root / args.console_name).open('w')
    process = subprocess.Popen(['ros2', 'bag', 'play', str(root / args.bag_name),
                                '--rate', '1.0', '--read-ahead-queue-size', '40'], stdout=log, stderr=subprocess.STDOUT)
    deadline = time.monotonic() + 35
    tf_ok = False
    try:
        while time.monotonic() < deadline and process.poll() is None:
            rclpy.spin_once(node, timeout_sec=.1)
            if min(counts.values()) < 20:
                continue
            try:
                for child in [f'ego_{ego}/roof_lidar', f'ego_{ego}/front_rgb_optical', f'ego_{ego}/imu', f'ego_{ego}/gnss']:
                    buffer.lookup_transform(f'ego_{ego}', child, Time())
                tf_ok = True
                break
            except Exception:
                pass
    finally:
        if process.poll() is None:
            process.send_signal(signal.SIGINT)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.terminate()
                process.wait(timeout=5)
        log.close()
        report = {'status': 'passed' if min(counts.values()) >= 20 and tf_ok else 'failed',
                  'received_messages': counts, 'sensor_transform_lookups_passed': tf_ok,
                  'scope': 'ROS 2 Humble DDS playback of a short recorded prefix in an isolated localhost domain; full storage/timestamps checked separately.'}
        (root / args.report_name).write_text(json.dumps(report, indent=2))
        print(json.dumps(report, indent=2))
        node.destroy_node()
        rclpy.shutdown()
    if report['status'] != 'passed':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
