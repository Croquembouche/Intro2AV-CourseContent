#!/usr/bin/env python3
"""Test scoring and custom ROS bag decoding with explicitly synthetic predictions."""
import argparse,json,tempfile
from pathlib import Path
import rosbag2_py
from rclpy.serialization import serialize_message
from project1_interfaces.msg import DetectedObject,DetectedObjectArray
from grade_detections import score,load_predictions
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=p.parse_args()
evaluation=json.loads((a.root/'instructor/front_camera_evaluation/evaluation_set.json').read_text())
with tempfile.TemporaryDirectory(prefix='project1-grader-validation-') as folder:
 path=Path(folder)/'oracle_bag';writer=rosbag2_py.SequentialWriter()
 writer.open(rosbag2_py.StorageOptions(uri=str(path),storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''))
 topic='/project1/detected_objects';writer.create_topic(rosbag2_py.TopicMetadata(name=topic,type='project1_interfaces/msg/DetectedObjectArray',serialization_format='cdr'))
 rows=[]
 for frame in evaluation['frames']:
  stamp=frame['stamp_ns'];msg=DetectedObjectArray();msg.header.stamp.sec=stamp//10**9;msg.header.stamp.nanosec=stamp%10**9;msg.header.frame_id='base_link';objects=[]
  for target in frame['objects']:
   if target['eligibility']!='eligible':continue
   o=DetectedObject();o.class_name=target['class_name'];o.confidence=1.;o.x=target['x'];o.y=target['y'];msg.objects.append(o)
   objects.append({'class_name':o.class_name,'confidence':o.confidence,'x':o.x,'y':o.y})
  writer.write(topic,serialize_message(msg),stamp);rows.append({'stamp_ns':stamp,'frame_id':'base_link','objects':objects})
 del writer
 predictions=load_predictions(path,topic);bag_report=score(evaluation,predictions)
 jpath=Path(folder)/'oracle.jsonl';jpath.write_text(''.join(json.dumps(row)+'\n' for row in rows));json_report=score(evaluation,load_predictions(jpath,topic))
 assert bag_report==json_report
 assert bag_report['overall']['f1']==1 and bag_report['output_coverage']==1
 assert bag_report['overall']['matched_xy_error_mean_m']==0
 empty=score(evaluation,{})
 assert empty['overall']['f1']==0 and empty['overall']['false_negative']==bag_report['overall']['true_positive']
 result={'status':'passed','scope':'Synthetic ground-truth-derived outputs verify grader matching, ROS custom-message bag decoding, and JSONL parity. This is not detector performance.','oracle_frames':len(rows),'oracle_objects':sum(len(r['objects']) for r in rows),'oracle_joint_f1':bag_report['overall']['f1'],'oracle_output_coverage':bag_report['output_coverage'],'empty_submission_f1':empty['overall']['f1'],'empty_submission_false_negatives':empty['overall']['false_negative'],'jsonl_and_ros_bag_reports_identical':True}
 (a.root/'instructor/grader_validation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
