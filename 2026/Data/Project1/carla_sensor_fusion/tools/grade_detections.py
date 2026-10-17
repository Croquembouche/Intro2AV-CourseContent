#!/usr/bin/env python3
"""Score timestamped student detections against the explicitly reviewed keyframes."""
import argparse,collections,json,math
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment


def load_predictions(path, topic):
    if path.is_dir():
        import rosbag2_py
        from rclpy.serialization import deserialize_message
        from rosidl_runtime_py.utilities import get_message
        reader=rosbag2_py.SequentialReader()
        reader.open(rosbag2_py.StorageOptions(uri=str(path),storage_id='sqlite3'),rosbag2_py.ConverterOptions('',''))
        types={t.name:t.type for t in reader.get_all_topics_and_types()}
        if topic not in types:raise ValueError(f'Missing topic {topic}')
        if types[topic]!='project1_interfaces/msg/DetectedObjectArray':raise ValueError('Unexpected output message type')
        cls=get_message(types[topic]);rows=[]
        while reader.has_next():
            name,data,_=reader.read_next()
            if name!=topic:continue
            msg=deserialize_message(data,cls)
            rows.append({'stamp_ns':msg.header.stamp.sec*10**9+msg.header.stamp.nanosec,'frame_id':msg.header.frame_id,
                         'objects':[{'class_name':o.class_name,'confidence':float(o.confidence),'x':float(o.x),'y':float(o.y)} for o in msg.objects]})
    else:
        text=path.read_text().strip()
        rows=json.loads(text) if text.startswith('[') else [json.loads(line) for line in text.splitlines() if line.strip()]
    result={}
    for row in rows:
        stamp=row['stamp_ns']
        if not isinstance(stamp,int) or stamp<0:raise ValueError('stamp_ns must be a nonnegative integer')
        if stamp in result:raise ValueError(f'Duplicate output stamp {stamp}; publish once per sensor pair')
        if row['frame_id']!='base_link':raise ValueError('Output coordinates must use frame_id base_link')
        for obj in row['objects']:
            if not isinstance(obj['class_name'],str):raise ValueError('class_name must be a string')
            if not all(math.isfinite(obj[k]) for k in ('confidence','x','y')):raise ValueError('Detection contains nonfinite values')
            if not 0<=obj['confidence']<=1:raise ValueError('Confidence must be within [0,1]')
        result[stamp]=row['objects']
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


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('predictions',type=Path,help='Student ROS 2 SQLite bag directory, or JSON/JSONL output')
    parser.add_argument('--evaluation',type=Path,default=Path(__file__).resolve().parents[1]/'instructor/front_camera_evaluation/evaluation_set.json')
    parser.add_argument('--topic',default='/project1/detected_objects')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();evaluation=json.loads(args.evaluation.read_text())
    report=score(evaluation,load_predictions(args.predictions,args.topic))
    args.output.write_text(json.dumps(report,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='frames'},indent=2))
if __name__=='__main__':main()
