"""Check authored copy, captured evidence, notes, PDF text, and embedded colors."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
from PIL import Image
from collections import Counter
import json,hashlib,io,re,posixpath
import pymupdf
R=Path(__file__).resolve().parents[3];B=R/'.build/slides/lecture7'
C=json.loads((R/'tools/slides/lecture7/content.json').read_text());p=Path((B/'final-path.txt').read_text().strip())
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
normalize=lambda t:re.sub(r'\s+','',t)
pdf=pymupdf.open(B/'pdf/candidate.pdf');assert len(pdf)==len(C)==47
with ZipFile(p) as z:
 for i,s in enumerate(C,1):
  node=E.fromstring(z.read(f'ppt/slides/slide{i}.xml'));text=''.join(node.xpath('//a:t/text()',namespaces=ns));notes=''.join(E.fromstring(z.read(f'ppt/notesSlides/notesSlide{i}.xml')).xpath('//a:t/text()',namespaces=ns))
  if i>1:assert normalize(s['title']) in normalize(text),(i,'title')
  for line in s['body'] if i>1 else []:assert normalize(line) in normalize(text),(i,line)
  if s.get('legend'):assert normalize(s['legend']) in normalize(text),(i,'legend')
  assert normalize(s['notes']) in normalize(notes),(i,'notes')
  assert '[Sources]' in notes
  rels=E.fromstring(z.read(f'ppt/slides/_rels/slide{i}.xml.rels'))
  media=[(x.get('Target').lstrip('/') if x.get('Target').startswith('/') else posixpath.normpath('ppt/slides/'+x.get('Target'))) for x in rels if x.get('Type','').endswith('/image')]
  embedded={hashlib.sha256(z.read(x)).hexdigest() for x in media}
  for name in s['media']:assert hashlib.sha256((B/'assets'/name).read_bytes()).hexdigest() in embedded,(i,name)
  if i>1:assert normalize(s['title']) in normalize(pdf[i-1].get_text()),(i,'PDF title')
  for line in ([s.get('legend','')]+s['body']) if i>1 else []:
   assert normalize(line) in normalize(pdf[i-1].get_text()),(i,'PDF content',line)
 assert z.testzip() is None
# Reserved palette prevents rare, meaningful marker colors being quantized away.
for name in ['astar-search','rrt-growth','field-trap']:
 im=Image.open(B/'assets'/f'{name}.gif');assert im.n_frames>1
 colors=Counter(im.convert('RGB').get_flattened_data())
 for rgb in [(0,134,117),(160,85,184)]+([(221,132,12)] if name=='rrt-growth' else []):assert colors[rgb]>0,(name,rgb)
assert all(s.get('legend') for s in C if s['media'])
print(f'PASS {len(C)} slides: authored text/notes, PDF content, exact embedded capture bytes, {sum(bool(s["media"]) for s in C)} visual keys, GIF marker colors')
