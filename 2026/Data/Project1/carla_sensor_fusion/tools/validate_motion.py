#!/usr/bin/env python3
"""Check that a driving capture contains sustained motion, not a blocked ego."""
import argparse
import json
import math
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('states', type=Path)
    parser.add_argument('--ego', type=int, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--minimum-moving-fraction', type=float, default=0.9)
    args = parser.parse_args()
    rows = []
    for line in args.states.read_text().splitlines():
        state = json.loads(line)
        ego = next(actor for actor in state['actors'] if actor['id'] == args.ego)
        speed = math.sqrt(sum(ego['velocity'][axis] ** 2 for axis in ('x', 'y', 'z')))
        rows.append((state['time'], speed, ego['pose']))
    if len(rows) < 2:
        raise ValueError('At least two captured frames are required')
    times = [row[0] for row in rows]
    steps = [b-a for a,b in zip(times, times[1:])]
    if any(step <= 0 for step in steps):
        raise ValueError('Capture times must strictly increase')
    moving_seconds = sum(dt for row,dt in zip(rows, steps) if row[1] > 0.2)
    stopped_runs = []
    start = None
    for row in rows:
        if row[1] <= 0.2 and start is None:
            start = row[0]
        elif row[1] > 0.2 and start is not None:
            stopped_runs.append(row[0]-start)
            start = None
    if start is not None:
        stopped_runs.append(times[-1]-start)
    distance = sum(math.sqrt(sum((b[2][axis]-a[2][axis])**2 for axis in ('x','y','z')))
                   for a,b in zip(rows, rows[1:]))
    duration = times[-1]-times[0]
    fraction = moving_seconds/duration
    result = {'status': 'passed' if fraction >= args.minimum_moving_fraction else 'failed',
              'frames': len(rows), 'duration_seconds': duration,
              'moving_threshold_mps': 0.2, 'moving_seconds': moving_seconds,
              'moving_fraction': fraction, 'required_moving_fraction': args.minimum_moving_fraction,
              'longest_stopped_interval_seconds': max(stopped_runs, default=0),
              'ego_distance_m': distance,
              'scope': 'Trajectory continuity and sustained motion only; does not certify collision-free driving.'}
    args.output.write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))
    if result['status'] != 'passed':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
