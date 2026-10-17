#!/usr/bin/env python3
import sys,json,itertools
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from finalize_visibility_review import lidar_support
import argparse
parser=argparse.ArgumentParser(description='Project full CARLA boxes to aid manual RGB/LiDAR review.');parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);root=parser.parse_args().root;out=root/'instructor/front_camera_evaluation';frames=json.loads((out/'candidate_frames.json').read_text());report={}
for f in frames:
 cal=json.loads((root/f['sequence']/'calibration.json').read_text());k=np.array(cal['camera_K']);camera_base=np.array(cal['T_camera_optical_from_lidar'])@np.linalg.inv(cal['T_base_from_lidar']);folder=out/'frames'/f['id'];p=np.load(folder/'points.npz');im=Image.open(folder/'camera.png');draw=ImageDraw.Draw(im);rows=[]
 for o in f['objects']:
  if o['class_name'] not in ('car','person') or o['range_m']>60 or not o.get('candidate_uv') or not(0<=o['candidate_uv'][0]<640 and 0<=o['candidate_uv'][1]<360):continue
  extent=np.array([o['half_extent'][j] for j in ('x','y','z')]);local=np.array(list(itertools.product((-1,1),repeat=3)))*extent;base=np.c_[local,np.ones(8)]@np.array(o['T_base_from_bbox_carla']).T;opt=base@camera_base.T
  if np.any(opt[:,2]<=0):continue
  uv=opt[:,:3]@k.T;uv=uv[:,:2]/uv[:,2:];box=[max(0,int(np.floor(uv[:,0].min()))),max(0,int(np.floor(uv[:,1].min()))),min(639,int(np.ceil(uv[:,0].max()))),min(359,int(np.ceil(uv[:,1].max())))]
  support,_=lidar_support(o,box,p['base'],p['uv'],p['optical']);rows.append({'actor_id':o['actor_id'],'class_name':o['class_name'],'range_m':round(o['range_m'],1),'bbox_xyxy':box,'support_points':len(support)})
  draw.rectangle(box,outline='#38f09a' if len(support)>=5 else '#ffbf5f',width=1);draw.text((box[0],max(0,box[1]-12)),f"{o['actor_id']} {len(support)}p",fill='yellow',stroke_width=1,stroke_fill='black')
 im.save(folder/'projected_boxes.png');report[f['id']]=rows
(out/'projected_candidate_boxes.json').write_text(json.dumps(report,indent=2))
for fid,rows in report.items():print(fid,[(r['actor_id'],r['class_name'],r['range_m'],r['support_points'],r['bbox_xyxy']) for r in rows])
