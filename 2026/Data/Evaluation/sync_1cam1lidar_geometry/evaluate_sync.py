#!/usr/bin/env python3
"""Measure synchronized camera/LiDAR overlay geometry, not detector accuracy."""
import argparse
import itertools
import json
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment


def load_predictions(path):
    text = Path(path).read_text(encoding='utf-8-sig').strip()
    rows = json.loads(text) if text.startswith('[') else [json.loads(line) for line in text.splitlines() if line.strip()]
    if not isinstance(rows, list):
        raise ValueError('Input must be a JSON array or one frame per JSONL line')
    result = {}
    for row in rows:
        stamp = row['stamp_ns']
        if type(stamp) is not int or stamp < 0:
            raise ValueError('stamp_ns must be a nonnegative integer nanosecond timestamp')
        if stamp in result:
            raise ValueError(f'Duplicate timestamp {stamp}; use one frame array')
        if row['frame_id'] != 'base_link':
            raise ValueError('frame_id must be base_link at the original acquisition time')
        if not isinstance(row['objects'], list):
            raise ValueError('objects must be a list')
        ids = set()
        for obj in row['objects']:
            if obj['class_name'] not in ('car', 'person'):
                raise ValueError('class_name must be car or person')
            for name in ['center', 'size']:
                v = obj[name]
                if not isinstance(v, list) or len(v) != 3 or any(type(x) not in (int, float) for x in v) or not np.isfinite(v).all():
                    raise ValueError(f'{name} must contain three finite numbers')
            if any(x <= 0 for x in obj['size']):
                raise ValueError('size must contain positive full box dimensions')
            if 'target_id' in obj:
                if not isinstance(obj['target_id'], str) or obj['target_id'] in ids:
                    raise ValueError('Optional target_id must be a unique string within each frame')
                ids.add(obj['target_id'])
        result[stamp] = row['objects']
    return result


def geometry_errors(prediction, reference):
    delta = np.array(prediction['center']) - reference['center']
    size_delta = np.array(prediction['size']) - reference['size']
    signs = np.array(list(itertools.product([-1., 1.], repeat=3)))
    # Same-sign corner correspondence in the shared base_link axes.
    corner_delta = delta + signs * size_delta / 2
    distances = np.linalg.norm(corner_delta, axis=1)
    return dict(center_error_m=float(np.linalg.norm(delta)), center_signed_error_xyz_m=delta.tolist(),
                dimension_signed_error_xyz_m=size_delta.tolist(), dimension_mae_m=float(np.abs(size_delta).mean()),
                bbox_corner_mean_error_m=float(distances.mean()), bbox_corner_max_error_m=float(distances.max()))


def summarize(records):
    if not records:
        return dict(measurements=0, center_error_m=None, dimension_mae_xyz_m=None,
                    dimension_mae_m=None, bbox_corner_mean_error_m=None,
                    note='No matched measurements; no geometric error can be calculated.')
    errors = np.array([r['center_error_m'] for r in records])
    corners = np.array([r['bbox_corner_mean_error_m'] for r in records])
    dimensions = np.abs([r['dimension_signed_error_xyz_m'] for r in records])
    def stats(v):
        return dict(mean=float(v.mean()), median=float(np.median(v)), rmse=float(np.sqrt(np.mean(v*v))),
                    p90=float(np.percentile(v,90)), maximum=float(v.max()))
    return dict(measurements=len(records), center_error_m=stats(errors),
                dimension_mae_xyz_m=dimensions.mean(axis=0).tolist(),dimension_mae_m=float(dimensions.mean()),
                bbox_corner_mean_error_m=stats(corners))


