#!/usr/bin/env python3
"""Create one clean student archive; exclude local build and verification products."""
import argparse
import hashlib
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    excluded={'build','install','log','__pycache__','.pytest_cache','browser-artifacts','node_modules','.git'}
    files=sorted(p for p in root.rglob('*') if p.is_file() and not excluded.intersection(p.relative_to(root).parts) and not any(part.endswith('.egg-info') for part in p.relative_to(root).parts) and p.suffix not in {'.pyc','.db3','.mcap','.zip'})
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(args.output,'w',ZIP_DEFLATED,compresslevel=9) as archive:
        for p in files:
            info=ZipInfo('neural_vision/'+p.relative_to(root).as_posix(),date_time=(2026,1,1,0,0,0))
            info.external_attr=0o100644 << 16
            archive.writestr(info,p.read_bytes(),compress_type=ZIP_DEFLATED,compresslevel=9)
    with ZipFile(args.output) as archive:
        assert archive.testzip() is None
        names=archive.namelist()
        assert sum(n.endswith('/package.xml') for n in names)==5
        for model in ['mlp','cnn','transformer']:assert f'neural_vision/ws/src/neural_vision_common/models/{model}.npz' in names
        assert 'neural_vision/ws/src/neural_vision_common/web/index.html' in names
    print(f'{len(files)} files; {args.output.stat().st_size:,} bytes; ZIP integrity passed')
    print('SHA256',hashlib.sha256(args.output.read_bytes()).hexdigest())

if __name__=='__main__':main()
