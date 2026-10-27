"""Package the reviewed Lecture 8 artifacts without publishing them."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
from xml.etree import ElementTree as ET
import json,re,shutil
R=Path(__file__).resolve().parents[3]; B=R/'.build/slides/lecture8'
final=Path((B/'final-path.txt').read_text().strip()); content=json.loads((R/'tools/slides/lecture8/content.json').read_text())
assert len(content)==35
with ZipFile(final) as z:
 assert z.testzip() is None
 slides=[n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)]
 notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml',n)]
 assert len(slides)==len(notes)==len(content)
 assert sum(z.read(n).count(b'<a:tbl>') for n in slides)==sum(c['layout']=='table' for c in content)
 links=[]
 for n in z.namelist():
  if re.fullmatch(r'ppt/slides/_rels/slide\d+\.xml.rels',n):
   for rel in ET.fromstring(z.read(n)):
    if rel.attrib.get('Type','').endswith('/hyperlink'):
     target=rel.attrib['Target'];assert rel.attrib.get('TargetMode')=='External'
     assert target.startswith('../Labs/Control/index.html#');links.append(target)
 assert len(links)==sum(bool(c.get("demo")) for c in content),links
 for n in notes:
  texts=[e.text or '' for e in ET.fromstring(z.read(n)).iter() if e.tag.endswith('}t')]
  assert len(' '.join(texts))>100
P=R/'2026/Presentations'; title='Lecture 8 Control for Autonomous Driving'
pptx=P/(title+'.pptx'); pdf=P/(title+'.pdf')
shutil.copy2(final,pptx);shutil.copy2(B/'pdf/candidate.pdf',pdf)
start='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lecture 8 · Control</title><style>body{font:18px/1.6 Arial,sans-serif;max-width:850px;margin:60px auto;padding:24px;background:#f4f8fc;color:#17324d}h1{color:#00539f}a{color:#00539f}li{margin:12px 0}</style><h1>Lecture 8: Control for autonomous driving</h1><p>Start with the slides or explore an interactive experiment. Everything in this package runs offline after extraction.</p><ul><li><a href="Presentations/Lecture%208%20Control%20for%20Autonomous%20Driving.pptx">Editable PowerPoint with speaker notes</a></li><li><a href="Presentations/Lecture%208%20Control%20for%20Autonomous%20Driving.pdf">PDF slides</a></li><li><a href="Labs/Control/index.html">Open the six control demonstrations</a></li><li><a href="Labs/Control/concept-guide.html">Concept guide</a></li><li><a href="Labs/Control/README.md">Demo guide, model assumptions, and sources</a></li></ul><p>PID speed control, Pure Pursuit, Stanley, LQR, MPC, and a shared-scenario comparison. Load a named case and press Play. Watch a contrasting case and explain the difference. No calculations or written exercises are required. Previous runs are saved for visual comparison.</p><p>The simulations teach controller behavior using simplified vehicle models. They do not connect to a physical vehicle.</p></html>'''
archive=R/'2026/Data/Lecture8_Control.zip'
# Version every local browser asset when packaging, preventing mixed cached releases.
index=R/'2026/Labs/Control/index.html'
html=index.read_text()
for name in ['engine.js','lessons.js','plots.js','app.js','teaching-guide.js','style.css']:
 digest=sha256((index.parent/name).read_bytes()).hexdigest()[:12]
 html=re.sub(r'(["\'])'+re.escape(name)+r'(?:\?[^"\']*)?(["\'])',lambda m:m[1]+name+'?v='+digest+m[2],html)
index.write_text(html)
files=[(pptx,'Lecture8/Presentations/'+pptx.name),(pdf,'Lecture8/Presentations/'+pdf.name)]
for f in sorted((R/'2026/Labs/Control').iterdir()):
 if f.is_file():files.append((f,'Lecture8/Labs/Control/'+f.name))
with ZipFile(archive,'w',ZIP_DEFLATED) as z:
 z.writestr('Lecture8/START_HERE.html',start)
 for src,dst in files:z.write(src,dst)
with ZipFile(archive) as z:
 assert z.testzip() is None
 for src,dst in files:assert z.read(dst)==src.read_bytes()
 extract=B/'offline-test'
 if extract.exists():shutil.rmtree(extract)
 extract.mkdir();z.extractall(extract)
report={'slides':len(content),'notes':len(content),'native_tables':sum(c['layout']=='table' for c in content),'demo_links':len(links),'experiments':6,'files':[{ 'path':str(f),'bytes':f.stat().st_size,'sha256':sha256(f.read_bytes()).hexdigest()} for f in [pptx,pdf,archive]],'import_readback':'Timed out after 90 seconds; not verified','rendered_with':'LibreOffice/Poppler','revision_validation':'Numerical and DOM-double event-handler tests; live browser access blocked by tool policy, so revised browser interactions not verified'}
(B/'delivery.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
