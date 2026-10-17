from pathlib import Path
from PIL import Image
import shutil
R=Path(__file__).resolve().parents[3]; B=R/'.build/slides/lecture7'; A=B/'assets'
for f in ['cover-background.jpeg','course-logo.png']:
 shutil.copy2(R/'.build/slides/lecture6/assets'/f,A/f)
for name in ['astar-search','field-trap','rrt-growth']:
 files=sorted((B/'frames'/name).glob('*.png')); assert len(files)==22
 frames=[Image.open(f).convert('RGB').resize((840,513)) for f in files]
 frames[-1].save(A/(name+'.gif'),save_all=True,append_images=frames,duration=[1000]+[180]*21+[1600],loop=0,optimize=False)
print('Course artwork and three computed algorithm animations ready')
