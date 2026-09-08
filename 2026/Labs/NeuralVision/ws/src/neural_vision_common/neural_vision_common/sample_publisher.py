"""Publish an included MNIST sample without using the browser."""
import json
import time
from pathlib import Path
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from .inference import image_id
from ament_index_python.packages import get_package_share_directory

def main(args=None):
    rclpy.init(args=args); node=Node('digit_sample_publisher')
    try:
        node.declare_parameter('digit',7); node.declare_parameter('variant',0)
        digit=node.get_parameter('digit').value; variant=node.get_parameter('variant').value
        if type(digit) is not int or type(variant) is not int or not 0<=digit<=9 or not 0<=variant<=2:
            raise ValueError('digit must be 0–9; variant must be 0–2')
        samples=json.loads((Path(get_package_share_directory('neural_vision_common'))/'models/samples.json').read_text())
        sample=[s for s in samples if s['label']==digit][variant]
        pub=node.create_publisher(Image,'/neural_demo/input',10)
        end=time.monotonic()+1.5
        while time.monotonic()<end: rclpy.spin_once(node,timeout_sec=.1)
        if pub.get_subscription_count()==0:
            node.get_logger().warning('No subscribers discovered. Launch a model in the same ROS domain.')
        msg=Image(); msg.header.frame_id='mnist_sample'
        msg.header.stamp=node.get_clock().now().to_msg()
        msg.width=28; msg.height=28; msg.step=28; msg.encoding='mono8'; msg.data=sample['pixels']
        pub.publish(msg)
        node.get_logger().info(f'Published digit {digit}, variant {variant}, input_id={image_id(msg)}')
        end=time.monotonic()+.5
        while time.monotonic()<end: rclpy.spin_once(node,timeout_sec=.1)
    finally:
        node.destroy_node()
        if rclpy.ok(): rclpy.shutdown()
