from pathlib import Path
import json
import rosbag2_py
from rclpy.serialization import deserialize_message
from sensor_msgs.msg import Image as RosImage
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1];target=27162790798
r=rosbag2_py.SequentialReader();r.open(rosbag2_py.StorageOptions(uri=str(root/'bag'),storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''));picked={}
while r.has_next():
 topic,data,ts=r.read_next()
 if topic.startswith('/camera/') and topic.endswith('/image_raw') and ts>=target:
  name=topic.split('/')[2]
  if name not in picked:picked[name]=(ts,deserialize_message(data,RosImage))
  if len(picked)==6:break
assert len(picked)==6
sheet=Image.new('RGB',(1280,1200),'white');draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('DejaVuSans.ttf',18)
for j,name in enumerate(['front','front_left','rear_left','rear','rear_right','front_right']):
 ts,m=picked[name];rgb=Image.frombytes('RGBA',(m.width,m.height),bytes(m.data),'raw','BGRA').convert('RGB');rgb.save(root/(name+'_preview.png'))
 x=j%2*640;y=j//2*400;sheet.paste(rgb,(x,y+30));draw.text((x+10,y+5),f'{name.replace("_"," ").title()} | t = {ts/1e9:.3f} s',fill='black',font=font)
sheet.save(root/'surround_preview.jpg',quality=92)
(root/'instructor/preview_timestamps.json').write_text(json.dumps({n:t for n,(t,m) in picked.items()},indent=2))
