"""Deliver only the validated deck and a portable lecture/demo bundle."""
from pathlib import Path
import json, shutil, zipfile, re
import xml.etree.ElementTree as E
R=Path(__file__).resolve().parents[3]
B=R/'.build/slides/lecture4'
source=Path((B/'final-path.txt').read_text())
receipt=json.loads((B/('validation-'+source.stem.split('-')[-1]+'.json')).read_text())
assert receipt['packageIntegrity']['findingCount']==0
assert receipt['presentationLayout']['findingCount']==0
assert receipt['firstPartyImport']['passed']
target=R/'2026/Presentations/Lecture 4 Sensor Fusion for Autonomous Driving.pptx'
with zipfile.ZipFile(source) as z:
 assert z.testzip() is None
 slides=[n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml',n)]
 notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+.xml',n)]
 assert len(slides)==len(notes)==30
 for n in notes:
  text=' '.join(E.fromstring(z.read(n)).itertext())
  assert '[Sources]' in text
 found=[]
 for i,tab in [(7,'arm'),(12,'camera'),(17,'lidar'),(21,'calibration'),(25,'fusion')]:
  rel=E.fromstring(z.read(f'ppt/slides/_rels/slide{i}.xml.rels'))
  matching=[r for r in rel if r.attrib.get('Type','').endswith('/hyperlink') and r.attrib.get('Target','').endswith('index.html#'+tab)]
  assert matching,(i,tab)
  assert all(r.attrib.get('TargetMode')=='External' for r in matching)
  found.append((i,tab))
 assert sum(z.read(n).count(b'<a:tbl>') for n in slides)==4
shutil.copyfile(source,target)
archive=R/'2026/Data/Lecture4_SensorFusion.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 z.write(target,'Lecture4/Presentations/'+target.name)
 for name in ['index.html','lab.js','scene3d.js','README.md','vendor/three.min.js','vendor/THREE-LICENSE.txt']:
  z.write(R/'2026/Labs/SensorFusion'/name,'Lecture4/Labs/SensorFusion/'+name)
 z.writestr('Lecture4/START_HERE.txt','Lecture 4: Sensor fusion\n\n1. Extract this entire ZIP.\n2. Open Labs/SensorFusion/index.html in a browser.\n3. Open the PowerPoint in Presentations.\n4. The instructor guide is Labs/SensorFusion/README.md.\n\nNo installation or internet connection is required for the demos.\nKeep the folder layout to preserve the slide links.\nIf PowerPoint blocks local HTML links, open the demo manually.\n')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert z.read('Lecture4/Presentations/'+target.name)==target.read_bytes()
 assert len(z.namelist())==8
print(json.dumps({'deck':str(target),'slides':30,'notes':30,'tables':4,'demo_links':found,'archive':str(archive),'archive_files':8,'layout_warnings':receipt['presentationLayout'].get('warnings',[])},indent=2))
