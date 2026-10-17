"""Attach to this owned recording, stop at 60 simulated seconds, pause, and download."""
import sys,json,time,argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'Project1/carla_sensor_fusion/tools'))
from capture_session import request,download_session
root=Path(__file__).resolve().parents[1];base='http://128.175.213.232:8095';sid='20260914-145210-8a816e';output=root/'instructor/source_capture'
points=request(base,'/api/map')['spawn_points'];route_index=0;stop_sent=False
try:
 for _ in range(1800):
  s=request(base,'/api/status');r=s.get('recording')
  if not r or r['id']!=sid:raise RuntimeError('Owned recording ended: '+str(s.get('error')))
  duration=r['end_sim_time']-r['start_sim_time']
  (root/'instructor/current_progress.json').write_text(json.dumps({'frames':r['frames'],'duration':duration,'error':s['error'],'wall_time':time.time()}))
  if duration>=60:break
  if s['managed'].get('61',{}).get('arrived'):
   route_index=(route_index+1)%3
   request(base,'/api/command/destination',{'id':61,'point':points[[14,0,30][route_index]]})
  time.sleep(1)
 else:raise TimeoutError('Capture monitoring wall-time limit')
 stop_sent=True
 try:result=request(base,'/api/command/record-stop',{})
 except TimeoutError:
  # The API shields finalization from disconnects. Never submit stop twice.
  for _ in range(300):
   result=request(base,f'/api/sessions/{sid}/files/manifest.json')
   if result.get('verification'):break
   time.sleep(3)
  else:raise TimeoutError('Finalization is still pending; resume this session later')
 (output/'capture_result.json').write_text(json.dumps(result,indent=2))
 request(base,'/api/command/pause',{})
 print('Capture stopped and paused at',duration,'seconds',flush=True)
 download_session(argparse.Namespace(url=base,output=output,pause_at_end=True),sid)
except Exception:
 s=request(base,'/api/status')
 if not stop_sent and s.get('recording') and s['recording']['id']==sid:request(base,'/api/command/record-stop',{})
 if s.get('running'):request(base,'/api/command/pause',{})
 raise
