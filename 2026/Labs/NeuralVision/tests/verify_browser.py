#!/usr/bin/env python3
"""Compare browser computations with independent NumPy and held-out PyTorch outputs."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import numpy as np

root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'ws/src/neural_vision_common'))
from neural_vision_common.inference import Network
models=root/'ws/src/neural_vision_common/models'
def native(x):
    if isinstance(x,np.ndarray):return x.tolist()
    if isinstance(x,dict):return {k:native(v) for k,v in x.items()}
    if isinstance(x,list):return [native(v) for v in x]
    return x
cases=[]
for name in ('mlp','cnn','transformer'):
    net=Network(name,models)
    with np.load(models/f'{name}_reference.npz',allow_pickle=False) as refs:
        images=refs['inputs']; logits=refs['logits']
        for i,image in enumerate(images):
            result=net.forward(image)
            # All intermediate values for three inputs; predictions for all forty.
            if i>=3:result.pop('detail')
            cases.append(dict(model=name,pixels=image.reshape(-1).tolist(),options={},result=native(result),torch=logits[i].tolist()))
    variants={'mlp':[{'disabled_neuron':0},{'disabled_neuron':150},{'disabled_neuron':299}],
              'cnn':[{'negative_slope':.01},{'negative_slope':.1},{'negative_slope':.3}],
              'transformer':[{'use_positions':False}]}[name]
    for options in variants:
        cases.append(dict(model=name,pixels=images[0].reshape(-1).tolist(),options=options,result=native(net.forward(images[0],**options))))
    for image in [np.zeros((28,28),dtype=np.float32),np.ones((28,28),dtype=np.float32)]:
        cases.append(dict(model=name,pixels=image.reshape(-1).tolist(),options={},result=native(net.forward(image))))
with tempfile.TemporaryDirectory(prefix='neural-browser-') as tmp:
    tmp=Path(tmp)
    (tmp/'cases.json').write_text(json.dumps(cases,separators=(',',':')))
    for name in ('mlp','cnn','transformer'):
        with np.load(models/f'{name}.npz',allow_pickle=False) as data:
            (tmp/f'{name}.json').write_text(json.dumps({key:data[key].tolist() for key in data.files},separators=(',',':')))
    subprocess.run(['node',str(root/'tests/verify_browser.mjs'),str(tmp)],check=True)
