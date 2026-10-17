#!/usr/bin/env python3
"""Audit body-height LiDAR support near known CARLA actors in raw sessions."""
import argparse,json,sqlite3
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from rclpy.serialization import deserialize_message
from sensor_msgs.msg import Image as RosImage,PointCloud2,CameraInfo
from tf2_msgs.msg import TFMessage
from scipy.spatial.transform import Rotation
from extract_ground_truth import rotation

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('session',type=Path);p.add_argument('--ego',type=int,required=True);p.add_argument('--actors',type=int,nargs='+',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
 states=[json.loads(x) for x in (a.session/'states.jsonl').open()];results=[]
 with sqlite3.connect(next((a.session/'rosbag2').glob('*.db3'))) as db:
  topics=dict(db.execute('select name,id from topics'))
  for index,s in enumerate(states):
   ts=round(s['time']*1e9)
   def read(topic,cls):return deserialize_message(db.execute('select data from messages where topic_id=? and timestamp=?',(topics[topic],ts)).fetchone()[0],cls)
   tf=read('/tf',TFMessage);matrices={}
   for t in tf.transforms:
    q=t.transform.rotation;v=t.transform.translation;m=np.eye(4);m[:3,:3]=Rotation.from_quat([q.x,q.y,q.z,q.w]).as_matrix();m[:3,3]=[v.x,v.y,v.z];matrices[t.child_frame_id]=m
   cloud=read(f'/carla/ego_{a.ego}/roof_lidar/points',PointCloud2)
   xyz=np.frombuffer(cloud.data,dtype='<f4').reshape(-1,4)[:,:3];base=(np.c_[xyz,np.ones(len(xyz))]@matrices[f'ego_{a.ego}/roof_lidar'].T)[:,:3]
   ego=next(o for o in s['actors'] if o['id']==a.ego);erot=rotation(ego['pose']);ep=np.array([ego['pose'][k] for k in ('x','y','z')])
   if index==len(states)//2:
    msg=read(f'/carla/ego_{a.ego}/front_rgb/image',RosImage);im=Image.frombytes('RGBA',(msg.width,msg.height),bytes(msg.data),'raw','BGRA').convert('RGB');im.save(a.output/'camera.png');draw=ImageDraw.Draw(im)
    cam=np.linalg.inv(matrices[f'ego_{a.ego}/front_rgb']@matrices[f'ego_{a.ego}/front_rgb_optical']);opt=(np.c_[base,np.ones(len(base))]@cam.T)[:,:3];k=np.array(read(f'/carla/ego_{a.ego}/front_rgb/camera_info',CameraInfo).k).reshape(3,3);projected=opt@k.T;uv=projected[:,:2]/np.where(abs(projected[:,2:])>1e-8,projected[:,2:],np.nan)
   for aid in a.actors:
    actor=next(o for o in s['actors'] if o['id']==aid);ap=(np.array([actor['pose'][k] for k in ('x','y','z')])-ep)@erot*[1,-1,1]
    extent=actor['extent'];radius=np.hypot(extent['x'],extent['y'])+.5
    near=np.hypot(base[:,0]-ap[0],base[:,1]-ap[1])<=radius
    body=near&(base[:,2]>ap[2]+.25)&(base[:,2]<ap[2]+2*extent['z']+.25)
    row={'frame':s['frame'],'stamp_ns':ts,'actor_id':aid,'type':actor['type'],'actor_origin_base':ap.tolist(),'near_planar_points':int(near.sum()),'body_height_candidate_points':int(body.sum())};results.append(row)
    if index==len(states)//2:
     for (u,v),depth in zip(uv[body],opt[body,2]):
      if depth>0 and 0<=u<msg.width and 0<=v<msg.height:draw.ellipse((u-1,v-1,u+1,v+1),fill='#00ff88')
   if index==len(states)//2:im.save(a.output/'body_support.png')
 (a.output/'audit.json').write_text(json.dumps(results,indent=2))
 for aid in a.actors:
  rows=[r for r in results if r['actor_id']==aid];n=[r['body_height_candidate_points'] for r in rows];print(aid,'body-height candidates min/max',min(n),max(n),'middle pose',rows[len(rows)//2]['actor_origin_base'])
if __name__=='__main__':main()
