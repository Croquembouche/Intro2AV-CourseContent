#!/usr/bin/env python3
"""Extract exact bag keyframes and projected actor candidates for visual review."""
import argparse,gzip,json,sqlite3
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from rclpy.serialization import deserialize_message
from sensor_msgs.msg import Image as RosImage,PointCloud2
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'instructor'/'front_camera_evaluation'
SCHEDULE={'stationary':[0], 'driving':[0,2,3,3.5,4,4.5,5,6,8,10,12,12.5,13,13.5,14,16,18,20,24,28,32,36,40,44,48,52,56,60]}

def main():
 global ROOT,OUT
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',type=Path,default=ROOT)
 parser.add_argument('--driving-times',type=float,nargs='+',help='Explicit driving keyframe times in seconds; each requires a new visual review')
 args=parser.parse_args();ROOT=args.root;OUT=ROOT/'instructor'/'front_camera_evaluation'
 if args.driving_times is not None:SCHEDULE['driving']=sorted(set(args.driving_times))
 OUT.mkdir(parents=True,exist_ok=True)
 frames=[]
 for sequence,times in SCHEDULE.items():
  cal=json.loads((ROOT/sequence/'calibration.json').read_text())
  k=np.array(cal['camera_K']); base_lidar=np.array(cal['T_base_from_lidar'])
  camera_base=np.array(cal['T_camera_optical_from_lidar'])@np.linalg.inv(base_lidar)
  with gzip.open(ROOT/f'instructor/{sequence}_ground_truth.jsonl.gz','rt') as f: gt=[json.loads(x) for x in f]
  with sqlite3.connect(ROOT/sequence/'bag'/'bag_0.db3') as db:
   topics=dict(db.execute('select name,id from topics'))
   for requested in times:
    g=min(gt,key=lambda row:abs((row['stamp_ns']-gt[0]['stamp_ns'])/1e9-requested))
    stamp=g['stamp_ns']; label=f'{int(requested):02d}' if float(requested).is_integer() else f'{requested:04.1f}'; fid=f'{sequence}_{label}s'
    folder=OUT/'frames'/fid;folder.mkdir(parents=True,exist_ok=True)
    def read(topic,typ):
     data=db.execute('select data from messages where topic_id=? and timestamp=?',(topics[topic],stamp)).fetchone()[0]
     return deserialize_message(data,typ)
    msg=read('/camera/front/image_raw',RosImage)
    rgb=Image.frombytes('RGBA',(msg.width,msg.height),bytes(msg.data),'raw','BGRA').convert('RGB')
    rgb.save(folder/'camera.png')
    cloud=read('/lidar/roof/points',PointCloud2)
    xyz=np.frombuffer(cloud.data,dtype='<f4').reshape(-1,4)[:,:3]
    base=(np.column_stack((xyz,np.ones(len(xyz))))@base_lidar.T)[:,:3]
    opt=(np.column_stack((base,np.ones(len(base))))@camera_base.T)[:,:3]
    uvz=opt@k.T
    uv=uvz[:,:2]/np.where(abs(uvz[:,2:])>1e-8,uvz[:,2:],np.nan)
    np.savez_compressed(folder/'points.npz',base=base,optical=opt,uv=uv)
    view=rgb.copy();draw=ImageDraw.Draw(view)
    for o in g['objects']:
     p=np.array([o['x'],o['y'],o['z']+(0 if o['position_reference']=='CARLA bounding-box center' else o['half_extent']['z']),1.])
     q=camera_base@p; o['range_m']=float(np.hypot(o['x'],o['y']))
     if q[2]>0:
      v=k@q[:3];u,v=v[:2]/v[2]
      o['candidate_uv']=[float(u),float(v)]
      if -30<u<670 and -30<v<390 and o['range_m']<=60 and o['class_name'] in ('car','person'):
       draw.line((u-4,v,u+4,v),fill='yellow',width=2);draw.line((u,v-4,u,v+4),fill='yellow',width=2)
       text=f"{o['actor_id']} {o['class_name']} {o['range_m']:.0f}m"
       draw.text((max(0,min(540,u-30)),max(0,min(345,v-20))),text,fill='yellow',stroke_width=1,stroke_fill='black')
    view.save(folder/'candidates.png')
    frame={'id':fid,'sequence':sequence,'stamp_ns':stamp,'carla_frame':g['frame'],'relative_time_seconds':(stamp-gt[0]['stamp_ns'])/1e9,'objects':g['objects']}
    (folder/'candidates.json').write_text(json.dumps(frame,indent=2));frames.append(frame)
 for page,start in enumerate(range(0,len(frames),4),1):
  canvas=Image.new('RGB',(1280,2*390),'#17232f');draw=ImageDraw.Draw(canvas)
  for i,f in enumerate(frames[start:start+4]):
   x,y=(i%2)*640,(i//2)*390
   canvas.paste(Image.open(OUT/'frames'/f['id']/'candidates.png'),(x,y))
   draw.text((x+10,y+368),f['id'],fill='white')
  canvas.save(OUT/f'candidate_sheet_{page}.jpg',quality=95)
 (OUT/'candidate_frames.json').write_text(json.dumps(frames,indent=2))
 print('Prepared',len(frames),'keyframes')
if __name__=='__main__':main()
