#!/usr/bin/env python3
"""Build the grading set from explicit RGB and LiDAR-overlay review decisions."""
import argparse,collections,hashlib,html,json,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
DEFAULT_ROOT=Path(__file__).resolve().parents[1]
CLASSES=['car','person']


def lidar_support(obj,box,base,uv,optical):
    xmin,ymin,xmax,ymax=box
    valid=(optical[:,2]>0)&(uv[:,0]>=xmin)&(uv[:,0]<=xmax)&(uv[:,1]>=ymin)&(uv[:,1]<=ymax)
    transform=obj.get('T_base_from_bbox_carla')
    if transform is None:raise ValueError('Full CARLA bounding-box geometry is required for the corrected review')
    local=(np.c_[base,np.ones(len(base))]@np.linalg.inv(transform).T)[:,:3]
    ext=np.array([obj['half_extent'][k] for k in ('x','y','z')])
    valid&=(np.abs(local)<=ext+.15).all(axis=1)
    valid&=local[:,2]>=-ext[2]+.25  # do not accept road points under a vehicle
    return base[valid],uv[valid]


def build(root):
    out=root/'instructor/front_camera_evaluation'
    candidates={f['id']:f for f in json.loads((out/'candidate_frames.json').read_text())}
    decisions=json.loads((out/'review_decisions.json').read_text());results=[]
    if {f['id'] for f in decisions}!=set(candidates):raise ValueError('Every candidate keyframe needs an explicit review')
    for review in decisions:
        frame=candidates[review['id']];folder=out/'frames'/frame['id'];points=np.load(folder/'points.npz')
        base,uv,optical=points['base'],points['uv'],points['optical']
        visible={x['actor_id']:x for x in review['eligible']};ignored={x['actor_id']:x for x in review['manual_ignored']}
        if set(visible)&set(ignored):raise ValueError('Conflicting actor review decisions')
        objects=[];rgb=Image.open(folder/'camera.png').convert('RGB');proof=rgb.copy();draw=ImageDraw.Draw(rgb);pd=ImageDraw.Draw(proof)
        for source in frame['objects']:
            obj=dict(source);aid=obj['actor_id'];category=obj['class_name']
            if aid in visible:
                annotation=visible[aid];box=annotation['bbox_xyxy'];xmin,ymin,xmax,ymax=box
                if category not in CLASSES or obj['range_m']>60 or not (0<=xmin<xmax<=640 and 0<=ymin<ymax<=360):raise ValueError('Invalid eligible annotation')
                support,pixels=lidar_support(obj,box,base,uv,optical)
                supported=len(support)>=5
                obj.update(annotation,camera_visible=True,eligibility='eligible' if supported else 'ignore',
                    reason='visually_confirmed_with_lidar_body_support' if supported else 'insufficient_lidar_body_support',
                    lidar_support_count=len(support),lidar_support_median_xy=np.median(support[:,:2],axis=0).tolist() if len(support) else None,
                    support_rule='Positive optical depth; inside reviewed RGB box and full oriented CARLA bounding box with 0.15 m margin; exclude the bottom 0.25 m of the box. Geometric association, not semantic point labels.')
                np.savez_compressed(folder/f'actor_{aid}_support.npz',base=support,uv=pixels)
                color='#38f09a' if supported else '#62c8ff'
                draw.rectangle(box,outline=color,width=2)
                draw.text((xmin,max(2,ymin-15)),f'{category} {aid} | {len(support)} pts',fill=color,stroke_width=1,stroke_fill='black')
                for u,v in pixels:pd.ellipse((u-1,v-1,u+1,v+1),fill=color)
                pd.rectangle(box,outline=color,width=1)
            elif aid in ignored:
                obj.update(ignored[aid],eligibility='ignore')
                if obj.get('bbox_xyxy'):draw.rectangle(obj['bbox_xyxy'],outline='#ffbf5f',width=1)
            elif category not in CLASSES:obj.update(eligibility='ignore',reason='class_not_evaluated')
            elif obj['range_m']>60:obj.update(eligibility='ignore',reason='outside_60m_range')
            elif not obj.get('candidate_uv') or not (0<=obj['candidate_uv'][0]<640 and 0<=obj['candidate_uv'][1]<360):obj.update(eligibility='ignore',reason='center_outside_front_image')
            else:raise ValueError(f'Unresolved in-scope actor {frame["id"]} {aid} ({category})')
            objects.append(obj)
        rgb.save(folder/'reviewed.png');proof.save(folder/'lidar_support.png')
        result={k:frame[k] for k in ('id','sequence','stamp_ns','carla_frame','relative_time_seconds')}
        result.update(review_status=review['review_status'],reviewer=review['reviewer'],review_note=review['frame_note'],
                      image_sha256=hashlib.sha256((folder/'camera.png').read_bytes()).hexdigest(),objects=objects)
        results.append(result)
    eligible=[o for f in results for o in f['objects'] if o['eligibility']=='eligible']
    all_support_reviewed=bool(eligible) and all(o.get('support_reviewed',False) for o in eligible)
    status='ready_for_instructor_use' if all_support_reviewed else 'pending_lidar_overlay_review' if eligible else 'blocked_missing_lidar_body_returns'
    dataset={'schema_version':2,'status':status,'name':'Project 1 corrected front-camera evaluation',
             'classes':CLASSES,'max_range_m':60.,'confidence_threshold':.25,'location_tolerance_by_class_m':{'car':3.,'person':1.},
             'location_reference':'CARLA bounding-box center in ROS base_link. Car tolerance 3 m allows coarse visible-surface/cluster estimates; person tolerance 1 m. These are configurable benchmark defaults.',
             'minimum_lidar_support':5,'review_coverage':f'Only the {len(results)} explicitly reviewed keyframes. No labels are inferred for intervening frames.',
             'review_method':'Codex visual inspection of RGB, CARLA actor candidate identities, and body-support overlays. Prepared for instructor use; no instructor sign-off is implied.',
             'frames':results}
    (out/'evaluation_set.json').write_text(json.dumps(dataset,indent=2))
    summary={'status':status,'reviewed_frames':len(results),'positive_frames':sum(any(o['eligibility']=='eligible' for o in f['objects']) for f in results),
             'eligible_instances':len(eligible),'unique_eligible_actor_ids':sorted({o['actor_id'] for o in eligible}),
             'classes':dict(collections.Counter(o['class_name'] for o in eligible)),
             'camera_visible_instances':sum(o.get('camera_visible',False) for f in results for o in f['objects']),
             'minimum_observed_support_points':min((o['lidar_support_count'] for o in eligible),default=0),
             'maximum_observed_support_points':max((o['lidar_support_count'] for o in eligible),default=0),
             'ignored_by_reason':dict(collections.Counter(o['reason'] for f in results for o in f['objects'] if o['eligibility']=='ignore'))}
    (out/'summary.json').write_text(json.dumps(summary,indent=2));build_html(out,results,summary)
    print(json.dumps(summary,indent=2))
    for f in results:print(f['id'],[(o['actor_id'],o['lidar_support_count']) for o in f['objects'] if o.get('camera_visible')])


