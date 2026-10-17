#!/usr/bin/env python3
"""Bounded offline lossless Zstd conversion to ROS 2 message compression."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import copy
import json
from pathlib import Path
import shutil
import sqlite3
import threading
import time
import yaml
import zstandard


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--level', type=int, default=10)
    args = parser.parse_args()
    root = args.root.resolve()
    source = root / 'rosbag2'
    target = root / 'rosbag2_zstd'
    target.mkdir(exist_ok=False)
    metadata = yaml.safe_load((source / 'metadata.yaml').read_text())
    info = metadata['rosbag2_bagfile_information']
    info['compression_format'] = 'zstd'
    info['compression_mode'] = 'message'
    thread_data = threading.local()
    def compress(row):
        if not hasattr(thread_data, 'codec'):
            thread_data.codec = zstandard.ZstdCompressor(level=args.level)
        mid, tid, timestamp, payload = row
        return mid, tid, timestamp, thread_data.codec.compress(payload)
    count = 0
    started = time.monotonic()
    names = []
    with ThreadPoolExecutor(max_workers=4) as workers:
        for index, path in enumerate(sorted(source.glob('*.db3'))):
            out_name = f'rosbag2_zstd_{index}.db3'
            names.append(out_name)
            src = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
            dst = sqlite3.connect(target / out_name)
            dst.execute('PRAGMA journal_mode=MEMORY')
            dst.execute('PRAGMA synchronous=NORMAL')
            schema = src.execute("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'").fetchall()
            for kind, name, sql in schema:
                if kind == 'table':
                    dst.execute(sql)
                    if name != 'messages':
                        rows = src.execute('SELECT * FROM "' + name + '"').fetchall()
                        if rows:
                            dst.executemany('INSERT INTO "' + name + '" VALUES (' + ','.join('?' for _ in rows[0]) + ')', rows)
            dst.commit()
            cursor = src.execute('SELECT id,topic_id,timestamp,data FROM messages ORDER BY id')
            while True:
                # One bounded batch; no writer queue drops or asynchronous DB writes.
                batch = cursor.fetchmany(128)
                if not batch:
                    break
                dst.executemany('INSERT INTO messages(id,topic_id,timestamp,data) VALUES (?,?,?,?)', workers.map(compress, batch))
                dst.commit()
                count += len(batch)
                if count % 4096 == 0:
                    print('Compressed', count, '/', info['message_count'], 'messages; elapsed', round(time.monotonic() - started, 1), 's', flush=True)
            for kind, name, sql in schema:
                if kind == 'index':
                    dst.execute(sql)
            dst.commit()
            src.close()
            dst.close()
    if count != info['message_count']:
        raise RuntimeError('Message count mismatch')
    info['relative_file_paths'] = names
    for entry, name in zip(info.get('files', []), names):
        entry['path'] = name
    (target / 'metadata.yaml').write_text(yaml.safe_dump(metadata, sort_keys=False))
    (root / 'compression_configuration.json').write_text(json.dumps({
        'format': 'zstd', 'mode': 'message', 'level': args.level, 'workers': 4,
        'bounded_batch_messages': 128, 'messages': count,
        'method': 'Copied SQLite schema/topic metadata and compressed each original CDR blob; retained row IDs and timestamps.',
        'zstandard_version': zstandard.__version__}, indent=2))
    print('Completed:', count, 'messages;', sum(p.stat().st_size for p in target.glob('*.db3')) / 1024**3, 'GiB', flush=True)


if __name__ == '__main__':
    main()
