"""Portable detection evaluator. The selected benchmark determines reference times."""
import argparse
import collections
import json
import math
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment


def message_typestore():
    from rosbags.typesys import Stores, get_typestore, get_types_from_msg
    store = get_typestore(Stores.ROS2_HUMBLE)
    definitions = {}
    for name in ('DetectedObject', 'DetectedObjectArray'):
        definitions.update(get_types_from_msg(
            Path(__file__).with_name(name + '.msg').read_text(),
            'project1_interfaces/msg/' + name))
    store.register(definitions)
    return store


def load_predictions(path, topic):
    if path.is_dir():
        from rosbags.highlevel import AnyReader
        rows = []
        with AnyReader([path], default_typestore=message_typestore()) as reader:
            connections = [c for c in reader.connections if c.topic == topic]
            if not connections:
                raise ValueError(f'Missing output topic {topic}. Pass your prediction bag, not the input sensor bag.')
            if any(c.msgtype != 'project1_interfaces/msg/DetectedObjectArray' for c in connections):
                raise ValueError('Output topic must use project1_interfaces/msg/DetectedObjectArray')
            for connection, _, data in reader.messages(connections=connections):
                msg = reader.deserialize(data, connection.msgtype)
                rows.append({'stamp_ns': int(msg.header.stamp.sec) * 10**9 + int(msg.header.stamp.nanosec),
                             'frame_id': msg.header.frame_id,
                             'objects': [{'class_name': o.class_name, 'confidence': float(o.confidence),
                                          'x': float(o.x), 'y': float(o.y)} for o in msg.objects]})
    else:
        text = path.read_text(encoding='utf-8-sig').strip()
        rows = json.loads(text) if text.startswith('[') else [json.loads(line) for line in text.splitlines() if line.strip()]
    result = {}
    for row in rows:
        stamp = row['stamp_ns']
        if type(stamp) is not int or stamp < 0:
            raise ValueError('stamp_ns must be a nonnegative integer in nanoseconds')
        if stamp in result:
            raise ValueError(f'Duplicate output stamp {stamp}; publish one fused array per reference timestamp')
        if row['frame_id'] != 'base_link':
            raise ValueError('Output coordinates must use frame_id base_link')
        if not isinstance(row['objects'], list):
            raise ValueError('objects must be a list, including [] for no detections')
        for obj in row['objects']:
            if obj['class_name'] not in ('car', 'person'):
                raise ValueError('class_name must be car or person; omit other classes')
            if not all(type(obj[k]) in (int, float) and math.isfinite(obj[k]) for k in ('confidence', 'x', 'y')):
                raise ValueError('Detection confidence/x/y must be finite numbers')
            if not 0 <= obj['confidence'] <= 1:
                raise ValueError('Confidence must be within [0,1]')
        result[stamp] = row['objects']
    return result

def match(predictions, targets, tolerance):
    """Maximum cardinality within the gate, then minimum total planar distance."""
    if not predictions or not targets:return []
    d=np.linalg.norm(np.array([[p['x'],p['y']] for p in predictions])[:,None,:]-np.array([[g['x'],g['y']] for g in targets])[None,:,:],axis=2)
    penalty=(min(d.shape)+1)*(tolerance+1)
    rows,cols=linear_sum_assignment(np.where(d<=tolerance,d,penalty))
    return [(int(i),int(j),float(d[i,j])) for i,j in zip(rows,cols) if d[i,j]<=tolerance]


def metrics(tp,fp,fn,errors):
    precision=tp/(tp+fp) if tp+fp else None
    recall=tp/(tp+fn) if tp+fn else None
    return {'true_positive':tp,'false_positive':fp,'false_negative':fn,'precision':precision,'recall':recall,
            'f1':2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else None,
            'matched_xy_error_mean_m':float(np.mean(errors)) if errors else None,
            'matched_xy_error_median_m':float(np.median(errors)) if errors else None,
            'matched_xy_error_p90_m':float(np.percentile(errors,90)) if errors else None}


