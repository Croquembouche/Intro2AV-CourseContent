import gzip,json
from pathlib import Path
import numpy as np,rosbag2_py
from rclpy.serialization import deserialize_message
from sensor_msgs.msg import PointCloud2
root=Path(__file__).resolve().parents[1];target=26762790798
with gzip.open(root/'instructor/ground_truth.jsonl.gz','rt') as f:
 gt=next(json.loads(line) for line in f if json.loads(line)['stamp_ns']==target)
r=rosbag2_py.SequentialReader();r.open(rosbag2_py.StorageOptions(uri=str(root/'bag'),storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''))
while r.has_next():
 topic,data,ts=r.read_next()
 if topic=='/lidar/roof/points' and ts==target:m=deserialize_message(data,PointCloud2);break
else:raise RuntimeError('Selected retained scan missing')
xyz=np.frombuffer(m.data,dtype='<f4').reshape(-1,4)[:,:3].copy();xyz[:,2]+=2.5;p=np.column_stack((xyz,np.ones(len(xyz))));report={}
for aid in [28,33]:
 o=next(o for o in gt['objects'] if o['actor_id']==aid);local=(np.linalg.inv(np.array(o['T_base_from_bbox_carla']))@p.T).T[:,:3];ex=np.array([o['half_extent'][k] for k in ['x','y','z']]);mask=(np.abs(local)<=ex+.1).all(axis=1);count=int(mask.sum());assert count>10,(aid,count)
 report[str(aid)]={'class':o['class_name'],'range_m':float(np.hypot(o['x'],o['y'])),'points_in_bbox_with_10cm_tolerance':count}
(root/'instructor/vehicle_return_validation.json').write_text(json.dumps({'status':'passed','stamp_ns':target,'actors':report,'scope':'Two nearby recorded cars only; this is not an exhaustive visibility benchmark.'},indent=2));print(report)
