#!/usr/bin/env python3
"""Cross-check exported box transforms against CARLA's own geometry functions."""
import argparse,gzip,itertools,json
from pathlib import Path
import carla
import numpy as np
p=argparse.ArgumentParser(description=__doc__);p.add_argument('ground_truth',type=Path);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
with gzip.open(args.ground_truth,'rt') as source:r=json.loads(next(source))
def transform(p):return carla.Transform(carla.Location(**{k:p[k] for k in ('x','y','z')}),carla.Rotation(**{k:p[k] for k in ('pitch','yaw','roll')}))
einv=np.array(transform(r['ego_world_pose_carla']).get_inverse_matrix());errors=[]
for o in r['objects']:
 b=o['bounding_box_local_carla'];bb=carla.BoundingBox(carla.Location(**b['location']),carla.Vector3D(**b['extent']));bb.rotation=carla.Rotation(**b['rotation'])
 verts=np.array([[v.x,v.y,v.z,1] for v in bb.get_world_vertices(transform(o['world_pose_carla']))]);expected=(verts@einv.T)[:,:3]*[1,-1,1]
 extent=np.array([b['extent'][k] for k in ('x','y','z')]);local=np.array(list(itertools.product((-1,1),repeat=3)))*extent
 actual=(np.c_[local,np.ones(8)]@np.array(o['T_base_from_bbox_carla']).T)[:,:3]
 errors.append(float(np.linalg.norm(expected[:,None,:]-actual[None,:,:],axis=2).min(axis=1).max()))
if not errors or max(errors)>=.001:raise RuntimeError(f'Box transform disagreement: {max(errors,default=-1)}')
result={'status':'passed','actors_checked':len(errors),'maximum_vertex_disagreement_m':max(errors),'method':'Compare all eight exported box vertices against CARLA BoundingBox.get_world_vertices and Transform.get_inverse_matrix. No simulator clock is involved.'}
args.output.write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
