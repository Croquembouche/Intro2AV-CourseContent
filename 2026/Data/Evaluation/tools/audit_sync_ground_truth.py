"""Independent audit using recorded bag TF, actor world poses and actor-local geometry."""
import gzip,hashlib,itertools,json,sqlite3,sys
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.spatial.transform import Rotation
from rclpy.serialization import deserialize_message
from rosidl_runtime_py.utilities import get_message
R=Path(__file__).resolve().parents[1];S=R.parent/'Project1/carla_sensor_fusion';P=R/'sync_1cam1lidar_geometry'
sys.path.insert(0,str(P));from evaluate_sync import evaluate
ref=json.loads((P/'evaluation_set.json').read_text());geometry=json.loads((S/'instructor/actor_geometry.json').read_text())['actors']
review=json.loads((S/'instructor/front_camera_evaluation/evaluation_set.json').read_text())
signs=np.array(list(itertools.product([-1.,1.],repeat=3)));mirror=np.diag([1.,-1.,1.])
def rotation(p):return Rotation.from_euler('xyz',[p.get('roll',0),p.get('pitch',0),p.get('yaw',0)],degrees=True).as_matrix()
def matrix(t):
 q=t.transform.rotation;v=t.transform.translation;m=np.eye(4);m[:3,:3]=Rotation.from_quat([q.x,q.y,q.z,q.w]).as_matrix();m[:3,3]=[v.x,v.y,v.z];return m
