#!/usr/bin/env python3
"""Reproduce the small MNIST teaching models; PyTorch is only needed here."""
import argparse
import hashlib
import json
import time
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from torchvision.datasets import MNIST

class MLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(784, 300)
        self.fc2 = nn.Linear(300, 100)
        self.fc3 = nn.Linear(100, 10)
    def forward(self, x):
        return self.fc3(F.relu(self.fc2(F.relu(self.fc1(x.flatten(1))))))

class CNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 6, 5)
        self.conv2 = nn.Conv2d(6, 16, 5)
        self.fc1 = nn.Linear(16 * 5 * 5, 120)
        self.fc2 = nn.Linear(120, 100)
        self.fc3 = nn.Linear(100, 10)
    def forward(self, x):
        x = F.pad(x, (2,2,2,2))
        x = F.max_pool2d(F.relu(self.conv1(x)), 2)
        x = F.max_pool2d(F.relu(self.conv2(x)), 2)
        x = F.relu(self.fc1(x.flatten(1)))
        return self.fc3(F.relu(self.fc2(x)))

class Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.norm1 = nn.LayerNorm(48)
        self.qkv = nn.Linear(48, 144)
        self.proj = nn.Linear(48, 48)
        self.norm2 = nn.LayerNorm(48)
        self.fc1 = nn.Linear(48, 96)
        self.fc2 = nn.Linear(96, 48)
    def forward(self, x):
        b, n, _ = x.shape
        q, k, v = self.qkv(self.norm1(x)).reshape(b,n,3,3,16).permute(2,0,3,1,4)
        attn = (q @ k.transpose(-2,-1) / 4).softmax(-1)
        x = x + self.proj((attn @ v).transpose(1,2).reshape(b,n,48))
        return x + self.fc2(F.gelu(self.fc1(self.norm2(x)), approximate='tanh'))

class ViT(nn.Module):
    def __init__(self):
        super().__init__()
        self.patch = nn.Linear(49, 48)
        self.cls = nn.Parameter(torch.zeros(1,1,48))
        self.pos = nn.Parameter(torch.randn(1,17,48) * .02)
        self.blocks = nn.ModuleList([Block(), Block()])
        self.norm = nn.LayerNorm(48)
        self.head = nn.Linear(48, 10)
    def forward(self, x):
        x = x.reshape(-1,1,4,7,4,7).permute(0,2,4,1,3,5).reshape(-1,16,49)
        x = torch.cat([self.cls.expand(x.shape[0],-1,-1), self.patch(x)],1) + self.pos
        for block in self.blocks:
            x = block(x)
        return self.head(self.norm(x)[:,0])

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--data', default='.build/neural-vision/mnist')
    p.add_argument('--output', default='2026/Labs/NeuralVision/ws/src/neural_vision_common/models')
    p.add_argument('--epochs', type=int, default=12, help='ViT epochs; MLP and CNN use half')
    args = p.parse_args()
    torch.manual_seed(647)
    torch.set_num_threads(4)
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
    train, test = MNIST(args.data, train=True, download=True), MNIST(args.data, train=False, download=True)
    order = torch.randperm(60000)
    images = train.data[order].float().unsqueeze(1).to(device) / 255
    labels = train.targets[order].to(device)
    x, y = images[:55000], labels[:55000]
    vx, vy = images[55000:], labels[55000:]
    tx = test.data.float().unsqueeze(1).to(device) / 255
    ty = test.targets.to(device)
    def accuracy(model, a, b):
        with torch.no_grad():
            return sum((model(z).argmax(1) == t).sum().item() for z,t in zip(a.split(512),b.split(512))) / len(b)
    report = {'dataset':'MNIST', 'seed':647, 'train_count':55000, 'validation_count':5000,
              'test_count':10000, 'input':'28 x 28 grayscale in [0,1]', 'device':device,
              'test_policy':'Best validation epoch selected before one final test evaluation.', 'models':{}}
    for name, kind in [('mlp', MLP), ('cnn', CNN), ('transformer', ViT)]:
        start = time.monotonic()
        model = kind().to(device)
        opt = torch.optim.AdamW(model.parameters(), lr=.002, weight_decay=.01)
        epochs = args.epochs if name == 'transformer' else max(1,args.epochs//2)
        best, state, history = 0, None, []
        for epoch in range(epochs):
            model.train()
            for ids in torch.randperm(len(x),device=device).split(256):
                # Shared small translation for each batch, to improve drawing tolerance.
                dx,dy = torch.randint(-2,3,(2,)).tolist()
                batch = torch.roll(x[ids],(dy,dx),(2,3))
                if dy > 0: batch[:,:,:dy,:] = 0
                elif dy < 0: batch[:,:,dy:,:] = 0
                if dx > 0: batch[:,:,:,:dx] = 0
                elif dx < 0: batch[:,:,:,dx:] = 0
                loss = F.cross_entropy(model(batch), y[ids])
                opt.zero_grad(); loss.backward(); opt.step()
            model.eval()
            acc = accuracy(model,vx,vy)
            history.append(acc)
            if acc > best:
                best = acc
                state = {k:v.detach().cpu().clone() for k,v in model.state_dict().items()}
            print(f'{name} epoch {epoch+1}/{epochs}: validation={acc:.4f}',flush=True)
        model.load_state_dict(state)
        model.eval()
        final = accuracy(model,tx,ty)
        np.savez_compressed(out / f'{name}.npz', **{k:v.numpy() for k,v in state.items()})
        with torch.no_grad():
            expected = model(tx[:40]).cpu().numpy()
        np.savez_compressed(out / f'{name}_reference.npz', inputs=tx[:40].cpu().numpy(), logits=expected)
        report['models'][name] = {'epochs':epochs,'validation_accuracy':best,'test_accuracy':final,
            'parameters':sum(v.numel() for v in model.parameters()), 'validation_history':history,
            'training_seconds':round(time.monotonic()-start,1),
            'sha256':hashlib.sha256((out/f'{name}.npz').read_bytes()).hexdigest()}
        print(f'{name} FINAL test={final:.4f}',flush=True)
    samples = []
    for digit in range(10):
        for idx in (test.targets == digit).nonzero().flatten()[:3]:
            samples.append({'label':digit,'index':int(idx),'pixels':test.data[idx].flatten().tolist()})
    (out/'samples.json').write_text(json.dumps(samples,separators=(',',':')))
    (out/'metrics.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__ == '__main__':
    main()
