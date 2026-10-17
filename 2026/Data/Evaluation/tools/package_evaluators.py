from pathlib import Path
import json,sqlite3,shutil,collections
BASE=Path(__file__).resolve().parents[2]; ROOT=BASE/'Evaluation'; SOURCE=BASE/'Project1/carla_sensor_fusion'
frames=json.loads((BASE/'SurroundFusion/instructor/evaluation_review/candidates.json').read_text())
excluded={('surround_340',52):'Small distant view partly obstructed; visibility ambiguous.',('surround_340',57):'Pedestrian partly hidden by street furniture; visibility ambiguous.',('surround_380',52):'Small distant view; visibility ambiguous.',('surround_380',55):'Small distant pedestrian view; visibility ambiguous.',('surround_380',57):'Pedestrian substantially occluded by cabinet and pole.'}
for f in frames:
 f.update(review_status='visually_reviewed',reviewer='Codex visual inspection',review_note='Inspected all six nearest retained camera images with actor-box projections at each camera acquisition time; LiDAR body support measured at the reference scan time.')
 for o in f['objects']:
  if o['eligibility']=='candidate':
   why=excluded.get((f['id'],o['actor_id']))
   o.update(eligibility='ignore' if why else 'eligible',reason=why or 'Visually identifiable in at least one retained image; at least five body-height LiDAR support candidates and within 60 m.')
async_ref=dict(schema_version=2,status='ready_for_instructor_use',name='Surround fusion asynchronous public self-check v1',classes=['car','person'],confidence_threshold=.25,location_tolerance_by_class_m={'car':3.,'person':1.},location_reference='CARLA bounding-box center in base_link at the original LiDAR acquisition timestamp; metres, x forward, y left.',max_range_m=60.,minimum_lidar_support=5,review_method='Codex visual review of 90 actual asynchronous camera images and actor-box projections. Body support uses 10 cm box tolerance, excluding the lowest 20 cm above the box bottom. No instructor sign-off implied.',review_coverage='15 scan keyframes at four-second intervals, from 2 to 58 seconds of the released recording. Repeated views of a small number of actors; not a full-sequence benchmark.',frames=frames)
(BASE/'SurroundFusion/instructor/evaluation_review/evaluation_set.json').write_text(json.dumps(async_ref,indent=2))
core=(SOURCE/'tools/grade_detections.py').read_text();core=core[core.index('def match('):core.index('\ndef main():')]
(ROOT/'scoring_functions.tmp').write_text(core)
for key,ref,paths in [('sync_1cam1lidar',json.loads((SOURCE/'instructor/front_camera_evaluation/evaluation_set.json').read_text()),[SOURCE/'stationary/bag',SOURCE/'driving/bag']),('async_6cam1lidar',async_ref,[BASE/'SurroundFusion/bag'])]:
 out=ROOT/key;out.mkdir(exist_ok=True);(out/'examples').mkdir(exist_ok=True)
 ref['dataset_id']=key;ref['valid_output_stamps_ns']=[]
 for bag in paths:
  for db in bag.glob('*.db3'):
   c=sqlite3.connect(f'file:{db}?mode=ro',uri=True)
   tid=c.execute("select id from topics where name='/lidar/roof/points'").fetchone()[0]
   ref['valid_output_stamps_ns'] += [row[0] for row in c.execute('select timestamp from messages where topic_id=? order by timestamp',(tid,))];c.close()
 for f in ref['frames']:
  f['objects']=[{k:o[k] for k in ['actor_id','class_name','x','y','eligibility','reason'] if k in o} for o in f['objects']]
  for k in ['image_sha256']:f.pop(k,None)
 (out/'evaluation_set.json').write_text(json.dumps(ref,indent=2)+'\n')
 (out/'requirements.txt').write_text('numpy>=1.24,<3\nscipy>=1.10,<2\nrosbags==0.11.5\n')
 for msg in ['DetectedObject','DetectedObjectArray']:
  shutil.copy2(SOURCE/f'project1_interfaces/msg/{msg}.msg',out/f'{msg}.msg')
 text=(out/'DetectedObjectArray.msg').read_text().replace('synchronized','reference')
 (out/'DetectedObjectArray.msg').write_text(text)
 eligible=collections.Counter(o['class_name'] for f in ref['frames'] for o in f['objects'] if o['eligibility']=='eligible')
 print(key,len(ref['frames']),dict(eligible),len(ref['valid_output_stamps_ns']))
