#!/usr/bin/env python3
"""Package the validated compressed bag with all calibration and reference files."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile


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
    validation = json.loads((root / 'compression_validation.json').read_text())
    playback = json.loads((root / 'compressed_playback_validation.json').read_text())
    if validation['status'] != 'passed' or playback['status'] != 'passed':
        raise RuntimeError('Compressed bag validation/playback has not passed')
    size = validation['compressed_database_bytes'] / 1024**3
    reduction = validation['size_reduction_percent']
    instructions = f'''# Lossless compressed Town02 recording

The complete ROS 2 recording is in `rosbag2_zstd/`, with **Zstandard message compression**. Database size is **{size:.2f} GiB**, down **{reduction:.1f}%** from the original 15.00 GiB. All **71,316 messages**, **18 topics**, **198.05 seconds**, sensor data, original timestamps, calibration, and ground truth are retained. Every decompressed CDR payload and timestamp was compared against the original using per-topic SHA-256; all matched. A short ROS 2 Humble DDS playback and sensor TF lookup check also passed.

```bash
source /opt/ros/humble/setup.bash
# Run from the extracted dataset directory:
ros2 bag info rosbag2_zstd
ros2 bag play rosbag2_zstd --rate 0.5 --read-ahead-queue-size 40
```

ROS decompresses individual messages during playback. The compressed bag does not need to be expanded into a 15 GiB database first. It uses the standard `rosbag2_compression_zstd` plugin, verified on this ROS 2 Humble installation. If a different installation reports that this plugin is missing, install `ros-humble-rosbag2-compression-zstd`.

`calibration.json` contains sensor intrinsics/extrinsics and the direct mapping transforms. `ground_truth_trajectory.tum`, `coverage_verified.json`, map/OpenDRIVE, creation settings, and the physical LiDAR profile are included. `compression_validation.json` and `compressed_playback_validation.json` document the compressed copy checks. `ORIGINAL_RECORDING_README.md`, source verification reports, and `source_recording_SHA256SUMS.txt` describe the original recording and its provenance. The original uncompressed bag is retained locally alongside this copy and is excluded from this smaller ZIP.

`SHA256SUMS` verifies the files in this compressed package. Run `sha256sum -c SHA256SUMS` after extraction. The ZIP stores the already compressed database without another compression pass and compresses its metadata/reference files.
'''
    (root / 'COMPRESSION.md').write_text(instructions)
    original_notes = (root / 'README.md').read_text()
    marker = '## Compressed copy\n\n'
    if marker not in original_notes:
        paragraph = f'''## Compressed copy

`rosbag2_zstd/` is a lossless compressed copy of all 18 topics: **{size:.2f} GiB**, **{reduction:.1f}% smaller**. Every original CDR message and timestamp was verified after decompression, and ROS 2 Humble playback passed. See `COMPRESSION.md` for playback and package instructions. The original `rosbag2/` remains available.

'''
        original_notes = original_notes.replace('## Road coverage\n', paragraph + '## Road coverage\n', 1)
        (root / 'README.md').write_text(original_notes)
    source_checksums = json.loads((root / 'download_verification.json').read_text())['files']
    checksums = {}
    for path in sorted(root.rglob('*')):
        if not path.is_file() or path.name == 'SHA256SUMS' or path.name.endswith('.download'):
            continue
        name = path.relative_to(root).as_posix()
        if name in source_checksums and path.stat().st_size == source_checksums[name]['bytes']:
            checksums[name] = source_checksums[name]['sha256']
        else:
            checksums[name] = digest(path)
    local_manifest = ''.join(h + '  ' + name + '\n' for name, h in checksums.items())
    old_manifest = (root / 'SHA256SUMS').read_text()
    (root / 'SHA256SUMS').write_text(local_manifest)
    files = [(path, path.relative_to(root).as_posix()) for path in sorted(root.rglob('*'))
             if path.is_file() and 'rosbag2' not in path.relative_to(root).parts
             and path.name not in ['SHA256SUMS', 'README.md'] and not path.name.endswith('.download')]
    archive = root.parent / 'Town02Mapping_2026-10-06_lossless.zip'
    if archive.exists():
        raise RuntimeError('Archive already exists')
    prefix = '2026-10-06_town02_compressed/'
    archive_hashes = {}
    print('Writing compressed dataset archive', archive, flush=True)
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as output:
        for path, name in files:
            output.write(path, prefix + name, compress_type=zipfile.ZIP_STORED if name.endswith('.db3') else zipfile.ZIP_DEFLATED)
            archive_hashes[name] = checksums[name]
        for name, text in [('README.md', instructions), ('ORIGINAL_RECORDING_README.md', original_notes),
                           ('source_recording_SHA256SUMS.txt', old_manifest)]:
            output.writestr(prefix + name, text)
            archive_hashes[name] = hashlib.sha256(text.encode()).hexdigest()
        output.writestr(prefix + 'SHA256SUMS', ''.join(h + '  ' + name + '\n' for name, h in sorted(archive_hashes.items())))
    with zipfile.ZipFile(archive) as stored:
        failure = stored.testzip()
        if failure:
            raise RuntimeError('Archive CRC failed: ' + failure)
        if any('/rosbag2/' in n for n in stored.namelist()):
            raise RuntimeError('Original uncompressed bag accidentally included')
        for name, expected in archive_hashes.items():
            h = hashlib.sha256()
            with stored.open(prefix + name) as stream:
                for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
                    h.update(chunk)
            if h.hexdigest() != expected:
                raise RuntimeError('Archive SHA-256 failed: ' + name)
    report = {'status': 'passed', 'archive_path': str(archive), 'bytes': archive.stat().st_size,
              'sha256': digest(archive), 'files': len(archive_hashes) + 1,
              'crc_passed': True, 'all_archive_file_hashes_passed': True,
              'compressed_database_bytes': validation['compressed_database_bytes'],
              'original_database_bytes': validation['original_database_bytes']}
    report_path = archive.with_suffix('.verification.json')
    report_path.write_text(json.dumps(report, indent=2))
    archive.with_suffix('.zip.sha256').write_text(report['sha256'] + '  ' + archive.name + '\n')
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    main()