def evaluate(reference, predictions):
    details, missing, unused = [], [], []
    reviewed = {f['stamp_ns'] for f in reference['frames']}
    for frame in reference['frames']:
        stamp = frame['stamp_ns']
        targets = [g for g in frame['objects'] if g['eligibility']=='eligible']
        submitted = predictions.get(stamp, [])
        by_id = {f"{frame['id']}_actor_{g['actor_id']}": j for j,g in enumerate(targets)}
        pairs, used_p, used_g = [], set(), set()
        for i,p in enumerate(submitted):
            if 'target_id' not in p:continue
            target_id=p['target_id']
            if target_id not in by_id:
                raise ValueError(f'Unknown target_id {target_id} at stamp {stamp}; consult targets.json')
            j=by_id[target_id]
            if p['class_name'] != targets[j]['class_name']:
                raise ValueError(f'Class does not match the selected reference object {target_id}')
            if j in used_g:raise ValueError(f'Duplicate target {target_id}')
            pairs.append((i,j,'explicit_target_id'));used_p.add(i);used_g.add(j)
        # Geometric correspondence only, not detection matching. No distance gate:
        # a poor overlay must retain its large error rather than become a miss.
        for category in reference['classes']:
            pi=[i for i,p in enumerate(submitted) if i not in used_p and p['class_name']==category]
            gi=[j for j,g in enumerate(targets) if j not in used_g and g['class_name']==category]
            if not pi or not gi:continue
            distance=np.linalg.norm(np.array([submitted[i]['center'] for i in pi])[:,None,:]-np.array([targets[j]['center'] for j in gi])[None,:,:],axis=2)
            rows,cols=linear_sum_assignment(distance)
            for r,c in zip(rows,cols):
                i,j=pi[r],gi[c];pairs.append((i,j,'minimum_total_center_distance'));used_p.add(i);used_g.add(j)
        for i,j,method in pairs:
            g=targets[j]
            details.append(dict(stamp_ns=stamp,target_id=f"{frame['id']}_actor_{g['actor_id']}",class_name=g['class_name'],
                correspondence=method,submitted_center=submitted[i]['center'],reference_center=g['center'],
                submitted_size=submitted[i]['size'],reference_size=g['size'],**geometry_errors(submitted[i],g)))
        missing.extend(dict(stamp_ns=stamp,target_id=f"{frame['id']}_actor_{g['actor_id']}",class_name=g['class_name']) for j,g in enumerate(targets) if j not in used_g)
        unused.extend(dict(stamp_ns=stamp,object_index=i,class_name=p['class_name']) for i,p in enumerate(submitted) if i not in used_p)
    invalid=sorted(predictions.keys()-set(reference['valid_output_stamps_ns']))
    return dict(status='complete' if not missing and not unused and not invalid else 'incomplete_or_needs_correspondence_review',
        task='Sensor overlay geometry; no detection AP, precision, recall, confidence threshold, or grade.',
        overall=summarize(details),per_class={c:summarize([r for r in details if r['class_name']==c]) for c in reference['classes']},
        coverage=dict(reference_measurements=len(details)+len(missing),measured_objects=len(details),
                      missing_measurements=len(missing),unused_submissions_at_reviewed_frames=len(unused),
                      reviewed_frames=len(reviewed),reviewed_frames_with_output=len(reviewed & predictions.keys()),
                      unreviewed_output_frames_not_evaluated=len(predictions.keys()-reviewed),off_clock_output_rows=len(invalid)),
        notes=['Errors describe matched measurements only. Missing/unused measurements are listed separately, without a detector penalty.',
               'Without target_id, same-class objects are paired by minimum total 3D center distance. Use optional IDs from targets.json for unambiguous correspondence.',
               'Boxes are axis-aligned in base_link. Corner error measures placement and dimensions together; dimension error isolates size.',
               'This checks submitted 3D geometry; it does not directly inspect image projections or prove that camera/LiDAR overlays are correct.'],
        measurements=details,missing_measurements=missing,unused_submissions=unused,first_off_clock_stamps_ns=invalid[:10])


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('predictions',type=Path,help='JSON/JSONL measurements; see README')
    p.add_argument('--output',type=Path,default=Path('geometry_errors.json'))
    a=p.parse_args()
    try:
        reference=json.loads(Path(__file__).with_name('evaluation_set.json').read_text())
        report=evaluate(reference,load_predictions(a.predictions))
        a.output.parent.mkdir(parents=True,exist_ok=True)
        a.output.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
        overall=report['overall']
        print('Status:',report['status'])
        print(f"Measured objects: {report['coverage']['measured_objects']}/{report['coverage']['reference_measurements']}")
        if overall['measurements']:
            print(f"Mean 3D center error: {overall['center_error_m']['mean']:.4f} m")
            print(f"Mean box dimension error: {overall['dimension_mae_m']:.4f} m")
            print(f"Mean 3D box corner error: {overall['bbox_corner_mean_error_m']['mean']:.4f} m")
        else:print('No matched measurements: errors are undefined (null), not zero.')
        print('Report:',a.output.resolve())
    except (ValueError,KeyError,TypeError,OSError) as exc:p.exit(2,f'Evaluation error: {exc}\n')

if __name__=='__main__':main()
