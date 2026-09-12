"""Encode captured browser frames; no illustrative frames are drawn here."""
from pathlib import Path
from PIL import Image
import shutil
root=Path('.build/slides/lecture5')
out=Path('2026/Labs/Localization/gifs')
for folder in sorted((root/'frames').iterdir()):
 frames=[Image.open(f).convert('RGB') for f in sorted(folder.glob('*.png'))]
 durations=[380]*len(frames);durations[0]=1000;durations[-1]=1600
 frames[0].save(out/(folder.name+'.gif'),save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=False)
 shutil.copy2(out/(folder.name+'.gif'),root/'assets')
shutil.copy2(root/'frames/icp-alignment/001.png',root/'assets/icp-pairs.png')
shutil.copy2(root/'frames/amcl-cycle/002.png',root/'assets/amcl-weighted.png')
items=[('icp-alignment','ICP: alternating correspondences and rigid updates'),('icp-poor-guess','ICP: a wrong initial guess'),('amcl-cycle','AMCL: motion, weighting, adaptive resampling'),('amcl-kidnapped','AMCL: localization after an unobserved pose change'),('amcl-global','AMCL: global reinitialization'),('ndt-alignment','NDT: optimizing pose against map Gaussians'),('ndt-coarse','NDT: coarse map cells')]
html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lecture 5 GIFs</title><style>body{font:18px/1.6 Arial;color:#17324d;max-width:960px;margin:auto;padding:24px}img{max-width:100%}a{color:#00539f}</style><a href="../">← Localization demos</a><h1>Lecture 5 animations</h1><p>Open an animation to play it. Download the GIF to insert it into your own slides. All frames are outputs of the accompanying synthetic teaching simulations.</p>'
for name,title in items:
 html+=f'<section><h2>{title}</h2><p><a href="{name}.gif" download>Download GIF</a></p><details><summary>Play animation</summary><img loading="lazy" src="{name}.gif" alt="{title}"></details></section>'
(out/'index.html').write_text(html)
print('Encoded',len(items),'GIFs')
