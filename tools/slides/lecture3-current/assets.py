from pathlib import Path
from PIL import Image
import shutil,json
R=Path(__file__).resolve().parents[3];V=R/'.build/slides/lecture3-current/assets';P=R/'2026/Presentations';old=P/'Lecture3_Visuals_Revised';O=P/'Lecture3_Approved_Visuals';G=Path('/home/william/.codex/generated_images/01a06e34-cbd2-7722-83b8-26580858a25f')
if not old.exists():
 assert (V/'sources.json').exists()
 print('Using prepared private media library')
 raise SystemExit(0)
# Sources remain in private working storage after delivery cleanup.
manifest=json.loads((old/'sources.json').read_text())
for f in old.glob('*.png'):shutil.copy2(f,V/f.name)
for f in old.glob('*.gif'):shutil.copy2(f,V/f.name)
def crop(src,name,b,kind='AI-generated conceptual teaching illustration',sources=None):
 im=Image.open(src).convert('RGB');w,h=im.size;im.crop(tuple(round(v*(w if i%2==0 else h)) for i,v in enumerate(b))).save(V/name)
 manifest.append(dict(file=name,kind=kind,sources=sources or ['ImageGen, 2026-09-04. Conceptual illustration, not model output.']))
crop(G/'exec-df428388-9a68-4697-8e7e-f0db97d8312a.png','car_hierarchy.png',(0,.205,1,.85))
crop(G/'exec-f9691213-e3f7-492a-8816-24334ca662e0.png','attention_mix.png',(0,.025,1,.81))
var=G/'exec-797b170a-49a7-4d83-8f38-4caf323163f6.png'
for name,b in [('car_day.png',(.018,.027,.492,.49)),('car_night.png',(.508,.027,.982,.49)),('car_rain.png',(.018,.512,.492,.974)),('car_occluded.png',(.508,.512,.982,.974))]:crop(var,name,b)
for src,name,frame in [('residual_story.gif','residual.png',0),('pyramid_story.gif','pyramid.png',1),('22_detection.gif','detection.png',1)]:
 im=Image.open(O/src);im.seek(frame);im.convert('RGB').save(V/name)
 a=next(a for a in json.loads((O/'sources.json').read_text()) if a['file']==src)
 manifest.append(dict(file=name,kind='Static published figure: '+a['kind'],sources=a['sources']))
# One clearer handwriting row, retained as a still.
im=Image.open(O/'digit_variation.gif');im.seek(2);im.convert('RGB').save(V/'writing.png')
manifest.append(dict(file='writing.png',kind='Existing course handwriting illustration',sources=['Earlier course handwriting illustration; not asserted to be dataset samples.']))
# Detail of one pedestrian region for the scale discussion, no invented detection.
crop(old/'road.png','pedestrian_detail.png',(.25,.18,.40,.55),kind='Crop of the same conceptual road illustration')
# Full-frame originals and citations remain private.
unique={a['file']:a for a in manifest};(V/'sources.json').write_text(json.dumps(list(unique.values()),indent=2))
print('Prepared private media library')