def score(evaluation,predictions):
    if evaluation.get('status')!='ready_for_instructor_use':raise ValueError('Evaluation is not ready: '+str(evaluation.get('status')))
    frames=evaluation['frames'];classes=evaluation['classes'];threshold=evaluation['confidence_threshold']
    totals={c:collections.Counter() for c in classes};errors={c:[] for c in classes};details=[];covered=0
    if not any(o['eligibility']=='eligible' for f in frames for o in f['objects']):raise ValueError('No eligible targets; cannot assign a score')
    for frame in frames:
        present=frame['stamp_ns'] in predictions;covered+=present
        raw=predictions.get(frame['stamp_ns'],[])
        detail={'id':frame['id'],'stamp_ns':frame['stamp_ns'],'output_present':present,'classes':{}}
        for category in classes:
            tolerance=evaluation['location_tolerance_by_class_m'][category]
            pred=[p for p in raw if p['class_name']==category and p['confidence']>=threshold]
            gt=[g for g in frame['objects'] if g['class_name']==category and g['eligibility']=='eligible']
            ignored=[g for g in frame['objects'] if g['class_name']==category and g['eligibility']=='ignore']
            matches=match(pred,gt,tolerance);used={i for i,_,_ in matches}
            # An extra prediction near an eligible object is always a duplicate FP,
            # even if an ignored actor happens to be nearby. Ignore other unmatched
            # predictions near a known excluded actor, using the same class gate.
            ignored_indices=[]
            for i,p in enumerate(pred):
                if i in used:continue
                close=lambda g:math.hypot(p['x']-g['x'],p['y']-g['y'])<=tolerance
                if not any(close(g) for g in gt) and any(close(g) for g in ignored):ignored_indices.append(i)
            tp=len(matches);fp=len(pred)-tp-len(ignored_indices);fn=len(gt)-tp
            e=[distance for _,_,distance in matches];errors[category].extend(e)
            totals[category].update(tp=tp,fp=fp,fn=fn,ignored_predictions=len(ignored_indices))
            detail['classes'][category]={'tp':tp,'fp':fp,'fn':fn,'ignored_predictions':len(ignored_indices),
                'matches':[{'prediction_index_within_class':i,'actor_id':gt[j]['actor_id'],'xy_error_m':distance} for i,j,distance in matches]}
        details.append(detail)
    combined=sum(totals.values(),collections.Counter());all_errors=[e for c in classes for e in errors[c]]
    per_class={c:metrics(totals[c]['tp'],totals[c]['fp'],totals[c]['fn'],errors[c]) for c in classes}
    overall=metrics(combined['tp'],combined['fp'],combined['fn'],all_errors)
    return {'status':'scored','reviewed_frames':len(frames),'reviewed_frames_with_output':covered,
            'output_coverage':covered/len(frames),'missing_reviewed_frames':len(frames)-covered,
            'unreviewed_output_frames_not_scored':len(set(predictions)-{f['stamp_ns'] for f in frames}),
            'confidence_threshold':threshold,'location_tolerance_by_class_m':evaluation['location_tolerance_by_class_m'],
            'position_reference':evaluation['location_reference'],'overall':overall,'per_class':per_class,
            'joint_detection_localization_score_percent':100*overall['f1'] if overall['f1'] is not None else None,
            'scoring_note':'Joint class-and-location micro F1; this is a benchmark metric, not an assigned course grade. Missing keyframe outputs count as empty predictions. Matched-location errors exclude misses.',
            'ignored_predictions':combined['ignored_predictions'],'frames':details}


def run(dataset_id):
    parser = argparse.ArgumentParser(description='Evaluate ' + dataset_id + ' predictions against the bundled public reference subset.')
    parser.add_argument('predictions', type=Path, help='Output ROS 2 bag directory or JSON/JSONL file')
    parser.add_argument('--output', type=Path, default=Path('score.json'))
    parser.add_argument('--topic', default='/project1/detected_objects')
    args = parser.parse_args()
    try:
        evaluation = json.loads(Path(__file__).with_name('evaluation_set.json').read_text())
        if evaluation['dataset_id'] != dataset_id:
            raise ValueError('Wrong reference file for this evaluator; extract the complete matching ZIP')
        predictions = load_predictions(args.predictions, args.topic)
        report = score(evaluation, predictions)
        valid = set(evaluation['valid_output_stamps_ns'])
        invalid = sorted(set(predictions) - valid)
        report.update(dataset_id=dataset_id, reference_name=evaluation['name'],
                      reference_coverage_note=evaluation['review_coverage'],
                      timing={'input_rows': len(predictions), 'valid_reference_stamps': len(valid),
                              'rows_at_valid_reference_times': len(set(predictions) & valid),
                              'rows_off_reference_clock': len(invalid),
                              'first_off_reference_stamps_ns': invalid[:10],
                              'all_scan_output_coverage': len(set(predictions) & valid) / len(valid),
                              'matching_policy': 'Exact acquisition header timestamps. No rounding, interpolation, or timestamp snapping in the evaluator.'})
        report['warnings'] = []
        if invalid:
            report['warnings'].append('Some outputs do not match any original LiDAR timestamp. Use the input header stamp, not wall time, camera time, or bag arrival time. Missing reviewed stamps count as empty predictions.')
        if not report['reviewed_frames_with_output']:
            report['warnings'].append('No output matched a reviewed timestamp. Check dataset selection, units, and timestamp preservation.')
        report['evaluation_scope'] = 'Public self-check subset. Does not directly verify that both sensor modalities or temporal compensation were used. Not a hidden test or a full-sequence accuracy measurement.'
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
        print(json.dumps({k: v for k, v in report.items() if k != 'frames'}, indent=2))
        print(f'Report saved to {args.output.resolve()}')
    except (ValueError, KeyError, TypeError, OSError) as exc:
        parser.exit(2, f'Evaluation error: {exc}\n')
