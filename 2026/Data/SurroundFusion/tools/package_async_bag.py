#!/usr/bin/env python3
"""Build asynchronous streams by selecting real source samples without retimestamping."""
import argparse,collections,hashlib,json,sqlite3
from pathlib import Path
import numpy as np
import rosbag2_py
from rclpy.serialization import deserialize_message,serialize_message
from rosidl_runtime_py.utilities import get_message
from PIL import Image,ImageDraw,ImageFont
from scipy.spatial.transform import Rotation
NAMES=['front','front_left','rear_left','rear','rear_right','front_right']
def main():
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);p.add_argument('--ego',type=int,required=True);a=p.parse_args()
 assert not a.output.exists(),a.output
 reader=rosbag2_py.SequentialReader();reader.open(rosbag2_py.StorageOptions(uri=str(a.source),storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''))
 types={x.name:x.type for x in reader.get_all_topics_and_types()};prefix=f'/carla/ego_{a.ego}';ef=f'ego_{a.ego}'
 names={'/tf':'/tf','/clock':'/clock',prefix+'/odometry':'/ego/odometry',prefix+'/roof_lidar/points':'/lidar/roof/points'}
 frames={ef:'base_link',ef+'/roof_lidar':'top_lidar'}
 for n in NAMES:
  names[prefix+'/'+n+'_rgb/image']='/camera/'+n+'/image_raw';names[prefix+'/'+n+'_rgb/camera_info']='/camera/'+n+'/camera_info'
  frames[ef+'/'+n+'_rgb']=n+'_camera_mount';frames[ef+'/'+n+'_rgb_optical']=n+'_camera'
 assert not(set(names)-set(types)),set(names)-set(types)
 # Build deterministic schedules on odd source frames. LiDAR keeps even frames.
 # Intervals of 100 or 200 ms give camera jitter without false header timestamps.
 schedule={};profiles=[.5,.75,.4,.6,.7,.3]
 for j,n in enumerate(NAMES):
  rng=np.random.default_rng(20260914+j);indices=set();i=1+2*j
  while i<100000:indices.add(i);i+=2 if rng.random()<profiles[j] else 4
  schedule[n]=indices
 writer=rosbag2_py.SequentialWriter();writer.open(rosbag2_py.StorageOptions(uri=str(a.output),storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''))
 for src,dst in names.items():writer.create_topic(rosbag2_py.TopicMetadata(name=dst,type=types[src],serialization_format='cdr'))
 clocks=[];base=None;stamps=collections.defaultdict(list);counts=collections.Counter();first={};last={};pc=[];azimuth_min=[];poses=[];retained_hash=hashlib.sha256();source_counts=collections.Counter()
 while reader.has_next():
  topic,data,ts=reader.read_next()
  if topic not in names:continue
  msg=deserialize_message(data,get_message(types[topic]));source_counts[topic]+=1
  if base is None:base=ts
  idx=round((ts-base)/50_000_000)
  assert abs(ts-base-idx*50_000_000)<2000,(ts,base,idx)
  dst=names[topic]
  if '/camera/' in dst:
   n=dst.split('/')[2]
   if idx not in schedule[n]:continue
  elif dst=='/lidar/roof/points' and idx%2:continue
  if hasattr(msg,'header'):
   hs=msg.header.stamp.sec*10**9+msg.header.stamp.nanosec;assert hs==ts,(topic,hs,ts)
   stamps[dst].append(hs);msg.header.frame_id=frames.get(msg.header.frame_id,msg.header.frame_id)
  if dst=='/tf':
   msg.transforms=[t for t in msg.transforms if t.child_frame_id in frames]
   assert len(msg.transforms)==14,len(msg.transforms)
   for t in msg.transforms:t.header.frame_id=frames.get(t.header.frame_id,t.header.frame_id);t.child_frame_id=frames[t.child_frame_id]
  elif dst=='/ego/odometry':
   msg.child_frame_id='base_link';q=msg.pose.pose.position;poses.append([ts,q.x,q.y,q.z])
  elif dst=='/clock':clocks.append(ts)
  elif dst=='/lidar/roof/points':
   assert msg.point_step==16 and msg.width>0 and msg.row_step==len(msg.data)
   xyz=np.frombuffer(msg.data,dtype='<f4').reshape(-1,4);assert np.isfinite(xyz).all();pc.append(len(xyz));sectors=np.histogram(np.arctan2(xyz[:,1],xyz[:,0]),bins=36,range=(-np.pi,np.pi))[0];azimuth_min.append(int(sectors.min()));assert sectors.min()>0,'Incomplete azimuth coverage'
  elif dst.endswith('/image_raw'):
   assert msg.encoding=='bgra8' and len(msg.data)==msg.height*msg.step
  # Digest retained payloads before frame-name-only reserialization for audit.
  retained_hash.update(topic.encode()+str(ts).encode()+data)
  first.setdefault(dst,msg);last[dst]=msg
  writer.write(dst,serialize_message(msg),ts);counts[dst]+=1
 del writer
 assert len(clocks)>1000,'Capture shorter than approximately one minute'
 lidar=np.array(stamps['/lidar/roof/points']);report={'status':'passed','counts':dict(counts),'source_counts':dict(source_counts),'duration_seconds':(clocks[-1]-clocks[0])/1e9,'asynchrony_method':'Deterministic staggered selection of genuine 20 Hz source frames. Headers and retained sensor payloads preserve acquisition time and data. No clock offsets or drift are injected.','source_retained_digest':retained_hash.hexdigest(),'cameras':{},'lidar_scan_points':{'min':min(pc),'max':max(pc),'median':float(np.median(pc)),'minimum_returns_in_any_10deg_sector':min(azimuth_min)}}
 sets=[]
 for n in NAMES:
  ts=np.array(stamps['/camera/'+n+'/image_raw']);assert ts.tolist()==stamps['/camera/'+n+'/camera_info'];assert np.all(np.diff(ts)>0)
  nearest=np.min(np.abs(ts[:,None]-lidar[None,:]),axis=1)/1e6
  assert nearest.min()>49.9 and nearest.max()<150.1
  sets.append(set(ts.tolist()))
  report['cameras'][n]={'images':len(ts),'effective_hz':float((len(ts)-1)/((ts[-1]-ts[0])/1e9)),'interval_ms_min':float(np.min(np.diff(ts))/1e6),'interval_ms_max':float(np.max(np.diff(ts))/1e6),'nearest_lidar_skew_ms_min':float(nearest.min()),'nearest_lidar_skew_ms_max':float(nearest.max()),'exact_lidar_matches':len(set(ts.tolist())&set(lidar.tolist()))}
 assert all(sets[i]!=sets[j] for i in range(6) for j in range(i))
 pos=np.array(poses);ds=np.linalg.norm(np.diff(pos[:,1:],axis=0),axis=1);dt=np.diff(pos[:,0])/1e9
 report['ego_distance_m']=float(ds.sum());report['moving_fraction']=float(dt[ds/dt>.2].sum()/dt.sum());assert report['ego_distance_m']>100,'Insufficient ego motion'
 report['lidar_hz']=float(1e9/np.median(np.diff(lidar)));report['all_six_camera_common_timestamps']=len(set.intersection(*sets))
 out=a.output.parent;(out/'validation.json').write_text(json.dumps(report,indent=2))
 tf={t.child_frame_id:t for t in first['/tf'].transforms}
 def mat(t):
  q=t.transform.rotation;v=t.transform.translation;m=np.eye(4);m[:3,:3]=Rotation.from_quat([q.x,q.y,q.z,q.w]).as_matrix();m[:3,3]=[v.x,v.y,v.z];return m
 calibration={'conventions':'base_link and top_lidar: x forward y left z up. Cameras optical: x right y down z forward. Metres.','T_base_from_lidar':mat(tf['top_lidar']).tolist(),'cameras':{}}
 contact=Image.new('RGB',(1280,3*400),'white');draw=ImageDraw.Draw(contact)
 for j,n in enumerate(NAMES):
  im=last['/camera/'+n+'/image_raw'];rgb=Image.frombytes('RGBA',(im.width,im.height),bytes(im.data),'raw','BGRA').convert('RGB');rgb.save(out/(n+'_preview.png'))
  x=(j%2)*640;y=(j//2)*400;contact.paste(rgb,(x,y+30));draw.text((x+10,y+5),n+' | final retained sample',fill='black',font=ImageFont.truetype('DejaVuSans.ttf',18))
  info=first['/camera/'+n+'/camera_info'];m=mat(tf[n+'_camera_mount'])@mat(tf[n+'_camera']);calibration['cameras'][n]={'K':list(info.k),'T_base_from_camera_optical':m.tolist(),'width':im.width,'height':im.height}
 contact.save(out/'surround_preview.jpg',quality=90);(out/'calibration.json').write_text(json.dumps(calibration,indent=2))
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
