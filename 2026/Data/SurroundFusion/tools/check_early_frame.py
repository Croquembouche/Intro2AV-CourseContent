from pathlib import Path
import json,urllib.request,hashlib,numpy as np
from PIL import Image,ImageDraw
from scipy.spatial.transform import Rotation
root=Path(__file__).resolve().parents[1]/'instructor';frame=json.load(open(root/'first_raw_frame.json'));xyz=np.frombuffer((root/'first_lidar_raw.bin').read_bytes(),dtype='<f4').reshape(-1,4)[:,:3].copy();xyz[:,1]*=-1;xyz[:,2]+=.3
sheet=Image.new('RGB',(1280,1200),'white');d=ImageDraw.Draw(sheet)
optical=Rotation.from_euler('xyz',[-np.pi/2,0,-np.pi/2]).as_matrix()
for j,s in enumerate(x for x in frame['sensor_files'] if 'camera' in x['type']):
 data=urllib.request.urlopen('http://128.175.213.232:8095/api/sessions/20260914-144647-6b7314/files/'+s['path']).read();assert hashlib.sha256(data).hexdigest()==s['sha256']
 rgb=Image.frombytes('RGBA',(640,360),data,'raw','BGRA').convert('RGB');dr=ImageDraw.Draw(rgb);m=s['mount'];rot=Rotation.from_euler('z',-m['yaw'],degrees=True).as_matrix()@optical
 points=(xyz-np.array([m['x'],-m['y'],0]))@rot;points=points[points[:,2]>.1];uv=points[:,:2]/points[:,2:]*320+[320,180];good=(uv[:,0]>=0)&(uv[:,0]<640)&(uv[:,1]>=0)&(uv[:,1]<360)
 for (u,v),point in zip(uv[good],points[good]):
  ratio=min(point[2]/60,1);dr.ellipse((u-1,v-1,u+1,v+1),fill=(int(255*(1-ratio)),int(255*ratio),70))
 x=(j%2)*640;y=(j//2)*400;sheet.paste(rgb,(x,y+30));d.text((x+10,y+8),s['name']+' | '+str(int(good.sum()))+' LiDAR points',fill='black')
sheet.save(root/'early_projection_contact.jpg',quality=93)
