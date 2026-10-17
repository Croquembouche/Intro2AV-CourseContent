#!/usr/bin/env python3
"""Run with the simulator's CARLA Python API while paused; never advances time."""
import json,urllib.request
import carla

def xyz(v):return {k:float(getattr(v,k)) for k in ('x','y','z')}
c=carla.Client('127.0.0.1',2000);c.set_timeout(20);world=c.get_world()
actors={}
status=json.load(urllib.request.urlopen('http://127.0.0.1:8095/api/status',timeout=20))
for aid in status['managed']:
 a=world.get_actor(int(aid))
 if a is None:raise RuntimeError(f'Managed actor {aid} is absent')
 if not a.type_id.startswith(('vehicle.','walker.pedestrian.')):continue
 b=a.bounding_box
 actors[str(a.id)]={'blueprint':a.type_id,'bounding_box':{'location':xyz(b.location),'extent':xyz(b.extent),'rotation':{k:float(getattr(b.rotation,k)) for k in ('pitch','yaw','roll')}}}
print(json.dumps({'server_version':c.get_server_version(),'frame':world.get_snapshot().frame,'scope':'Actor-local CARLA bounding boxes queried while paused and reused across recorded actor poses; no world tick issued.','actors':actors},indent=2))
