#!/usr/bin/env python3
"""Verify complete asynchronous input delivery and cross-time TF queries in ROS 2 Humble."""
import argparse,json,os,subprocess,time,collections
from pathlib import Path
import rclpy
from rclpy.qos import QoSProfile,ReliabilityPolicy
from rclpy.time import Time
from rclpy.duration import Duration
from rclpy.parameter import Parameter
from rosidl_runtime_py.utilities import get_message
from tf2_ros import Buffer
import rosbag2_py
NAMES=['front','front_left','rear_left','rear','rear_right','front_right']
def main():
 p=argparse.ArgumentParser();p.add_argument('bag',type=Path);a=p.parse_args()
 reader=rosbag2_py.SequentialReader();reader.open(rosbag2_py.StorageOptions(uri=str(a.bag),storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''))
 topics={x.name:x.type for x in reader.get_all_topics_and_types()};del reader
 expected=json.loads((a.bag.parent/'validation.json').read_text())['counts']
 rclpy.init();node=rclpy.create_node('surround_playback_check',parameter_overrides=[Parameter('use_sim_time',value=True)])
 buf=Buffer(cache_time=Duration(seconds=180));counts=collections.Counter();stamps=collections.defaultdict(list);tfstamps=[];clocks=[]
 def callback(topic,msg):
  counts[topic]+=1
  if hasattr(msg,'header'):
   ns=msg.header.stamp.sec*10**9+msg.header.stamp.nanosec
   assert not stamps[topic] or ns>stamps[topic][-1]
   stamps[topic].append(ns)
   frame='map' if topic=='/ego/odometry' else 'top_lidar' if topic=='/lidar/roof/points' else topic.split('/')[2]+'_camera'
   assert msg.header.frame_id==frame,(topic,msg.header.frame_id,frame)
  if topic=='/tf':
   for t in msg.transforms:buf.set_transform(t,'surround_bag')
   t=msg.transforms[0].header.stamp;tfstamps.append(t.sec*10**9+t.nanosec)
  if topic=='/clock':
   ns=msg.clock.sec*10**9+msg.clock.nanosec;assert not clocks or ns>clocks[-1];clocks.append(ns)
 qos=QoSProfile(depth=300,reliability=ReliabilityPolicy.RELIABLE)
 subs=[node.create_subscription(get_message(typ),topic,lambda m,t=topic:callback(t,m),qos) for topic,typ in topics.items()]
 with (a.bag.parent/'playback.log').open('w') as log:
  proc=subprocess.Popen(['ros2','bag','play',str(a.bag),'--rate','0.5','--disable-keyboard-controls','--delay','3','--wait-for-all-acked','5000'],stdout=log,stderr=subprocess.STDOUT)
  try:
   deadline=time.monotonic()+240
   while proc.poll() is None and time.monotonic()<deadline:rclpy.spin_once(node,timeout_sec=.1)
   assert proc.poll()==0,'Player failed or timed out'
   for _ in range(20):rclpy.spin_once(node,timeout_sec=.1)
   assert dict(counts)==expected,(dict(counts),expected)
   assert tfstamps==clocks==stamps['/ego/odometry']
   lidar=stamps['/lidar/roof/points'];checks=0
   for n in NAMES:
    ts=stamps['/camera/'+n+'/image_raw'];assert ts==stamps['/camera/'+n+'/camera_info'];assert not set(ts)&set(lidar)
    for ns in ts[::30]:
     target=min(lidar,key=lambda v:abs(v-ns))
     result=buf.lookup_transform_full('base_link',Time(nanoseconds=target),n+'_camera',Time(nanoseconds=ns),'map')
     assert result.child_frame_id==n+'_camera';checks+=1
   report={'status':'passed','ros_distro':os.environ.get('ROS_DISTRO'),'received_counts':dict(counts),'all_messages_received':True,'monotonic_clock':True,'header_frames_verified':True,'cross_time_tf_lookups':checks,'camera_lidar_exact_timestamp_matches':0,'player_exit_code':proc.returncode,'playback_rate':.5}
   (a.bag.parent/'playback_validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
  finally:
   if proc.poll() is None:proc.terminate();proc.wait(timeout=10)
   node.destroy_node();rclpy.shutdown()
if __name__=='__main__':main()
