from pathlib import Path
import json,sys,tempfile,itertools,subprocess
import numpy as np
R=Path(__file__).resolve().parents[1];P=R/'sync_1cam1lidar_geometry';sys.path.insert(0,str(P))
from evaluate_sync import evaluate,load_predictions
reference=json.loads((P/'evaluation_set.json').read_text())
source=json.loads((R.parent/'Project1/carla_sensor_fusion/instructor/front_camera_evaluation/evaluation_set.json').read_text())
for original,converted in zip(source['frames'],reference['frames']):
 for new in converted['objects']:
  old=next(o for o in original['objects'] if o['actor_id']==new['actor_id'])
  corners=np.array(list(itertools.product([-1,1],repeat=3)))*[old['half_extent'][k] for k in ['x','y','z']]
  world=np.column_stack([corners,np.ones(8)])@np.array(old['T_base_from_bbox_carla']).T
  assert np.allclose(world[:,:3].min(axis=0),np.array(new['center'])-np.array(new['size'])/2)
  assert np.allclose(world[:,:3].max(axis=0),np.array(new['center'])+np.array(new['size'])/2)
rows=[dict(stamp_ns=f['stamp_ns'],frame_id='base_link',objects=[{k:o[k] for k in ['class_name','center','size']}|dict(target_id=f"{f['id']}_actor_{o['actor_id']}") for o in f['objects']]) for f in reference['frames']]
with tempfile.TemporaryDirectory() as tmp:
 tmp=Path(tmp)
 for mode in ['perfect','translated','size_only','empty','wrong_time']:
  copy=json.loads(json.dumps(rows))
  for row in copy:
   if mode=='empty':row['objects']=[]
   if mode=='wrong_time':row['stamp_ns']+=1
   for o in row['objects']:
    if mode=='translated':o['center'][0]+=3;o['center'][1]+=4
    if mode=='size_only':o['size'][0]+=2
  p=tmp/(mode+'.jsonl');p.write_text(''.join(json.dumps(r)+'\n' for r in copy))
  report=evaluate(reference,load_predictions(p));v=report['overall']
  if mode in ['empty','wrong_time']:assert v['center_error_m'] is None and report['coverage']['missing_measurements']==22
  else:
   assert v['measurements']==22
   expected={'perfect':(0.,0.,0.),'translated':(5.,0.,5.),'size_only':(0.,2/3,1.)}[mode]
   assert np.allclose([v['center_error_m']['mean'],v['dimension_mae_m'],v['bbox_corner_mean_error_m']['mean']],expected)
  print(mode,'passed')
 subprocess.run([sys.executable,str(P/'evaluate_sync.py'),str(tmp/'perfect.jsonl'),'--output',str(tmp/'report.json')],cwd=tmp,check=True)
print('All 22 reference boxes verified against original transformed corners')
