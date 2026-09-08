"""Inspectable NumPy forward passes. All displayed values come from these operations."""
from pathlib import Path
import numpy as np

MODELS = ('mlp', 'cnn', 'transformer')

def image_id(msg):
    """Correlate results by acquisition stamp and source frame, including bag replay."""
    return f'{msg.header.stamp.sec}.{msg.header.stamp.nanosec:09d}:{msg.header.frame_id}'

def softmax(x):
    exp = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return exp / exp.sum(axis=-1, keepdims=True)

def linear(x, weights, name):
    return x @ weights[name + '.weight'].T + weights[name + '.bias']

def conv(x, weights, bias):
    kernel = weights.shape[-1]
    windows = np.lib.stride_tricks.sliding_window_view(x, (kernel,kernel), axis=(1,2))
    return np.einsum('cyxij,ocij->oyx', windows, weights, optimize=False) + bias[:,None,None]

def pool(x):
    c,h,w = x.shape
    return x.reshape(c,h//2,2,w//2,2).max(axis=(2,4))

def norm(x,w,name):
    return (x-x.mean(-1,keepdims=True))/np.sqrt(x.var(-1,keepdims=True)+1e-5)*w[name+'.weight']+w[name+'.bias']

def gelu(x):
    return .5*x*(1+np.tanh(np.sqrt(2/np.pi)*(x+.044715*x**3)))

def serial(value):
    if isinstance(value,np.ndarray):
        return np.round(value.astype(float),6).tolist()
    if isinstance(value,dict):
        return {key:serial(val) for key,val in value.items()}
    if isinstance(value,list):
        return [serial(val) for val in value]
    return value

class Network:
    def __init__(self, name, directory):
        if name not in MODELS:
            raise ValueError('Unknown model')
        self.name = name
        with np.load(Path(directory) / (name+'.npz'), allow_pickle=False) as data:
            self.w = {k:data[k] for k in data.files}

    def forward(self, image, *, disabled_neuron=-1, negative_slope=0.0, use_positions=True):
        x = np.asarray(image,dtype=np.float32).reshape(28,28)
        if not np.isfinite(x).all() or x.min() < 0 or x.max() > 1:
            raise ValueError('Image values must be finite and in [0,1]')
        w = self.w
        if self.name == 'mlp':
            z1 = linear(x.flatten(),w,'fc1'); h1 = np.maximum(z1,0)
            if disabled_neuron >= 0:
                h1[disabled_neuron] = 0
            z2 = linear(h1,w,'fc2'); h2 = np.maximum(z2,0)
            logits = linear(h2,w,'fc3')
            detail = dict(pre1=z1,hidden1=h1,pre2=z2,hidden2=h2,disabled_neuron=disabled_neuron)
        elif self.name == 'cnn':
            padded = np.pad(x,2)[None]
            c1 = conv(padded,w['conv1.weight'],w['conv1.bias'])
            a1 = np.where(c1>0,c1,negative_slope*c1); p1 = pool(a1)
            c2 = conv(p1,w['conv2.weight'],w['conv2.bias'])
            a2 = np.where(c2>0,c2,negative_slope*c2); p2 = pool(a2)
            z1 = linear(p2.flatten(),w,'fc1'); h1 = np.maximum(z1,0)
            z2 = linear(h1,w,'fc2'); h2 = np.maximum(z2,0)
            logits = linear(h2,w,'fc3')
            detail = dict(input=padded[0],conv1=c1,relu1=a1,pool1=p1,conv2=c2,relu2=a2,pool2=p2,
                          pre1=z1,hidden1=h1,pre2=z2,hidden2=h2,negative_slope=negative_slope)
        else:
            patches = x.reshape(4,7,4,7).transpose(0,2,1,3).reshape(16,49)
            embedded = linear(patches,w,'patch')
            tokens = np.concatenate([w['cls'][0],embedded],axis=0)
            if use_positions:
                tokens = tokens + w['pos'][0]
            initial = tokens.copy(); blocks = []
            for i in range(2):
                prefix = f'blocks.{i}'
                q,k,v = linear(norm(tokens,w,prefix+'.norm1'),w,prefix+'.qkv').reshape(17,3,3,16).transpose(1,2,0,3)
                scores = q @ k.transpose(0,2,1) / 4
                attention = softmax(scores)
                mixed = attention @ v
                projected = linear(mixed.transpose(1,0,2).reshape(17,48),w,prefix+'.proj')
                residual = tokens + projected
                ffn = linear(gelu(linear(norm(residual,w,prefix+'.norm2'),w,prefix+'.fc1')),w,prefix+'.fc2')
                tokens = residual + ffn
                blocks.append(dict(q=q,k=k,v=v,scores=scores,attention=attention,mixed=mixed,
                                   projected=projected,residual=residual,ffn=ffn,output=tokens.copy()))
            logits = linear(norm(tokens,w,'norm')[0],w,'head')
            detail = dict(patches=patches,embedded=embedded,initial=initial,blocks=blocks,use_positions=use_positions)
        probabilities = softmax(logits)
        return dict(model=self.name,logits=logits,probabilities=probabilities,
                    prediction=int(np.argmax(probabilities)),detail=detail)