report={'status':'passed','method':'Reconstruct world-space box corners from actor world poses and separately captured local geometry, convert CARLA world y to ROS map y, then transform using inverse map-to-base_link TF deserialized from the actual delivered bags. No precomputed T_base_from_bbox_carla used for reconstructed reference.', 'sequences':{},'objects':[]}
independent={};allstamps=[]
for sequence in ['stationary','driving']:
 with gzip.open(S/f'instructor/{sequence}_ground_truth.jsonl.gz','rt') as f:gt={r['stamp_ns']:r for r in map(json.loads,f)}
 cal=json.loads((S/sequence/'calibration.json').read_text())
 selected={f['stamp_ns']:f for f in ref['frames'] if f['sequence']==sequence};seen={};tfmap={};clouds={};headers={};intrinsics={}
 for db in (S/sequence/'bag').glob('*.db3'):
  c=sqlite3.connect(f'file:{db}?mode=ro',uri=True);topics={tid:(name,get_message(typ)) for tid,name,typ in c.execute('select id,name,type from topics')}
  for tid,ts,data in c.execute('select topic_id,timestamp,data from messages order by timestamp,id'):
   name,cls=topics[tid]
   if name=='/clock':continue
   # All header times, frames, and TF are checked, not just database timestamps.
   msg=deserialize_message(data,cls)
   if name=='/tf':
    for t in msg.transforms:assert t.header.stamp.sec*10**9+t.header.stamp.nanosec==ts
    if ts in selected:tfmap[ts]={t.child_frame_id:matrix(t) for t in msg.transforms}
   else:
    stamp=msg.header.stamp.sec*10**9+msg.header.stamp.nanosec;assert stamp==ts,(name,stamp,ts)
    headers.setdefault(name,[]).append(stamp)
    if name=='/camera/front/camera_info' and ts in selected:intrinsics[ts]=np.array(msg.k).reshape(3,3)
    if name=='/lidar/roof/points':
     assert msg.header.frame_id=='top_lidar'
     if ts in selected:clouds[ts]=np.frombuffer(msg.data,dtype='<f4').reshape(-1,4)[:,:3].copy()
    if name=='/camera/front/image_raw':
     assert msg.header.frame_id=='front_camera'
     if ts in selected:
      seen[ts]=hashlib.sha256(bytes(msg.data)).hexdigest()
      rgb=Image.frombytes('RGBA',(msg.width,msg.height),bytes(msg.data),'raw','BGRA').convert('RGB')
      original=Image.open(S/'instructor/front_camera_evaluation/frames'/selected[ts]['id']/'camera.png').convert('RGB')
      assert np.array_equal(np.array(rgb),np.array(original)),selected[ts]['id']
  c.close()
 lidar=headers['/lidar/roof/points'];assert lidar==headers['/camera/front/image_raw']==headers['/camera/front/camera_info'];assert set(lidar)==set(gt)
 allstamps+=lidar
 for stamp,f in selected.items():
  assert stamp in seen and stamp in tfmap
  inv=np.linalg.inv(tfmap[stamp]['base_link']);record=gt[stamp];independent[stamp]=[]
  oldframe=next(x for x in review['frames'] if x['stamp_ns']==stamp)
  assert {o['actor_id'] for o in f['objects']}=={o['actor_id'] for o in oldframe['objects'] if o['eligibility']=='eligible'}
  # Check recorded ego pose against bag TF (position as well as orientation).
  ego=record['ego_world_pose_carla'];expected=np.eye(4);expected[:3,:3]=mirror@rotation(ego)@mirror;expected[:3,3]=mirror@np.array([ego[k] for k in ['x','y','z']]);assert np.allclose(expected,tfmap[stamp]['base_link'],atol=2e-5,rtol=0)
  for label in f['objects']:
   actor=next(o for o in record['objects'] if o['actor_id']==label['actor_id']);box=geometry[str(label['actor_id'])]['bounding_box'];assert actor['class_name']==label['class_name']
   assert box==actor['bounding_box_local_carla']
   extent=np.array([box['extent'][k] for k in ['x','y','z']]);assert np.allclose(extent,[actor['half_extent'][k] for k in ['x','y','z']])
   local=(signs*extent)@rotation(box['rotation']).T+np.array([box['location'][k] for k in ['x','y','z']])
   pose=actor['world_pose_carla'];world=local@rotation(pose).T+np.array([pose[k] for k in ['x','y','z']]);world=world@mirror
   base=(np.column_stack([world,np.ones(8)])@inv.T)[:,:3];lo=base.min(axis=0);hi=base.max(axis=0);center=(lo+hi)/2;size=hi-lo
   ce=float(np.linalg.norm(center-label['center']));se=float(np.max(np.abs(size-label['size'])));assert ce<.0001 and se<.0001,(f['id'],label['actor_id'],ce,se)
   independent[stamp].append(dict(class_name=label['class_name'],center=center.tolist(),size=size.tolist(),target_id=f"{f['id']}_actor_{label['actor_id']}"))
   # Independent LiDAR-to-box support check using actual recorded mount transform.
   basepoints=(np.column_stack([clouds[stamp],np.ones(len(clouds[stamp]))])@tfmap[stamp]['top_lidar'].T)
   worldpoints=basepoints@tfmap[stamp]['base_link'].T;cw=worldpoints[:,:3]@mirror
   actorlocal=(cw-np.array([pose[k] for k in ['x','y','z']]))@rotation(pose)
   boxlocal=(actorlocal-np.array([box['location'][k] for k in ['x','y','z']]))@rotation(box['rotation'])
   cam=tfmap[stamp]['front_camera_mount']@tfmap[stamp]['front_camera'];opt=(basepoints@np.linalg.inv(cam).T)[:,:3];uvz=opt@intrinsics[stamp].T
   uv=uvz[:,:2]/np.where(np.abs(uvz[:,2:])>1e-12,uvz[:,2:],1e-12)
   reviewed=next(o for o in oldframe['objects'] if o['actor_id']==label['actor_id']);x0,y0,x1,y1=reviewed['bbox_xyxy']
   mask=(opt[:,2]>0)&(uv[:,0]>=x0)&(uv[:,0]<=x1)&(uv[:,1]>=y0)&(uv[:,1]<=y1)&(np.abs(boxlocal)<=extent+.15).all(axis=1)&(boxlocal[:,2]>=-extent[2]+.25)
   support=int(mask.sum());assert support==reviewed['lidar_support_count'],(f['id'],label['actor_id'],support,reviewed['lidar_support_count'])
   report['objects'].append(dict(sequence=sequence,frame_id=f['id'],stamp_ns=stamp,actor_id=label['actor_id'],class_name=label['class_name'],center_disagreement_m=ce,max_dimension_disagreement_m=se,body_support_candidates=support))
 report['sequences'][sequence]=dict(synchronized_pairs=len(lidar),reviewed_frames=len(selected),ground_truth_records=len(gt),first_stamp_ns=lidar[0],last_stamp_ns=lidar[-1],all_sensor_header_timestamps_match=True)
assert sorted(allstamps)==sorted(ref['valid_output_stamps_ns'])
report['max_center_disagreement_m']=max(o['center_disagreement_m'] for o in report['objects']);report['max_dimension_disagreement_m']=max(o['max_dimension_disagreement_m'] for o in report['objects']);report['minimum_body_support_candidates']=min(o['body_support_candidates'] for o in report['objects']);report['all_29_review_images_match_bag_pixels']=True;report['all_22_support_counts_reproduced']=True;report['support_rule']='Original review rule: positive camera depth, inside reviewed RGB box, within oriented physical box plus 0.15 m, exclude bottom 0.25 m.'
result=evaluate(ref,independent);report['independent_reference_evaluator_result']=result['overall'];assert result['status']=='complete'
(R/'sync_ground_truth_audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='objects'},indent=2))
