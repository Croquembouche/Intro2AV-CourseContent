from pathlib import Path
import json,sys,subprocess,tempfile,itertools
import numpy as np
R=Path(__file__).resolve().parents[1];P=R/'sync_1cam1lidar_map';sys.path.insert(0,str(P))
from evaluate_sync import evaluate,load_predictions
reference=json.loads((P/'evaluation_set.json').read_text())
source=json.loads((R.parent/'Project1/carla_sensor_fusion/instructor/front_camera_evaluation/evaluation_set.json').read_text())
# Independently check AABB extrema against all eight original transformed corners.
for original,converted in zip(source['frames'],reference['frames']):
 for old,new in zip([o for o in original['objects'] if o['class_name'] in reference['classes']],converted['objects']):
  corners=np.array(list(itertools.product([-1,1],repeat=3)))*[old['half_extent'][k] for k in ['x','y','z']]
  world=np.column_stack([corners,np.ones(8)])@np.array(old['T_base_from_bbox_carla']).T
  assert np.allclose(world[:,:3].min(axis=0),np.array(new['center'])-np.array(new['size'])/2)
  assert np.allclose(world[:,:3].max(axis=0),np.array(new['center'])+np.array(new['size'])/2)
with tempfile.TemporaryDirectory() as tmp:
 tmp=Path(tmp)
 rows=[dict(stamp_ns=f['stamp_ns'],frame_id='base_link',objects=[{k:o[k] for k in ['class_name','center','size']} for o in f['objects'] if o['eligibility']=='eligible']) for f in reference['frames']]
 for mode in ['perfect','bad_size','empty','wrong_time']:
  copy=json.loads(json.dumps(rows))
  for row in copy:
   if mode=='bad_size':
    for o in row['objects']:o['size']=[.01,.01,.01]
   if mode=='empty':row['objects']=[]
   if mode=='wrong_time':row['stamp_ns']+=1
  path=tmp/(mode+'.jsonl');path.write_text(''.join(json.dumps(r)+'\n' for r in copy))
  report=evaluate(reference,load_predictions(path));a=report['center_3d']['mAP'];b=report['bounding_box_3d']['mAP']
  assert (a,b)=={'perfect':(1.,1.),'bad_size':(1.,0.),'empty':(0.,0.),'wrong_time':(0.,0.)}[mode],(mode,a,b)
  print(mode,a,b)
 subprocess.run([sys.executable,str(P/'evaluate_sync.py'),str(tmp/'perfect.jsonl'),'--output',str(tmp/'report.json')],check=True,cwd=tmp)
print('Full reference geometry and CLI validation passed')
