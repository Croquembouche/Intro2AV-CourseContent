#!/usr/bin/env python3
"""Play a bag on an isolated ROS domain and verify actual subscriber delivery."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time
import rclpy
from rclpy.qos import QoSProfile, ReliabilityPolicy
from sensor_msgs.msg import Image, CameraInfo, PointCloud2
from tf2_msgs.msg import TFMessage
from rosgraph_msgs.msg import Clock
from rclpy.parameter import Parameter
from rclpy.time import Time
from tf2_ros import Buffer


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('bag', type=Path)
    a = p.parse_args()
    rclpy.init()
    node = rclpy.create_node('project1_playback_validation', parameter_overrides=[Parameter('use_sim_time',value=True)])
    tf_buffer = Buffer()
    tf_checks = []
    clock_stamps = []
    counts, stamps, children = {}, {}, set()
    topics = {'/camera/front/image_raw': Image, '/camera/front/camera_info': CameraInfo,
              '/lidar/roof/points': PointCloud2, '/tf': TFMessage, '/clock': Clock}
    def callback(topic, msg):
        counts[topic] = counts.get(topic, 0) + 1
        if hasattr(msg, 'header'):
            assert msg.header.frame_id == ('top_lidar' if topic == '/lidar/roof/points' else 'front_camera')
            stamps.setdefault(topic, []).append(msg.header.stamp.sec*10**9+msg.header.stamp.nanosec)
        if topic == '/tf':
            children.update(t.child_frame_id for t in msg.transforms)
            for transform in msg.transforms:
                tf_buffer.set_transform(transform,'project1_bag')
            stamp=msg.transforms[0].header.stamp
            result=tf_buffer.lookup_transform('front_camera','top_lidar',Time.from_msg(stamp))
            assert result.header.frame_id=='front_camera' and result.child_frame_id=='top_lidar'
            tf_checks.append(stamp.sec*10**9+stamp.nanosec)
        if topic == '/clock':
            ns=msg.clock.sec*10**9+msg.clock.nanosec
            assert not clock_stamps or ns>clock_stamps[-1]
            clock_stamps.append(ns)
    qos = QoSProfile(depth=100, reliability=ReliabilityPolicy.RELIABLE)
    subscriptions = [node.create_subscription(typ, topic, lambda msg,t=topic: callback(t,msg), qos) for topic,typ in topics.items()]
    logfile = a.bag.parent / 'playback.log'
    with logfile.open('w') as log:
        proc = subprocess.Popen(['ros2','bag','play',str(a.bag),'--disable-keyboard-controls','--delay','3','--wait-for-all-acked','5000'],stdout=log,stderr=subprocess.STDOUT)
        deadline = time.monotonic()+120
        try:
            while proc.poll() is None and time.monotonic()<deadline:
                rclpy.spin_once(node,timeout_sec=.1)
            if proc.poll() is None:
                raise TimeoutError('Playback did not finish')
            for _ in range(10):
                rclpy.spin_once(node,timeout_sec=.1)
            assert proc.returncode == 0
            expected = json.loads((a.bag.parent/'validation.json').read_text())['counts']
            assert counts == expected, (counts,expected)
            assert stamps['/camera/front/image_raw'] == stamps['/camera/front/camera_info'] == stamps['/lidar/roof/points']
            assert {'base_link','front_camera_mount','front_camera','top_lidar'} <= children
            assert tf_checks == stamps['/lidar/roof/points'] == clock_stamps
            report = {'status':'passed','ros_distro':os.environ.get('ROS_DISTRO'),'received_counts':counts,
                      'tf_lookups_passed':len(tf_checks),'clock_monotonic':True,'header_frames_verified':True,'tf_children':sorted(children),'player_exit_code':proc.returncode}
            (a.bag.parent/'playback_validation.json').write_text(json.dumps(report,indent=2))
            print(json.dumps(report,indent=2))
        finally:
            if proc.poll() is None:
                proc.terminate()
                proc.wait(timeout=10)
            node.destroy_node()
            rclpy.shutdown()


if __name__ == '__main__':
    main()
