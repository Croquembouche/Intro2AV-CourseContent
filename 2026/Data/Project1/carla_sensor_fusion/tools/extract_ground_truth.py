#!/usr/bin/env python3
"""Export synchronized CARLA actor-reference positions for instructor evaluation."""
import argparse
import collections
import gzip
import json
import math
from pathlib import Path
import numpy as np


def rotation(p):
    # This CARLab build uses Rz(yaw) @ Ry(pitch) @ Rx(roll), as verified
    # against the simulator host's Rotation.h and Python Transform API.
    # Older upstream CARLA wheels use different pitch/roll signs.
    pitch, yaw, roll = (math.radians(p.get(k, 0)) for k in ('pitch', 'yaw', 'roll'))
    cp, sp, cy, sy, cr, sr = math.cos(pitch), math.sin(pitch), math.cos(yaw), math.sin(yaw), math.cos(roll), math.sin(roll)
    return np.array([[cp*cy, cy*sp*sr-sy*cr, cy*sp*cr+sy*sr],
                     [cp*sy, sy*sp*sr+cy*cr, sy*sp*cr-cy*sr],
                     [-sp, cp*sr, cp*cr]])


def label(actor):
    if actor['type'].startswith('walker.pedestrian.'):
        return 'person'
    base = actor.get('attributes', {}).get('base_type', '')
    return {'car': 'car', 'truck': 'truck', 'van': 'truck', 'bus': 'bus',
            'motorcycle': 'motorcycle', 'bicycle': 'bicycle'}.get(base, 'vehicle')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    p.add_argument('output', type=Path)
    p.add_argument('--ego', type=int, required=True)
    p.add_argument('--geometry', type=Path, help='Actor-local full bounding boxes from collect_actor_geometry.py')
    a = p.parse_args()
    geometry = json.loads(a.geometry.read_text())['actors'] if a.geometry else {}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    positions, speeds, stamps = [], [], []
    observed = collections.defaultdict(set)
    with a.source.open() as source, gzip.open(a.output, 'wt') as target:
        for line in source:
            state = json.loads(line)
            actors = state['actors']
            ego = next(x for x in actors if x['id'] == a.ego)
            origin = np.array([ego['pose'][k] for k in ('x','y','z')])
            rot = rotation(ego['pose'])
            objects = []
            for actor in actors:
                if actor['id'] == a.ego or not actor['type'].startswith(('vehicle.', 'walker.pedestrian.')):
                    continue
                point = np.array([actor['pose'][k] for k in ('x','y','z')])
                actor_origin = ((point-origin) @ rot) * [1,-1,1]
                box = geometry.get(str(actor['id']), {}).get('bounding_box')
                if a.geometry and box is None:
                    raise ValueError(f'Missing full bounding box for actor {actor["id"]}')
                if box:
                    point += rotation(actor['pose']) @ np.array([box['location'][k] for k in ('x','y','z')])
                relative = ((point-origin) @ rot) * [1,-1,1]
                box_transform = None
                if box:
                    box_transform = np.eye(4)
                    box_transform[:3,:3] = np.diag([1,-1,1]) @ rot.T @ rotation(actor['pose']) @ rotation(box['rotation'])
                    box_transform[:3,3] = relative
                category = label(actor)
                observed[category].add(actor['id'])
                objects.append({'actor_id': actor['id'], 'blueprint': actor['type'], 'class_name': category,
                                'x': float(relative[0]), 'y': float(relative[1]), 'z': float(relative[2]),
                                'position_reference': 'CARLA bounding-box center' if box else 'CARLA actor origin',
                                'actor_origin_base': actor_origin.tolist(), 'bounding_box_local_carla': box,
                                'T_base_from_bbox_carla': box_transform.tolist() if box is not None else None,
                                'half_extent': actor.get('extent'), 'world_pose_carla': actor['pose']})
            stamp = round(state['time']*1e9)
            record = {'frame': state['frame'], 'stamp_ns': stamp, 'frame_id': 'base_link',
                      'ego_world_pose_carla': ego['pose'], 'objects': objects}
            target.write(json.dumps(record, separators=(',', ':'))+'\n')
            positions.append(origin)
            speeds.append(math.sqrt(sum(ego['velocity'][k]**2 for k in ('x','y','z'))))
            stamps.append(stamp)
    report = {'frames': len(stamps), 'first_stamp_ns': stamps[0], 'last_stamp_ns': stamps[-1],
              'duration_seconds': (stamps[-1]-stamps[0])/1e9,
              'ego_distance_m': float(np.linalg.norm(np.diff(positions, axis=0), axis=1).sum()),
              'ego_max_speed_mps': max(speeds),
              'ego_moving_frames_over_0_2_mps': sum(v > .2 for v in speeds),
              'scene_actor_counts_by_class': {k: len(v) for k,v in observed.items()},
              'scope': 'All recorded vehicle and pedestrian actors; not visibility-filtered. Static environment objects are not labeled.',
              'position_reference': 'CARLA bounding-box center using captured actor-local geometry' if a.geometry else 'CARLA actor origin; no bounding-box center offsets'}
    a.output.with_suffix('').with_suffix('.summary.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))


if __name__ == '__main__':
    main()
