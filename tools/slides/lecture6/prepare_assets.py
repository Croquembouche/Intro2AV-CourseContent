"""Crop measured browser screenshots and package recorded playback as GIFs."""
from pathlib import Path
from PIL import Image
from zipfile import ZipFile
R=Path(__file__).resolve().parents[3];B=R/'.build/slides/lecture6';A=B/'assets';A.mkdir(exist_ok=True)
# Preserve the existing course artwork byte for byte from the checked-in starter.
with ZipFile(R/'tools/slides/perception/templates/neural-template-starter.pptx') as z:
 for source,target in [('ppt/media/image.jpeg','cover-background.jpeg'),('ppt/media/image.png','course-logo.png')]:
  (A/target).write_bytes(z.read(source))
# Bounds measured from the desktop browser DOM. These are unaltered computed outputs.
S=(45,487,660,897);M=(714,487,1220,852);W=(28,430,1236,1010)
def crop(src,box,out): Image.open(B/src).crop(box).save(A/out)
crop('demo-visual.png',S,'features.png')
crop('demo-visual.png',W,'sequence.png')
crop('visual-mid.png',S,'inliers.png')
crop('initialization.png',M,'triangulation.png')
crop('selected-landmark.png',W,'landmark.png')
crop('demo-lidar.png',S,'lidar-scan.png')
crop('lidar-oblique.png',S,'lidar-planes.png')
crop('frames/visual/08.png',W,'comparison.png')
for name,folder,box in [('visual-tracking','visual',S),('lidar-registration','lidar',S),('lidar-growth','lidar',M)]:
 frames=[Image.open(p).crop(box).convert('RGB') for p in sorted((B/'frames'/folder).glob('*.png'))]
 frames[0].save(A/(name+'.gif'),save_all=True,append_images=frames[1:],duration=350,loop=0,optimize=False)
print('Prepared',len(list(A.iterdir())),'evidence assets')
