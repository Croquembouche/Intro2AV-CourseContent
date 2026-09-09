#!/usr/bin/env python3
"""Build the public demo assets and the matching student package download."""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
import numpy as np

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    package=root/'ws/src/neural_vision_common'
    output=args.output.resolve()
    if output==root or root.is_relative_to(output) or output.is_relative_to(root/'ws'):
        raise ValueError('Choose a separate build output directory')
    output.mkdir(parents=True,exist_ok=True)
    for file in (package/'web').iterdir():
        if file.is_file():shutil.copy2(file,output/file.name)
    (output/'runtime-config.js').write_text("export const runtimeMode = 'browser';\n")
    models=output/'models';models.mkdir(exist_ok=True)
    for name in ('mlp','cnn','transformer'):
        with np.load(package/'models'/f'{name}.npz',allow_pickle=False) as weights:
            # Export full float32 values, not the bridge's six-digit display rounding.
            values={key:weights[key].tolist() for key in weights.files}
        (models/f'{name}.json').write_text(json.dumps(values,separators=(',',':'),allow_nan=False))
    (models/'meta.json').write_text(json.dumps({
        'default_model':'mlp',
        'metrics':json.loads((package/'models/metrics.json').read_text()),
        'samples':json.loads((package/'models/samples.json').read_text())},separators=(',',':')))
    (output/'.nojekyll').touch()
    subprocess.run([sys.executable,str(root/'tools/package_release.py'),'--output',str(output/'NeuralVision_student.zip')],check=True)
    print(f'Static demo built at {output}')

if __name__=='__main__':main()
