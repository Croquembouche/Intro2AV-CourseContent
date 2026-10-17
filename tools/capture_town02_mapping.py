#!/usr/bin/env python3
"""Drive existing CARLA ego with the service clock; retain measurable road coverage."""
import argparse
import heapq
import json
import math
from pathlib import Path
import time
import urllib.request
import numpy as np


def request(base, path, payload=None, timeout=45):
    req = urllib.request.Request(base + path,
        data=None if payload is None else json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json', 'X-Control-Client': 'carla-control-center'})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


def save(path, value):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, indent=2))
    tmp.replace(path)


class Coverage:
    def __init__(self, map_data):
        self.lanes = map_data['lanes']
        self.by_id = {l['id']: l for l in self.lanes}
        self.points = {l['id']: np.asarray(l['points'], float) for l in self.lanes}
        self.seen = {k: np.zeros(len(p), bool) for k, p in self.points.items()}
        self.length = {k: float(np.linalg.norm(np.diff(p[:, :2], axis=0), axis=1).sum()) for k, p in self.points.items()}
        self.edges = {a['id']: [b['id'] for b in self.lanes if a != b and
            math.dist(a['points'][-1][:2], b['points'][0][:2]) < 3] for a in self.lanes}

    def observe(self, pose):
        for key, points in self.points.items():
            distance = np.linalg.norm(points[:, :2] - [pose['x'], pose['y']], axis=1)
            heading = abs((points[:, 4] - pose['yaw'] + 180) % 360 - 180)
            self.seen[key] |= (distance <= 3.0) & (heading <= 45)

    def report(self):
        rows = [dict(lane_id=l['id'], road_id=int(l['id'].split(':')[0]), junction=l['junction'],
                     length_m=self.length[l['id']], samples=len(self.seen[l['id']]),
                     covered_samples=int(self.seen[l['id']].sum()),
                     fraction=float(self.seen[l['id']].mean())) for l in self.lanes]
        roads = [r for r in rows if not r['junction']]
        return dict(method='Map lane samples within 3 m and 45 degrees of actual CARLA ego pose; 2 m nominal map sampling.',
                    objective='Every non-junction driving lane in both directions; junction turns reported separately.',
                    required_lanes=len(roads), complete_lanes=sum(r['fraction'] >= .98 for r in roads),
                    road_ids=sorted(set(r['road_id'] for r in roads)), lanes=rows)

    def next_target(self, pose):
        candidates = []
        for key, p in self.points.items():
            d = np.linalg.norm(p[:, :2] - [pose['x'], pose['y']], axis=1)
            yaw = abs((p[:, 4] - pose['yaw'] + 180) % 360 - 180)
            idx = int(np.argmin(d + (yaw > 60) * 100))
            candidates.append((float(d[idx] + (yaw[idx] > 60) * 100), key, idx))
        _, current, idx = min(candidates)
        remaining = float(np.linalg.norm(np.diff(self.points[current][idx:, :2], axis=0), axis=1).sum())
        distances = {current: remaining}
        queue = [(remaining, current)]
        while queue:
            cost, key = heapq.heappop(queue)
            if cost != distances[key]:
                continue
            for other in self.edges[key]:
                total = cost + self.length[other]
                if total < distances.get(other, float('inf')):
                    distances[other] = total
                    heapq.heappush(queue, (total, other))
        missing = [l for l in self.lanes if not l['junction'] and self.seen[l['id']].mean() < .98]
        if not missing:
            return None
        def score(l):
            key = l['id']
            benefit = max(2., self.length[key] * (1 - self.seen[key].mean()))
            cost = distances.get(key, 10000.)
            # Already behind us on the current lane needs a complete loop.
            if key == current and (~self.seen[key][:idx]).any():
                cost += 500
            return cost / benefit
        lane = min(missing, key=score)
        p = lane['points'][-1]
        return lane['id'], {'x': p[0], 'y': p[1], 'z': p[2]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://128.175.213.232:8095')
    parser.add_argument('--ego', type=int, default=58)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--max-sim-seconds', type=float, default=1800)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    state = request(args.url, '/api/status')
    if state['recording'] or not state['running'] or state['mode'] != 'live':
        raise RuntimeError('Requires running live world without an existing recording')
    if 'Town02' not in state['map'] or state['managed'][str(args.ego)]['planner'] != 'tm':
        raise RuntimeError('Requires Town02 and existing Traffic Manager ego')
    sensors = {s['name'] for s in state['sensors'] if s['parent'] == args.ego}
    if not {'roof_lidar', 'front_rgb', 'imu', 'gnss'} <= sensors:
        raise RuntimeError('Missing requested sensors')
    save(args.output / 'initial_status.json', state)
    save(args.output / 'initial_configuration.json', request(args.url, '/api/configuration'))
    map_data = request(args.url, '/api/map')
    save(args.output / 'map.json', map_data)
    coverage = Coverage(map_data)
    signals = [a for a in state['actors'] if a['type'].startswith('traffic.traffic_light')]
    groups = {}
    for signal in signals:
        groups.setdefault(signal['group_id'], []).append(signal['id'])
    # Holding one native signal freezes its entire group and turns peers red.
    # Set every peer green without another hold, retaining that group freeze.
    for group, ids in groups.items():
        request(args.url, '/api/command/traffic-light',
                {'id': ids[0], 'operation': 'state', 'state': 'Green', 'hold': True})
        for aid in ids:
            request(args.url, '/api/command/traffic-light',
                    {'id': aid, 'operation': 'state', 'state': 'Green', 'hold': False})
    state = request(args.url, '/api/status')
    signals = [a for a in state['actors'] if a['type'].startswith('traffic.traffic_light')]
    if not all(a['state'] == 'Green' and a['frozen'] for a in signals):
        raise RuntimeError('Not every traffic light is frozen green')
    save(args.output / 'recording_configuration.json', request(args.url, '/api/configuration'))
    save(args.output / 'traffic_light_override.json',
         {'state': 'Green', 'frozen': True, 'signal_count': len(signals), 'groups': groups})
    print('Verified', len(signals), 'traffic lights frozen green', flush=True)
    session = request(args.url, '/api/command/record-start', {'rosbag': True}, timeout=120)
    sid = session['id']
    save(args.output / 'session.json', {'id': sid, 'service_url': args.url})
    print('Recording', sid, flush=True)
    start_sim = state['time']
    current_target = None
    last_log = 0
    start_wall = time.monotonic()
    stagnant_since = state['time']
    previous_pose = None
    outcome = 'incomplete'
    with (args.output / 'trajectory_live.jsonl').open('w') as trajectory, (args.output / 'route_events.jsonl').open('w') as events:
        try:
            while True:
                state = request(args.url, '/api/status')
                if not state.get('recording') or state['recording']['id'] != sid:
                    raise RuntimeError('Recording ended unexpectedly: ' + str(state.get('error')))
                actor = next(a for a in state['actors'] if a['id'] == args.ego)
                if any(a.get('state') != 'Green' or not a.get('frozen') for a in state['actors'] if a['type'].startswith('traffic.traffic_light')):
                    raise RuntimeError('Traffic light override changed during recording')
                pose = actor['pose']
                coverage.observe(pose)
                trajectory.write(json.dumps({'frame': state['frame'], 'time': state['time'], 'pose': pose}) + '\n')
                trajectory.flush()
                report = coverage.report()
                elapsed = state['time'] - start_sim
                if report['complete_lanes'] == report['required_lanes']:
                    outcome = 'complete'
                    break
                if elapsed > args.max_sim_seconds or time.monotonic() - start_wall > 14400:
                    raise TimeoutError('Capture limit exceeded; retained partial coverage')
                if previous_pose is None or math.dist([pose['x'], pose['y']], previous_pose) > 1:
                    stagnant_since = state['time']
                    previous_pose = [pose['x'], pose['y']]
                if state['time'] - stagnant_since > 100:
                    raise RuntimeError('Ego stalled for 100 simulation seconds; inspect scene')
                managed = state['managed'][str(args.ego)]
                target_done = current_target is not None and coverage.seen[current_target].mean() >= .98
                if current_target is None or managed.get('arrived') or target_done:
                    target = coverage.next_target(pose)
                    if target is None:
                        outcome = 'complete'
                        break
                    current_target, point = target
                    route = request(args.url, '/api/command/destination', {'id': args.ego, 'point': point})
                    events.write(json.dumps({'frame': state['frame'], 'time': state['time'], 'target_lane': current_target, 'point': point, 'response': route}) + '\n')
                    events.flush()
                    print('Target', current_target, 'route points', len(route['route']), flush=True)
                if time.monotonic() - last_log >= 20:
                    report.update(session_id=sid, simulation_seconds=elapsed, outcome=outcome)
                    save(args.output / 'coverage_live.json', report)
                    print(f"{elapsed:.1f} sim s; {report['complete_lanes']}/{report['required_lanes']} lanes; frame {state['frame']}; target {current_target}", flush=True)
                    last_log = time.monotonic()
                time.sleep(.5)
        finally:
            report = coverage.report()
            report.update(outcome=outcome, session_id=sid, simulation_seconds=state['time'] - start_sim)
            save(args.output / 'coverage_live.json', report)
            print('Stopping recording', sid, 'coverage', report['complete_lanes'], '/', report['required_lanes'], flush=True)
            try:
                result = request(args.url, '/api/command/record-stop', {}, timeout=50)
                save(args.output / 'capture_result.json', result)
            except Exception as error:
                save(args.output / 'finalization_pending.json', {'id': sid, 'error': str(error)})
                print('Finalization request pending:', error, flush=True)
            # Pause at the end to keep the ego at its final recorded location.
            request(args.url, '/api/command/pause', {}, timeout=50)
            save(args.output / 'final_status.json', request(args.url, '/api/status'))
    print('Capture finished:', outcome, flush=True)


if __name__ == '__main__':
    main()
