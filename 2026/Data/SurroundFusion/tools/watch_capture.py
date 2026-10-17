import sys,time,json,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'Project1/carla_sensor_fusion/tools'))
from capture_session import request
base='http://128.175.213.232:8095';path=Path(__file__).resolve().parents[1]/'instructor/live_capture_progress.jsonl'
seen=False
with path.open('w') as f:
 for _ in range(500):
  s=request(base,'/api/status');r=s.get('recording')
  if r:seen=True
  e=next((x for x in s['actors'] if s.get('managed',{}).get(str(x['id']),{}).get('role')=='ego'),None)
  row={'phase':s['phase'],'error':s['error'],'sim_time':s.get('time'),'frames':(r or {}).get('frames'),'duration':(r or {}).get('end_sim_time',0)-(r or {}).get('start_sim_time',0),'speed':math.sqrt(sum(v*v for v in e['velocity'].values())) if e else None}
  f.write(json.dumps(row)+'\n');f.flush()
  if seen and not r:
   if s['running']:request(base,'/api/command/pause',{})
   print('Recording stopped; simulator paused for download.',flush=True);break
  if s['phase']=='error':raise RuntimeError(s['error'])
  time.sleep(3)