def build_html(out,frames,summary):
    parts=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Project 1 corrected visibility review</title><style>body{font:16px/1.5 system-ui;max-width:1380px;margin:30px auto;padding:0 20px;background:#101923;color:#e7eef5}a{color:#78ccff}.images{display:grid;grid-template-columns:1fr 1fr;gap:12px}img{width:100%;height:auto}figure{margin:0}article{border-top:1px solid #405061;margin-top:36px;padding-top:16px}table{border-collapse:collapse;width:100%}td,th{text-align:left;border-bottom:1px solid #405061;padding:6px}code{color:#ffd788}@media(max-width:800px){.images{grid-template-columns:1fr}}</style><h1>Front-camera evaluation — corrected CPU capture</h1>']
    parts.append(f'<p><strong>Status: {html.escape(summary["status"].replace("_", " "))}</strong> · {summary["reviewed_frames"]} reviewed keyframes · {summary["eligible_instances"]} eligible instances. Green: supported target. Blue: camera visible, insufficient LiDAR support. Orange: excluded target.</p>')
    parts.append('<p>Classes: car and person; maximum range 60 m. Locations are CARLA bounding-box centers. Default planar tolerances: car 3 m, person 1 m. The geometric point associations are visually checked; they are not semantic LiDAR labels. Prepared by Codex for instructor review and use.</p><p><a href="evaluation_set.json">Machine-readable labels</a> · <a href="GRADING.md">Grading instructions</a></p>')
    for f in frames:
        eligible=[o for o in f['objects'] if o['eligibility']=='eligible'];ignored=[o for o in f['objects'] if o.get('bbox_xyxy') and o['eligibility']=='ignore']
        fid=f['id'];parts.append(f'<article id="{fid}"><h2>{fid} — {len(eligible)} eligible</h2><p>Stamp: <code>{f["stamp_ns"]}</code> ns; CARLA frame {f["carla_frame"]}. <a href="frames/{fid}/camera.png">Original RGB</a></p><p>{html.escape(f["review_note"])}</p><div class="images"><figure><img src="frames/{fid}/reviewed.png" alt="Reviewed RGB {fid}"><figcaption>Visibility decisions</figcaption></figure><figure><img src="frames/{fid}/lidar_support.png" alt="LiDAR support {fid}"><figcaption>LiDAR body-support candidates</figcaption></figure></div>')
        parts.append('<table><tr><th>Actor</th><th>Decision</th><th>Class</th><th>Center x / y (m)</th><th>Support</th><th>Review note</th></tr>')
        for o in eligible+ignored:parts.append(f'<tr><td>{o["actor_id"]}</td><td>{o["eligibility"]}</td><td>{o["class_name"]}</td><td>{o["x"]:.2f} / {o["y"]:.2f}</td><td>{o.get("lidar_support_count","—")}</td><td>{html.escape(o.get("review_note",""))}</td></tr>')
        parts.append('</table><details><summary>All exclusions</summary><ul>')
        for o in f['objects']:
            if o['eligibility']=='ignore':parts.append(f'<li>{o["actor_id"]} {o["class_name"]}: {html.escape(o["reason"])}</li>')
        parts.append('</ul></details></article>')
    parts.append('</html>');(out/'review.html').write_text(''.join(parts))


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',type=Path,default=DEFAULT_ROOT);args=parser.parse_args();build(args.root)
if __name__=='__main__':main()
