import json,math,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'Project1/carla_sensor_fusion/tools'))
from capture_session import request
base='http://128.175.213.232:8095'
root=Path(__file__).resolve().parents[1]
s=request(base,'/api/status')
assert not s['running'] and not s['recording']
ego=next(int(k) for k,v in s['managed'].items() if v['role']=='ego')
configs=[]
for name,yaw in [('front',0),('front_left',-60),('rear_left',-120),('rear',180),('rear_right',120),('front_right',60)]:
 a=math.radians(yaw)
 configs.append(dict(name=name+'_rgb',type='sensor.camera.rgb',mount=dict(x=round(.7*math.cos(a),4),y=round(.5*math.sin(a),4),z=2.2,yaw=yaw),attributes=dict(image_size_x='640',image_size_y='360',fov='90',use_ray_tracing='false',sensor_tick='0.0')))
configs.append(dict(name='roof_lidar',type='sensor.lidar.ray_cast',mount=dict(z=2.5),attributes=dict(channels='32',range='80',points_per_second='200000',rotation_frequency='20',sensor_tick='0.0',material_model='false',physical_model='false',output_format='xyzi')))
(root/'instructor/requested_loadout.json').write_text(json.dumps(configs,indent=2))
print('Configuring six cameras and roof LiDAR',flush=True)
print(request(base,'/api/command/sensors',dict(id=ego,sensors=configs)),flush=True)
print(request(base,'/api/command/weather',dict(cloudiness=20,precipitation=0,precipitation_deposits=0,wetness=0,fog_density=0,sun_altitude_angle=55)),flush=True)
(root/'instructor/capture_configuration.json').write_text(json.dumps(request(base,'/api/configuration'),indent=2))
print('Ready ego',ego,flush=True)
