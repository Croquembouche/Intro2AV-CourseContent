import copy,json,tempfile,unittest
from pathlib import Path
from evaluate_sync import evaluate,geometry_errors,load_predictions


def box(center=(0.,0.,0.),size=(4.,2.,2.),category='car'):
 return dict(class_name=category,center=list(center),size=list(size))

def reference():
 return dict(classes=['car','person'],valid_output_stamps_ns=[1,2],frames=[dict(id='frame',stamp_ns=1,objects=[box()|dict(actor_id=1,eligibility='eligible'),box((10.,0.,0.))|dict(actor_id=2,eligibility='eligible')])])

class Tests(unittest.TestCase):
 def test_perfect(self):
  r=evaluate(reference(),{1:[box(),box((10.,0.,0.))]})
  self.assertEqual(r['overall']['center_error_m']['mean'],0.)
  self.assertEqual(r['overall']['bbox_corner_mean_error_m']['mean'],0.)
  self.assertEqual(r['status'],'complete')
 def test_345_translation(self):
  r=geometry_errors(box((3.,4.,0.)),box())
  self.assertEqual(r['center_error_m'],5.)
  self.assertEqual(r['dimension_mae_m'],0.)
  self.assertEqual(r['bbox_corner_mean_error_m'],5.)
 def test_size_only(self):
  r=geometry_errors(box(size=(6.,2.,2.)),box())
  self.assertEqual(r['center_error_m'],0.)
  self.assertAlmostEqual(r['dimension_mae_m'],2/3)
  self.assertEqual(r['bbox_corner_mean_error_m'],1.)
 def test_no_distance_gate(self):
  r=evaluate(reference(),{1:[box((100.,0.,0.)),box((110.,0.,0.))]})
  self.assertEqual(r['overall']['center_error_m']['mean'],100.)
 def test_order_independent_correspondence(self):
  r=evaluate(reference(),{1:[box((10.,0.,0.)),box()]})
  self.assertEqual(r['overall']['center_error_m']['mean'],0.)
 def test_explicit_id_prevents_nearest_reassignment(self):
  r=evaluate(reference(),{1:[box((10.,0.,0.))|dict(target_id='frame_actor_1'),box()|dict(target_id='frame_actor_2')]})
  self.assertEqual(r['overall']['center_error_m']['mean'],10.)
 def test_unknown_id_rejected(self):
  with self.assertRaises(ValueError):evaluate(reference(),{1:[box()|dict(target_id='bad')]})
 def test_wrong_class_id_rejected(self):
  with self.assertRaises(ValueError):evaluate(reference(),{1:[box(category='person')|dict(target_id='frame_actor_1')]})
 def test_missing_not_zero(self):
  r=evaluate(reference(),{})
  self.assertIsNone(r['overall']['center_error_m'])
  self.assertEqual(r['coverage']['missing_measurements'],2)
 def test_partial_not_complete(self):
  r=evaluate(reference(),{1:[box()]})
  self.assertEqual(r['overall']['center_error_m']['mean'],0.)
  self.assertEqual(r['coverage']['missing_measurements'],1)
  self.assertNotEqual(r['status'],'complete')
 def test_extra_not_detector_penalty(self):
  r=evaluate(reference(),{1:[box(),box((10.,0.,0.)),box((30.,0.,0.))]})
  self.assertEqual(r['overall']['center_error_m']['mean'],0.)
  self.assertEqual(r['coverage']['unused_submissions_at_reviewed_frames'],1)
 def test_off_clock(self):
  r=evaluate(reference(),{3:[box()]})
  self.assertEqual(r['coverage']['off_clock_output_rows'],1)
  self.assertIsNone(r['overall']['center_error_m'])
 def test_no_orientation_or_confidence_required(self):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t)/'p.json';p.write_text(json.dumps([dict(stamp_ns=1,frame_id='base_link',objects=[box()])]))
   self.assertEqual(load_predictions(p)[1],[box()])
 def test_invalid_inputs(self):
  row=dict(stamp_ns=1,frame_id='base_link',objects=[box()])
  with tempfile.TemporaryDirectory() as t:
   p=Path(t)/'p.json';p.write_text(json.dumps([row,row]))
   with self.assertRaises(ValueError):load_predictions(p)
   for k,v in [('size',[0,2,3]),('center',[float('nan'),0,0])]:
    r=copy.deepcopy(row);r['objects'][0][k]=v;p.write_text(json.dumps([r]))
    with self.assertRaises(ValueError):load_predictions(p)

if __name__=='__main__':unittest.main()
