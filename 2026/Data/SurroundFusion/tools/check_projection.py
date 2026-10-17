#!/usr/bin/env python3
"""Inspect each mount with genuine simultaneous source samples, before async selection."""
import argparse,json
from pathlib import Path
import rosbag2_py,numpy as np
from rclpy.serialization import deserialize_message
from rosidl_runtime_py.utilities import get_message
from scipy.spatial.transform import Rotation
from PIL import Image,ImageDraw
NAMES=['front','front_left','rear_left','rear','rear_right','front_right']
def matrix(t):
 q=t.transform.rotation;v=t.transform.translation;m=np.eye(4);m[:3,:3]=Rotation.from_quat([q.x,q.y,q.z,q.w]).as_matrix();m[:3,3]=[v.x,v.y,v.z];return m
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output',type=Path);p.add_argument('--ego',type=int,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
r=rosbag2_py.SequentialReader();r.open(rosbag2_py.StorageOptions(uri=a.source,storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''));types={x.name:x.type for x in r.get_all_topics_and_types()};prefix=f'/carla/ego_{a.ego}';first={};t0=None
while r.has_next():
 topic,data,ts=r.read_next()
 if t0 is None:t0=ts
 if ts!=t0:break
 if topic.startswith(prefix) or topic=='/tf':first[topic]=deserialize_message(data,get_message(types[topic]))
tf={x.child_frame_id:matrix(x) for x in first['/tf'].transforms};ef=f'ego_{a.ego}';lidar=first[prefix+'/roof_lidar/points'];xyz=np.frombuffer(lidar.data,dtype='<f4').reshape(-1,4)[:,:3]
contact=Image.new('RGB',(1280,1200),'white');draw=ImageDraw.Draw(contact);report={}
for j,n in enumerate(NAMES):
 name=prefix+'/'+n+'_rgb';im=first[name+'/image'];info=first[name+'/camera_info'];rgb=Image.frombytes('RGBA',(im.width,im.height),bytes(im.data),'raw','BGRA').convert('RGB');d=ImageDraw.Draw(rgb)
 bc=tf[ef+'/'+n+'_rgb']@tf[ef+'/'+n+'_rgb_optical'];cl=np.linalg.inv(bc)@tf[ef+'/roof_lidar'];opt=(cl@np.column_stack((xyz,np.ones(len(xyz)))).T).T[:,:3];opt=opt[opt[:,2]>.1];k=np.array(info.k).reshape(3,3);uvz=opt@k.T;uv=uvz[:,:2]/uvz[:,2:];valid=(uv[:,0]>=0)&(uv[:,0]<im.width)&(uv[:,1]>=0)&(uv[:,1]<im.height);count=int(valid.sum());assert count>30,(n,count)
 for (u,v),point in zip(uv[valid],opt[valid]):
  frac=min(point[2]/50,1);d.ellipse((u-1,v-1,u+1,v+1),fill=(int(255*(1-frac)),int(255*frac),50))
 rgb.save(a.output/(n+'_projection.png'));x=(j%2)*640;y=(j//2)*400;contact.paste(rgb,(x,y+30));draw.text((x+10,y+8),f'{n} | {count} projected points',fill='black');report[n]={'projected_points':count,'optical_forward_in_base':bc[:3,2].tolist()}
contact.save(a.output/'projection_contact.jpg',quality=93);(a.output/'projection_validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
