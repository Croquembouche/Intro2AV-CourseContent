#!/usr/bin/env python3
"""Build separate student and instructor ZIPs, with checksums and ZIP validation."""
import hashlib
import json
from pathlib import Path
import zipfile


def main():
    root = Path(__file__).resolve().parents[1]
    release = root.parents[1]
    evaluation = json.loads((root/'instructor/front_camera_evaluation/evaluation_set.json').read_text())
    assert evaluation['status'] == 'ready_for_instructor_use', 'Visibility/LiDAR review is not complete'
    eligible = [o for f in evaluation['frames'] for o in f['objects'] if o['eligibility']=='eligible']
    assert eligible and all(o.get('support_reviewed') and o['lidar_support_count']>=5 for o in eligible), 'Missing reviewed body support'
    selections = {'student': ['README.md', 'stationary', 'driving', 'project1_interfaces'],
                  'instructor': ['README.md', 'instructor', 'tools']}
    reports = {}
    for audience, names in selections.items():
        files = []
        for name in names:
            target = root/name
            if not target.exists():
                raise FileNotFoundError(target)
            files.extend([target] if target.is_file() else sorted(p for p in target.rglob('*') if p.is_file()))
        files = [p for p in files if '__pycache__' not in p.parts and p.suffix not in ('.pyc','.log')]
        if audience == 'student':
            assert not any('instructor' in p.relative_to(root).parts for p in files)
            for sequence in ('stationary','driving'):
                assert json.loads((root/sequence/'playback_validation.json').read_text())['status']=='passed'
            assert json.loads((root/'driving/motion_validation.json').read_text())['status']=='passed', 'Driving clip does not meet the sustained-motion requirement'
        destination = release/f'project1_carla_{audience}.zip'
        temporary = destination.with_name(destination.name+'.tmp')
        hashes = {}
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as z:
            for path in files:
                name = 'carla_sensor_fusion/'+str(path.relative_to(root))
                with path.open('rb') as f:
                    digest = hashlib.sha256()
                    for chunk in iter(lambda: f.read(1024*1024), b''):
                        digest.update(chunk)
                hashes[name] = digest.hexdigest()
                z.write(path, name)
            z.writestr('carla_sensor_fusion/SHA256SUMS', ''.join(f'{h}  {p}\n' for p,h in hashes.items()))
        with zipfile.ZipFile(temporary) as z:
            assert z.testzip() is None
        temporary.replace(destination)
        digest = hashlib.sha256()
        with destination.open('rb') as f:
            for chunk in iter(lambda: f.read(1024*1024), b''):
                digest.update(chunk)
        reports[audience] = {'file':str(destination),'bytes':destination.stat().st_size,
                             'sha256':digest.hexdigest(),'files':len(files)+1,'zip_crc_test':'passed'}
        print(audience, reports[audience], flush=True)
    (root/'release_validation.json').write_text(json.dumps(reports,indent=2))


if __name__=='__main__':
    main()
