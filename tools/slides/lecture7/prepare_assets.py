from pathlib import Path
from PIL import Image
import shutil
R=Path(__file__).resolve().parents[3]; B=R/'.build/slides/lecture7'; A=B/'assets'
for f in ['cover-background.jpeg','course-logo.png']:
 shutil.copy2(R/'.build/slides/lecture6/assets'/f,A/f)
for name in ['astar-search','field-trap','rrt-growth']:
 files=sorted((B/'frames'/name).glob('*.png')); assert len(files)==22
 frames=[Image.open(f).convert('RGB') for f in files]
 # Reserve the actual demo colors so small S/G/sample markers are not lost
 # among the many near-white antialiased grid colors during GIF quantization.
 colors=['00539f','008675','a055b8','dd840c','243e56','84c7df','b4cfdf','7e9caf','c95045','f4bc8a','f7e6b2','626c76','278568','ffffff']
 fixed=[int(c[j:j+2],16) for c in colors for j in (0,2,4)]
 adaptive=frames[-1].quantize(colors=256-len(colors)).getpalette()[:3*(256-len(colors))]
 palette=Image.new('P',(1,1));palette.putpalette(fixed+adaptive)
 frames=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in frames]
 frames[-1].save(A/(name+'.gif'),save_all=True,append_images=frames,duration=[1000]+[180]*21+[1600],loop=0,optimize=False)
print('Course artwork and three computed algorithm animations ready')
