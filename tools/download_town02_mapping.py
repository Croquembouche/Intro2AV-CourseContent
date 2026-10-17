#!/usr/bin/env python3
"""Resume finalized CARLA session downloads and verify the server SHA-256 seal."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import time
import urllib.request

helper_path = Path(__file__).resolve().parents[1] / '2026/Data/Project1/carla_sensor_fusion/tools/capture_session.py'
spec = importlib.util.spec_from_file_location('capture_session', helper_path)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    session = json.loads((root / 'session.json').read_text())
    sid, base = session['id'], session['service_url']
    prefix = '/api/sessions/' + sid + '/files/'
    while True:
        manifest = helper.request(base, prefix + 'manifest.json')
        if manifest.get('status') == 'complete':
            break
        if manifest.get('status') == 'failed':
            raise RuntimeError('Server capture failed: ' + repr(manifest.get('error')))
        print('Waiting for recording finalization', sid, flush=True)
        time.sleep(10)
    files = helper.request(base, prefix.rstrip('/'))
    selected = [f for f in files if f['path'].startswith('rosbag2/') or f['path'] in
                ('configuration.json', 'provenance.json', 'states.jsonl', 'events.jsonl',
                 'frames.idx', 'map.xodr', 'map.json')]
    for entry in selected:
        name, size = entry['path'], entry['bytes']
        target = (root / name).resolve()
        if not target.is_relative_to(root):
            raise ValueError('Unsafe server file path')
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and target.stat().st_size == size:
            print('Existing file will be hash checked:', name, flush=True)
            continue
        temporary = target.with_suffix(target.suffix + '.download')
        for attempt in range(4):
            try:
                print('Downloading', name, size, 'bytes', flush=True)
                helper.download_file(base + prefix + name, temporary, size)
                temporary.replace(target)
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(2)
    while True:
        manifest = helper.request(base, prefix + 'manifest.json')
        if manifest.get('verification'):
            if manifest['verification']['status'] != 'verified':
                raise RuntimeError('Server verification failed: ' + repr(manifest['verification']))
            break
        time.sleep(10)
    integrity = helper.request(base, prefix + 'integrity.json')
    (root / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    (root / 'server_integrity.json').write_text(json.dumps(integrity, indent=2))
    (root / 'server_verification.json').write_text(json.dumps(manifest['verification'], indent=2))
    verified = {}
    for entry in selected:
        name = entry['path']
        actual = digest(root / name)
        if actual != integrity['files'][name]['sha256']:
            raise RuntimeError('SHA-256 mismatch: ' + name)
        verified[name] = {'sha256': actual, 'bytes': (root / name).stat().st_size}
        print('Verified', name, flush=True)
    (root / 'download_verification.json').write_text(json.dumps({'status': 'passed', 'session_id': sid, 'files': verified}, indent=2))
    print('All downloaded files match the server SHA-256 seal', flush=True)


if __name__ == '__main__':
    main()
