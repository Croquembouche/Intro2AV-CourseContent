#!/usr/bin/env python3
"""Verify exported pose conventions against every delivered ROS TF sample."""
import sys,json,gzip,sqlite3,argparse
import numpy as np
from pathlib import Path
from scipy.spatial.transform import Rotation
from rclpy.serialization import deserialize_message
from tf2_msgs.msg import TFMessage

from extract_ground_truth import rotation
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);root=parser.parse_args().root;errors={}
mirror=np.diag([1,-1,1])
for seq in ('stationary','driving'):
 with gzip.open(root/f'instructor/{seq}_ground_truth.jsonl.gz','rt') as f:gt={r['stamp_ns']:r for r in map(json.loads,f)}
 with sqlite3.connect(root/seq/'bag/bag_0.db3') as db:
  tid=db.execute("select id from topics where name='/tf'").fetchone()[0]
  maxerr=0;n=0
  for stamp,data in db.execute('select timestamp,data from messages where topic_id=?',(tid,)):
   msg=deserialize_message(data,TFMessage);t=next(t for t in msg.transforms if t.child_frame_id=='base_link');q=t.transform.rotation
   observed=Rotation.from_quat([q.x,q.y,q.z,q.w]).as_matrix();expected=mirror@rotation(gt[stamp]['ego_world_pose_carla'])@mirror
   maxerr=max(maxerr,float(np.max(np.abs(observed-expected))));n+=1
  assert maxerr<1e-5,(seq,maxerr)
  errors[seq]={'frames_checked':n,'maximum_rotation_matrix_element_error':maxerr}
report={'status':'passed','scope':'Every exported ego rotation compared against the actual map-to-base_link quaternion in the delivered bag.', 'sequences':errors}
(root/'instructor/pose_tf_validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
