import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'Project1/carla_sensor_fusion/tools'))
from capture_session import request
base='http://128.175.213.232:8095';root=Path(__file__).resolve().parents[1]
c=json.loads((root/'instructor/capture_restore_configuration.json').read_text())
print(request(base,'/api/command/weather',c['weather']),flush=True)
for a in c['actors']:
 if a['role'] not in ['ego','pedestrian']:continue
 payload={k:v for k,v in a.items() if k!='id'}
 if a['role']=='ego':payload['model']='vehicle.lincoln.mkz';payload['spawn']['z']=.3
 try:print(a['role'],request(base,'/api/command/spawn',payload),flush=True)
 except Exception as e:
  print(type(e).__name__,getattr(e,'read',lambda:str(e))(),flush=True);raise
(root/'instructor/capture_configuration.json').write_text(json.dumps(request(base,'/api/configuration'),indent=2))
