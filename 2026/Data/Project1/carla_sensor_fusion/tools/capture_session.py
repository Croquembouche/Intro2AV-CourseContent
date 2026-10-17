#!/usr/bin/env python3
"""Capture a bounded session through CARLab's single simulation clock."""
import argparse
import hashlib
import json
import os
import pathlib
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor


def request(base, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=data, headers={
        'Content-Type': 'application/json', 'X-Control-Client': 'carla-control-center'})
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.load(response)


def download_file(url, target, size):
    """Bounded byte ranges avoid stalled multi-gigabyte HTTP streams."""
    if size <= 1024 * 1024:
        with urllib.request.urlopen(url, timeout=120) as response:
            data = response.read(size + 1)
        if len(data) != size:
            raise RuntimeError('Unexpected file length')
        target.write_bytes(data)
        return
    block = 8 * 1024 * 1024
    with target.open('wb') as output:
        output.truncate(size)
        def transfer(start):
            end = min(start + block, size) - 1
            req = urllib.request.Request(url, headers={'Range': f'bytes={start}-{end}'})
            with urllib.request.urlopen(req, timeout=120) as response:
                if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{size}':
                    raise RuntimeError('Server did not honor byte range')
                data = response.read(end - start + 2)
            if len(data) != end - start + 1:
                raise RuntimeError('Incomplete byte range')
            offset = 0
            while offset < len(data):
                written = os.pwrite(output.fileno(), data[offset:], start + offset)
                if written <= 0:
                    raise OSError('Cannot write downloaded range')
                offset += written
        with ThreadPoolExecutor(max_workers=4) as workers:
            list(workers.map(transfer, range(0, size, block)))


def download_session(args, sid):
    manifest = request(args.url, f'/api/sessions/{sid}/files/manifest.json')
    if manifest.get('status') != 'complete' or not manifest.get('ros_topics'):
        raise RuntimeError('Session is not finalized; resume it after recording stops')
    # The writer is closed before this manifest is marked complete. Download
    # immutable files while the server hashes its larger raw-sensor archive.
    files = request(args.url, f'/api/sessions/{sid}/files')
    downloaded = []
    for entry in files:
        name = entry['path']
        if not (name.startswith('rosbag2/') or name in ('configuration.json', 'provenance.json', 'states.jsonl')):
            continue
        dest = (args.output / name).resolve()
        if not dest.is_relative_to(args.output.resolve()):
            raise ValueError('Invalid server path')
        dest.parent.mkdir(parents=True, exist_ok=True)
        temporary = dest.with_suffix(dest.suffix + '.download')
        download_file(args.url + f'/api/sessions/{sid}/files/' + name, temporary, entry['bytes'])
        if temporary.stat().st_size != entry['bytes']:
            raise RuntimeError('Incomplete download: ' + name)
        temporary.replace(dest)
        downloaded.append((name, dest))
        print('Downloaded', name, entry['bytes'], flush=True)
    deadline = time.monotonic() + 900
    while True:
        manifest = request(args.url, f'/api/sessions/{sid}/files/manifest.json')
        verification = manifest.get('verification')
        if verification:
            if manifest.get('status') != 'complete' or verification['status'] != 'verified':
                raise RuntimeError('Session failed verification: ' + json.dumps(verification))
            break
        if time.monotonic() > deadline:
            raise TimeoutError('Server finalization still pending; resume this session later')
        time.sleep(5)
    print('Server verification passed:', manifest['frames'], 'frames', flush=True)
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    (args.output / 'verification.json').write_text(json.dumps(verification, indent=2))
    integrity = request(args.url, f'/api/sessions/{sid}/files/integrity.json')
    for name, dest in downloaded:
        h = hashlib.sha256()
        with dest.open('rb') as f:
            for chunk in iter(lambda: f.read(1024*1024), b''):
                h.update(chunk)
        if h.hexdigest() != integrity['files'][name]['sha256']:
            raise RuntimeError('Downloaded file hash mismatch: ' + name)
    print('Downloaded files match server SHA-256 seal', flush=True)
    if args.pause_at_end:
        request(args.url, '/api/command/pause', {})
    print('Capture saved to', args.output, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--seconds', type=float, default=5)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--drive-ego', type=int)
    parser.add_argument('--destinations', type=int, nargs='+', default=[14, 0, 30])
    parser.add_argument('--pause-at-end', action='store_true')
    parser.add_argument('--resume-session', help='Download an existing finalized session without recording again')
    args = parser.parse_args()
    if args.resume_session:
        args.output.mkdir(parents=True, exist_ok=True)
        download_session(args, args.resume_session)
        return
    if not 0 < args.seconds <= 300:
        parser.error('--seconds must be between 0 and 300')
    args.output.mkdir(parents=True, exist_ok=False)
    state = request(args.url, '/api/status')
    if state.get('recording') or state.get('mode') != 'live' or not state.get('running'):
        raise RuntimeError('Requires a running live scene with no active recording')
    (args.output / 'initial_status.json').write_text(json.dumps(state, indent=2))
    session = request(args.url, '/api/command/record-start', {'rosbag': True})
    sid = session['id']
    (args.output / 'session.json').write_text(json.dumps({'id': sid}, indent=2))
    print('Recording session', sid, flush=True)
    started = time.monotonic()
    try:
        destinations = None
        route_index = 0
        if args.drive_ego is not None:
            destinations = request(args.url, '/api/map')['spawn_points']
            route = request(args.url, '/api/command/destination', {
                'id': args.drive_ego, 'point': destinations[args.destinations[route_index]]})
            print('Driving route points:', len(route['route']), flush=True)
        while True:
            time.sleep(0.5)
            state = request(args.url, '/api/status')
            rec = state.get('recording')
            if not rec or rec['id'] != sid:
                raise RuntimeError('Recording ended unexpectedly: ' + str(state.get('error')))
            if rec.get('end_sim_time', 0) - rec.get('start_sim_time', 0) >= args.seconds:
                break
            if destinations and state['managed'][str(args.drive_ego)].get('arrived'):
                route_index = (route_index + 1) % len(args.destinations)
                request(args.url, '/api/command/destination', {
                    'id': args.drive_ego, 'point': destinations[args.destinations[route_index]]})
            if time.monotonic() - started > max(120, args.seconds * 30):
                raise TimeoutError('Capture exceeded wall-time limit')
    finally:
        state = request(args.url, '/api/status')
        if state.get('recording', {}) and state['recording']['id'] == sid:
            try:
                result = request(args.url, '/api/command/record-stop', {})
                (args.output / 'capture_result.json').write_text(json.dumps(result, indent=2))
            except TimeoutError:
                # The server shields the stop operation from HTTP disconnects.
                # Poll this session's manifest instead of submitting stop twice.
                print('Stop request timed out; waiting for existing session finalization', flush=True)
    download_session(args, sid)


if __name__ == '__main__':
    main()
