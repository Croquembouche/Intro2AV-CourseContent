from pathlib import Path
import json
import numpy as np
from scipy.spatial.transform import Rotation
R=Path(__file__).resolve().parents[1];out=R/'sync_1cam1lidar_map'
source=R.parent/'Project1/carla_sensor_fusion/instructor/front_camera_evaluation/evaluation_set.json'
d=json.loads(source.read_text());old=json.loads((R/'sync_1cam1lidar/evaluation_set.json').read_text())
frames=[]
for f in d['frames']:
 objects=[]
 for o in f['objects']:
  if o['class_name'] not in d['classes']:continue
  m=np.array(o['T_base_from_bbox_carla']);rot=m[:3,:3].copy()
  # CARLA local axes have opposite handedness. Flipping the local y axis
  # preserves the same symmetric cuboid while producing a ROS proper rotation.
  if np.linalg.det(rot)<0:rot[:,1]*=-1
  assert np.allclose(rot.T@rot,np.eye(3),atol=1e-6)
  assert np.isclose(np.linalg.det(rot),1,atol=1e-6)
  assert np.allclose(m[:3,3],[o['x'],o['y'],o['z']])
  objects.append(dict(actor_id=o['actor_id'],class_name=o['class_name'],center=m[:3,3].tolist(),size=(np.abs(rot) @ np.array([2*o['half_extent'][k] for k in ['x','y','z']])).tolist(),eligibility=o['eligibility'],reason=o.get('reason','')))
 frames.append({k:f[k] for k in ['id','stamp_ns','sequence']}|{'objects':objects})
ref=dict(status='ready_for_student_self_check',dataset_id='sync_1cam1lidar_3d_map_v1',classes=['car','person'],center_distance_thresholds_m=[.5,1.,2.,4.],box_iou_thresholds=[.25,.5,.75],valid_output_stamps_ns=old['valid_output_stamps_ns'],frames=frames,
 protocol=dict(ap='101-point interpolated precision envelope, averaged at recall 0, .01, ..., 1. Ranked over all reviewed frames independently per class; no confidence cutoff.',center='3D Euclidean distance between box centers; match at distance <= threshold.',box='Axis-aligned 3D box intersection-over-union in base_link; match at IoU >= threshold. Ground-truth boxes are the enclosing AABBs of the original oriented CARLA cuboids. Size is full x/y/z extent in base_link, not intrinsic vehicle length/width/height.',matching='Descending confidence, one-to-one per frame and class; closest unmatched center or highest-IoU unmatched box. Ties ordered by timestamp then input object index.',mean='Unweighted mean across evaluated classes and listed thresholds, reported separately for center and box. Not COCO or nuScenes leaderboard mAP.',missing='Missing reviewed frames count as empty detections. Non-reviewed frames are not scored.',ignored='Unmatched detections matching excluded same-class actors are ignored only if they do not also match any eligible actor under that metric and threshold.',reference='CARLA box geometry converted to ROS base_link at the synchronized acquisition time; same visually reviewed 29-frame subset as the earlier center evaluator.',scope='Public student self-check: 19 car instances and 3 person instances, 10 distinct cars and 2 people. Not a hidden test, full-sequence benchmark, or proof of sensor fusion. No instructor sign-off implied.'))
(out/'evaluation_set.json').write_text(json.dumps(ref,indent=2)+'\n')
(out/'requirements.txt').write_text('numpy>=1.24,<3\n')
(out/'examples/empty_predictions.jsonl').write_text(''.join(json.dumps(dict(stamp_ns=f['stamp_ns'],frame_id='base_link',objects=[]))+'\n' for f in frames))
# Deliberately synthetic, unrelated to the released recordings.
(out/'examples/format_example.jsonl').write_text(json.dumps(dict(stamp_ns=12345678900,frame_id='base_link',objects=[dict(class_name='car',center=[12.,-2.,.8],size=[4.5,1.8,1.6])]))+'\n')
print('Reference:',len(frames),'frames;',sum(o['eligibility']=='eligible' for f in frames for o in f['objects']),'eligible instances')
