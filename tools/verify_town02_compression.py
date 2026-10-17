#!/usr/bin/env python3
"""Verify every decompressed ROS message against the original CDR and timestamp."""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import struct
import time
import rosbag2_py


def update(stats, name, timestamp, data):
    row = stats.setdefault(name, {'count': 0, 'cdr_bytes': 0, 'hash': hashlib.sha256(),
                                 'first_ns': timestamp, 'last_ns': timestamp})
    row['hash'].update(struct.pack('<qQ', timestamp, len(data)))
    row['hash'].update(data)
    row['count'] += 1
    row['cdr_bytes'] += len(data)
    row['last_ns'] = timestamp


def finish(stats):
    return {name: {**{k: v for k, v in row.items() if k != 'hash'},
                   'timestamp_and_cdr_sha256': row['hash'].hexdigest()} for name, row in stats.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    source, target = root / 'rosbag2', root / 'rosbag2_zstd'
    source_stats, target_stats = {}, {}
    source_types = {}
    for path in sorted(source.glob('*.db3')):
        db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        topics = {row[0]: row[1] for row in db.execute('SELECT id,name FROM topics')}
        source_types.update({name: (typename, fmt) for name, typename, fmt in db.execute('SELECT name,type,serialization_format FROM topics')})
        print('Hashing original CDR messages', path.name, flush=True)
        for tid, timestamp, data in db.execute('SELECT topic_id,timestamp,data FROM messages ORDER BY id'):
            update(source_stats, topics[tid], timestamp, data)
        db.close()
    for path in sorted(target.glob('*.db3')):
        with sqlite3.connect(f'file:{path}?mode=ro', uri=True) as db:
            if db.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
                raise RuntimeError('Compressed database consistency check failed')
    reader = rosbag2_py.SequentialCompressionReader()
    reader.open(rosbag2_py.StorageOptions(uri=str(target), storage_id='sqlite3'),
                rosbag2_py.ConverterOptions(input_serialization_format='cdr', output_serialization_format='cdr'))
    target_types = {topic.name: (topic.type, topic.serialization_format) for topic in reader.get_all_topics_and_types()}
    count = 0
    started = time.monotonic()
    print('Reading all messages through the native ROS 2 compression reader', flush=True)
    while reader.has_next():
        name, data, timestamp = reader.read_next()
        update(target_stats, name, timestamp, data)
        count += 1
        if count % 10000 == 0:
            print('Verified-reader messages', count, 'elapsed', round(time.monotonic() - started, 1), 's', flush=True)
    del reader
    original, compressed = finish(source_stats), finish(target_stats)
    errors = []
    if source_types != target_types:
        errors.append('Topic names, types, or serialization formats changed')
    if original != compressed:
        errors.append('Per-topic message counts, timestamps, or original CDR bytes differ')
    original_bytes = sum(path.stat().st_size for path in source.glob('*.db3'))
    compressed_bytes = sum(path.stat().st_size for path in target.glob('*.db3'))
    report = dict(status='passed' if not errors else 'failed', errors=errors,
                  method='Per-topic SHA-256 over every original timestamp, CDR byte length, and CDR payload; compressed data decoded by native ROS 2 Humble reader.',
                  compression_format='zstd', compression_mode='message', lossless=True,
                  original_database_bytes=original_bytes, compressed_database_bytes=compressed_bytes,
                  size_reduction_percent=100 * (1 - compressed_bytes / original_bytes),
                  original=original, decompressed=compressed, message_count=count,
                  topics=len(original))
    (root / 'compression_validation.json').write_text(json.dumps(report, indent=2))
    print(json.dumps({k: v for k, v in report.items() if k not in ['original', 'decompressed']}, indent=2), flush=True)
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
