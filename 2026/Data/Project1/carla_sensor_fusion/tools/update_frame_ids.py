#!/usr/bin/env python3
"""Migrate legacy Project 1 frames transactionally, preserving samples and timestamps.

Stop playback before running. A backup database is required outside the release.
"""
import argparse,hashlib,json,shutil,sqlite3
from pathlib import Path
from rclpy.serialization import deserialize_message,serialize_message
from rosidl_runtime_py.utilities import get_message

RENAMES={'camera_front':'front_camera_mount','camera_front_optical':'front_camera','lidar_roof':'top_lidar'}

def migrate(bag,backup):
    db=next(bag.glob('*.db3'));backup.mkdir(parents=True,exist_ok=True)
    saved=backup/db.name
    if saved.exists():raise FileExistsError(saved)
    shutil.copy2(db,saved)
    con=sqlite3.connect(db);types={i:(n,get_message(t)) for i,n,t in con.execute('SELECT id,name,type FROM topics')}
    counts={};last={};first={};changed=0;payloads=0;edges=set()
    try:
        con.execute('BEGIN IMMEDIATE')
        # IDs are materialized, not multi-gigabyte image payloads.
        for mid, in con.execute('SELECT id FROM messages ORDER BY timestamp,id').fetchall():
            tid,timestamp,data=con.execute('SELECT topic_id,timestamp,data FROM messages WHERE id=?',(mid,)).fetchone()
            topic,typ=types[tid];msg=deserialize_message(data,typ);counts[topic]=counts.get(topic,0)+1
            fields=[]
            if topic=='/tf':
                for tf in msg.transforms:
                    fields.extend([(tf.header,'frame_id'),(tf,'child_frame_id')])
                    key=RENAMES.get(tf.child_frame_id,tf.child_frame_id);ns=tf.header.stamp.sec*10**9+tf.header.stamp.nanosec
                    assert ns==timestamp and ns>last.get(key,-1),(key,ns,last.get(key))
                    last[key]=ns;first.setdefault(key,ns)
            elif hasattr(msg,'header'):
                fields.append((msg.header,'frame_id'))
                assert msg.header.stamp.sec*10**9+msg.header.stamp.nanosec==timestamp
            elif topic=='/clock':
                ns=msg.clock.sec*10**9+msg.clock.nanosec
                assert ns==timestamp and ns>last.get('/clock',-1)
                last['/clock']=ns;first.setdefault('/clock',ns)
            raw=bytes(msg.data) if hasattr(msg,'data') else None
            before=hashlib.sha256(raw).hexdigest() if raw is not None else None
            modified=False
            for obj,key in fields:
                old=getattr(obj,key)
                if old in RENAMES:setattr(obj,key,RENAMES[old]);modified=True
            if modified:
                output=serialize_message(msg)
                check=deserialize_message(output,typ)
                if raw is not None:
                    assert hashlib.sha256(bytes(check.data)).hexdigest()==before;payloads+=1
                con.execute('UPDATE messages SET data=? WHERE id=?',(output,mid));changed+=1
            if topic=='/tf':edges.update((tf.header.frame_id,tf.child_frame_id) for tf in msg.transforms)
        assert edges=={('map','base_link'),('base_link','top_lidar'),('base_link','front_camera_mount'),('front_camera_mount','front_camera')},edges
        con.commit();assert con.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    except BaseException:con.rollback();raise
    finally:con.close()
    report={'status':'passed','changed_messages':changed,'payloads_verified_unchanged':payloads,'counts':counts,'tf_edges':sorted(edges),'first_stamps_ns':first,'last_stamps_ns':last,'within_pass_tf_clock_monotonic':True,'backup_created':True}
    (bag.parent/'frame_validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('bag',type=Path);p.add_argument('--backup',type=Path,required=True);a=p.parse_args();migrate(a.bag,a.backup)
