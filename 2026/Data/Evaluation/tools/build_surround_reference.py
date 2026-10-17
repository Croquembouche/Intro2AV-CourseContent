"""Prepare candidates and actual asynchronous image evidence for visual review."""
import gzip,json,sqlite3,itertools
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from rclpy.serialization import deserialize_message
from sensor_msgs.msg import PointCloud2,Image as ImageMsg
ROOT=Path(__file__).resolve().parents[2]/'SurroundFusion'
OUT=ROOT/'instructor/evaluation_review'
cal=json.loads((ROOT/'calibration.json').read_text())
with gzip.open(ROOT/'instructor/ground_truth.jsonl.gz','rt') as f: gt={d['stamp_ns']:d for d in map(json.loads,f)}
c=sqlite3.connect(f'file:{ROOT}/bag/bag_0.db3?mode=ro',uri=True)
topics={name:tid for tid,name in c.execute('select id,name from topics')}
stamps={name:[r[0] for r in c.execute('select timestamp from messages where topic_id=? order by timestamp',(tid,))] for name,tid in topics.items()}
def get(name,ts,cls): return deserialize_message(c.execute('select data from messages where topic_id=? and timestamp=?',(topics[name],ts)).fetchone()[0],cls)
frames=[]
for index in range(20,601,40):
 ts=stamps['/lidar/roof/points'][index]; raw=get('/lidar/roof/points',ts,PointCloud2)
 xyz=np.frombuffer(raw.data,dtype='<f4').reshape(-1,4)[:,:3]; p=np.column_stack([xyz,np.ones(len(xyz))])@np.array(cal['T_base_from_lidar']).T
 objects=[]
 for o in gt[ts]['objects']:
  if o['class_name'] not in ['car','person']:continue
  o=dict(o);ex=np.array([o['half_extent'][k] for k in ['x','y','z']]); dist=np.hypot(o['x'],o['y'])
  local=p@np.linalg.inv(np.array(o['T_base_from_bbox_carla'])).T
  # Exclude ground-adjacent returns: lowest 20 cm above box bottom.
  mask=(np.abs(local[:,:3])<=ex+.1).all(axis=1)&(local[:,2]>-ex[2]+.2)
  o.update(range_m=float(dist),lidar_body_support=int(mask.sum()),eligibility='ignore',reason='outside_range_or_insufficient_body_support')
  if dist<=60 and mask.sum()>=5:o.update(eligibility='candidate',reason='pending_visual_review')
  objects.append(o)
 frame={'id':f'surround_{index:03d}','stamp_ns':ts,'objects':objects,'camera_evidence':{}}
 contact=Image.new('RGB',(1280,1200),'white');draw=ImageDraw.Draw(contact)
 for j,(name,cam) in enumerate(cal['cameras'].items()):
  topic='/camera/'+name+'/image_raw';its=min(stamps[topic],key=lambda x:abs(x-ts));im=get(topic,its,ImageMsg)
  rgb=Image.frombytes('RGBA',(im.width,im.height),bytes(im.data),'raw','BGRA').convert('RGB');d=ImageDraw.Draw(rgb)
  k=np.array(cam['K']).reshape(3,3);cb=np.linalg.inv(np.array(cam['T_base_from_camera_optical']))
  candidates={o['actor_id']:o for o in objects if o['eligibility']=='candidate'}
  visible=[]
  for actor in gt[its]['objects']:
   aid=actor['actor_id']
   if aid not in candidates:continue
   ex=np.array([actor['half_extent'][q] for q in ['x','y','z']]);corners=np.array(list(itertools.product([-1,1],repeat=3)))*ex
   opt=np.column_stack([corners,np.ones(8)])@(cb@np.array(actor['T_base_from_bbox_carla'])).T
   if np.any(opt[:,2]<=.1):continue
   uv=opt[:,:3]@k.T;uv=uv[:,:2]/uv[:,2:];lo=uv.min(axis=0);hi=uv.max(axis=0)
   if hi[0]<0 or lo[0]>=640 or hi[1]<0 or lo[1]>=360:continue
   lo=np.maximum(lo,[0,0]);hi=np.minimum(hi,[639,359]);d.rectangle((*lo,*hi),outline='yellow',width=2)
   d.text((lo[0],max(0,lo[1]-12)),f'{aid} {actor["class_name"]} n={candidates[aid]["lidar_body_support"]}',fill='yellow')
   visible.append(aid)
  frame['camera_evidence'][name]={'stamp_ns':its,'candidate_actor_ids_in_image':visible}
  rgb.save(OUT/f'{frame["id"]}_{name}.jpg',quality=94)
  x=j%2*640;y=j//2*400;contact.paste(rgb,(x,y+35));draw.text((x+8,y+8),f'{name} | camera {its/1e9:.3f} | lidar {ts/1e9:.3f}',fill='black')
 contact.save(OUT/f'{frame["id"]}.jpg',quality=94);frames.append(frame)
 print(frame['id'],[(o['actor_id'],o['class_name'],o['lidar_body_support']) for o in objects if o['eligibility']=='candidate'],flush=True)
(OUT/'candidates.json').write_text(json.dumps(frames,indent=2))
