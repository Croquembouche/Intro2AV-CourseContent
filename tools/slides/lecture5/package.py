"""Publish the verified deck locally and create a self-contained lecture archive."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image
from lxml import etree as E
import shutil,io,hashlib,json
root=Path(__file__).resolve().parents[3]
work=root/'.build/slides/lecture5'
source=Path((work/'final-path.txt').read_text())
target=root/'2026/Presentations/Lecture 5 Localization for Autonomous Driving.pptx'
with ZipFile(source) as z:
 slides=[n for n in z.namelist() if __import__('re').fullmatch(r'ppt/slides/slide\d+.xml',n)]
 notes=[n for n in z.namelist() if __import__('re').fullmatch(r'ppt/notesSlides/notesSlide\d+.xml',n)]
 assert len(slides)==len(notes)==32
 gifs=[n for n in z.namelist() if n.startswith('ppt/media/') and n.endswith('.gif')]
 animated=[n for n in gifs if Image.open(io.BytesIO(z.read(n))).n_frames>1]
 assert len(animated)==7,(len(gifs),len(animated))
 for name in notes:assert b'[Sources]' in z.read(name)
 tables=sum(z.read(n).count(b'<a:tbl>') for n in slides)
 assert tables==1
 links=[]
 for name in z.namelist():
  if name.endswith('.rels'):
   for rel in E.fromstring(z.read(name)):
    if rel.get('TargetMode')=='External':links.append(rel.get('Target'))
 for mode in ['icp','amcl','ndt']:assert any(x.endswith('/#'+mode) for x in links)
shutil.copy2(source,target)
zip_path=root/'2026/Data/Lecture5_Localization.zip'
with ZipFile(zip_path,'w',ZIP_DEFLATED) as z:
 z.write(target,'Lecture5/Presentations/'+target.name)
 guide=root/'2026/Presentations/Lecture 5 - Teaching Guide.md';z.write(guide,'Lecture5/Presentations/'+guide.name)
 lab=root/'2026/Labs/Localization'
 for p in sorted(lab.rglob('*')):
  if p.is_file():z.write(p,'Lecture5/Labs/Localization/'+str(p.relative_to(lab)))
 z.writestr('Lecture5/README.txt','Lecture 5: Localization\n\nOpen Labs/Localization/index.html to use the demos offline.\nOpen Presentations/Lecture 5 Localization for Autonomous Driving.pptx for the slides.\nThe teaching guide contains pacing, discussion prompts, and explanations.\nGIF animations are embedded in the PPTX and available in Labs/Localization/gifs/.\nSlides link to the online demos; use the local index.html when offline.\n')
report=dict(slides=32,notes=32,animated_gifs=len(animated),editable_tables=tables,pptx_sha256=hashlib.sha256(target.read_bytes()).hexdigest(),zip_sha256=hashlib.sha256(zip_path.read_bytes()).hexdigest())
(work/'package-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
