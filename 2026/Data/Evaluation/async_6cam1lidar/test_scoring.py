"""Regression checks for scoring policy and one-to-one matching."""
import copy,tempfile,unittest
from pathlib import Path
from evaluator_core import match,score,load_predictions

def obj(x=10,y=0,cls='car',aid=1,eligibility='eligible'):
 return dict(x=x,y=y,class_name=cls,confidence=1.,actor_id=aid,eligibility=eligibility)
def dataset():
 return {'status':'ready_for_instructor_use','classes':['car','person'],'confidence_threshold':.25,
         'location_tolerance_by_class_m':{'car':3.,'person':1.},'location_reference':'box center',
         'frames':[{'id':'test','stamp_ns':1,'objects':[obj(),obj(20,0,'person',2),obj(40,0,'car',3,'ignore')]}]}

class GradingTests(unittest.TestCase):
 def test_perfect(self):
  r=score(dataset(),{1:[obj(),obj(20,0,'person')]});self.assertEqual(r['overall']['f1'],1);self.assertEqual(r['output_coverage'],1)
 def test_missing_is_not_perfect(self):
  r=score(dataset(),{});self.assertEqual(r['overall']['false_negative'],2);self.assertEqual(r['overall']['f1'],0);self.assertEqual(r['missing_reviewed_frames'],1)
 def test_duplicate_is_false_positive(self):
  r=score(dataset(),{1:[obj(),obj(),obj(20,0,'person')]});self.assertEqual(r['overall']['false_positive'],1)
 def test_wrong_class_misses_and_false_positive(self):
  r=score(dataset(),{1:[obj(10,0,'person')]});self.assertEqual(r['overall']['false_positive'],1);self.assertEqual(r['overall']['false_negative'],2)
 def test_class_specific_location_gates(self):
  r=score(dataset(),{1:[obj(12.9),obj(21.1,0,'person')]});self.assertEqual(r['overall']['true_positive'],1);self.assertEqual(r['overall']['false_positive'],1)
 def test_known_ignored_object(self):
  r=score(dataset(),{1:[obj(),obj(20,0,'person'),obj(40)]});self.assertEqual(r['ignored_predictions'],1);self.assertEqual(r['overall']['f1'],1)
 def test_unreviewed_frames_do_not_change_metrics(self):
  r=score(dataset(),{1:[obj(),obj(20,0,'person')],2:[obj(500)]});self.assertEqual(r['overall']['f1'],1);self.assertEqual(r['unreviewed_output_frames_not_scored'],1)
 def test_maximum_cardinality_before_distance(self):
  m=match([obj(0),obj(1.4)],[obj(.5),obj(-.9)],1.1);self.assertEqual({(i,j) for i,j,_ in m},{(0,1),(1,0)})
 def test_blocked_set_rejected(self):
  d=dataset();d['status']='blocked_missing_lidar_body_returns'
  with self.assertRaises(ValueError):score(d,{})
 def test_empty_ground_truth_set_rejected(self):
  d=dataset();d['frames'][0]['objects']=[]
  with self.assertRaises(ValueError):score(d,{})
 def test_duplicate_timestamps_rejected(self):
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'predictions.jsonl';p.write_text('{"stamp_ns":1,"frame_id":"base_link","objects":[]}\n'*2)
   with self.assertRaises(ValueError):load_predictions(p,'')
if __name__=='__main__':unittest.main()
