#!/usr/bin/env python3
"""Inspect evenly spaced camera frames from a packaged ROS 2 SQLite bag."""
import argparse
from pathlib import Path
import sqlite3
from PIL import Image as PILImage, ImageDraw
from rclpy.serialization import deserialize_message
from sensor_msgs.msg import Image


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('bag',type=Path)
    a=p.parse_args()
    dbs=list(a.bag.glob('*.db3'))
    if len(dbs)!=1:
        raise ValueError('This inspection helper expects one SQLite file')
    with sqlite3.connect(dbs[0]) as c:
        topic=c.execute("SELECT id FROM topics WHERE name='/camera/front/image_raw'").fetchone()[0]
        records=c.execute('SELECT id,timestamp FROM messages WHERE topic_id=? ORDER BY timestamp',(topic,)).fetchall()
        selected=[round(i*(len(records)-1)/5) for i in range(6)]
        canvas=PILImage.new('RGB',(1280,3*392),'#121b25')
        draw=ImageDraw.Draw(canvas)
        for i,index in enumerate(selected):
            mid,timestamp=records[index]
            blob=c.execute('SELECT data FROM messages WHERE id=?',(mid,)).fetchone()[0]
            msg=deserialize_message(blob,Image)
            assert msg.encoding=='bgra8'
            im=PILImage.frombytes('RGBA',(msg.width,msg.height),bytes(msg.data),'raw','BGRA').convert('RGB')
            im=im.resize((640,360))
            x,y=(i%2)*640,(i//2)*392
            canvas.paste(im,(x,y))
            draw.text((x+10,y+370),f'{(timestamp-records[0][1])/1e9:.2f} s | sample {index+1}/{len(records)}',fill='white')
        canvas.save(a.bag.parent/'camera_contact_sheet.jpg',quality=92)
    print('Saved',a.bag.parent/'camera_contact_sheet.jpg')


if __name__=='__main__':
    main()
