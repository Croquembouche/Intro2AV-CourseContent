#!/usr/bin/env python3
"""Compare every exported image/cloud payload and timestamp against the source bag."""
import argparse,hashlib,json,sqlite3
from pathlib import Path
import rosbag2_py
from rclpy.serialization import deserialize_message
from rosidl_runtime_py.utilities import get_message
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output',type=Path);p.add_argument('--ego',type=int,required=True);a=p.parse_args()
def messages(path):
 r=rosbag2_py.SequentialReader();r.open(rosbag2_py.StorageOptions(uri=str(path),storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''));types={x.name:x.type for x in r.get_all_topics_and_types()}
 while r.has_next():
  topic,data,ts=r.read_next()
  if types[topic] in ['sensor_msgs/msg/Image','sensor_msgs/msg/PointCloud2']:yield topic,ts,deserialize_message(data,get_message(types[topic]))
def signature(m):
 info=[m.height,m.width,m.is_bigendian]
 if hasattr(m,'encoding'):info += [m.encoding,m.step]
 else:info += [m.point_step,m.row_step,m.is_dense,[(x.name,x.offset,x.datatype,x.count) for x in m.fields]]
 return hashlib.sha256(json.dumps(info,sort_keys=True).encode()+bytes(m.data)).hexdigest()
expected={}
for topic,ts,m in messages(a.output):
 assert m.header.stamp.sec*10**9+m.header.stamp.nanosec==ts
 expected[topic,ts]=signature(m)
matched=set();prefix=f'/carla/ego_{a.ego}/'
for topic,ts,m in messages(a.source):
 if not topic.startswith(prefix):continue
 if topic.endswith('/image'):dst='/camera/'+topic[len(prefix):].split('/')[0].removesuffix('_rgb')+'/image_raw'
 elif topic==prefix+'roof_lidar/points':dst='/lidar/roof/points'
 else:continue
 key=dst,ts
 if key in expected:
  assert m.header.stamp.sec*10**9+m.header.stamp.nanosec==ts
  assert signature(m)==expected[key],key
  matched.add(key)
assert len(matched)==len(expected) and matched
for db in a.output.glob('*.db3'):
 with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True) as c:assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
report={'status':'passed','images_and_clouds_compared':len(matched),'all_exported_sensor_timestamps_found_in_source':True,'all_exported_sensor_payloads_and_formats_equal_source':True,'sqlite_integrity':'ok'}
(a.output.parent/'instructor/payload_validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
