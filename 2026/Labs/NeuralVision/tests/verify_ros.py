#!/usr/bin/env python3
"""Exercise the real ROS graph and optional rosbag replay; no mock inference."""
import argparse
import json
import signal
import subprocess
import time
import uuid
from pathlib import Path
from urllib.request import urlopen
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from neural_vision_common.inference import image_id
from std_msgs.msg import String


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:8773')
    parser.add_argument('--bag-dir',type=Path,help='Optional NEW directory in which to record/replay a real rosbag')
    args=parser.parse_args()
    def get(path):
        with urlopen(args.url+path,timeout=5) as response: return json.load(response)
    meta=get('/api/meta'); initial=get('/api/state')
    assert all(initial['nodes'].values()), 'Launch all three model nodes first'
    rclpy.init(); node=Node('neural_vision_integration_probe')
    received={}; counts={}
    def callback(msg):
        result=json.loads(msg.data)
        received.setdefault(result['input_id'],{})[result['model']]=result
        counts[result['input_id']]=counts.get(result['input_id'],0)+1
    subs=[node.create_subscription(String,f'/neural_demo/{name}/prediction',callback,10) for name in ('mlp','cnn','transformer')]
    pub=node.create_publisher(Image,'/neural_demo/input',10)
    recorder=None
    def spin_for(seconds):
        end=time.monotonic()+seconds
        while time.monotonic()<end: rclpy.spin_once(node,timeout_sec=.05)
    def await_three(key):
        end=time.monotonic()+8
        while len(received.get(key,{}))<3 and time.monotonic()<end: rclpy.spin_once(node,timeout_sec=.1)
        assert len(received.get(key,{}))==3, f'Missing ROS predictions for {key}'
    def image(sample):
        msg=Image();msg.width=28;msg.height=28;msg.step=28;msg.encoding='mono8'
        msg.header.frame_id='probe-'+uuid.uuid4().hex;msg.header.stamp=node.get_clock().now().to_msg();msg.data=sample['pixels']
        return msg
    try:
        spin_for(1.5)
        if args.bag_dir:
            assert not args.bag_dir.exists(), 'Choose a new bag directory; existing recordings are preserved'
            recorder=subprocess.Popen(['ros2','bag','record','-o',str(args.bag_dir),'/neural_demo/input'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            spin_for(2)
            assert recorder.poll() is None,'rosbag recorder did not start'
        keys=[]
        for digit in [3,7,1]:
            msg=image(next(s for s in meta['samples'] if s['label']==digit))
            keys.append(image_id(msg));pub.publish(msg);await_three(keys[-1])
            print('ROS image',digit,'→',{k:v['prediction'] for k,v in received[keys[-1]].items()},flush=True)
            assert all(len(v['probabilities'])==10 and abs(sum(v['probabilities'])-1)<1e-4 for v in received[keys[-1]].values())
            end=time.monotonic()+5
            while time.monotonic()<end:
                state=get('/api/state')
                if state['input_id']==keys[-1] and len(state['results'])==3: break
                spin_for(.1)
            assert state['input_id']==keys[-1] and len(state['results'])==3,'ROS-published input did not reach the web bridge'
            assert state['pixels']==list(msg.data)
        # A malformed ROS Image must be rejected without killing a model.
        bad=image(meta['samples'][0]);bad.width=27;pub.publish(bad);spin_for(.3)
        assert image_id(bad) not in received
        good=image(meta['samples'][0]);pub.publish(good);await_three(image_id(good))
        if recorder:
            recorder.send_signal(signal.SIGINT);recorder.wait(timeout=10);recorder=None
            assert (args.bag_dir/'metadata.yaml').is_file()
            prior=counts[keys[0]]
            replay=subprocess.Popen(['ros2','bag','play',str(args.bag_dir)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            end=time.monotonic()+15
            while time.monotonic()<end and (replay.poll() is None or counts.get(keys[0],0)<prior+3): rclpy.spin_once(node,timeout_sec=.1)
            replay.wait(timeout=3)
            assert counts.get(keys[0],0)>=prior+3,'Recorded input did not generate fresh predictions during replay'
            print('PASS: real rosbag record and replay produced fresh predictions from all three nodes.',flush=True)
        print('PASS: ROS Image → three prediction topics → web subscriptions; malformed-image rejection and recovery.',flush=True)
    finally:
        if recorder:
            recorder.send_signal(signal.SIGINT);recorder.wait(timeout=10)
        node.destroy_node()
        if rclpy.ok(): rclpy.shutdown()

if __name__=='__main__': main()
