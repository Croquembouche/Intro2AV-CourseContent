from pathlib import Path
from lxml import etree as E
from PIL import Image
import zipfile,json,hashlib,posixpath,io,shutil
R=Path(__file__).resolve().parents[3];B=R/'.build/slides/lecture3-current';F=Path((B/'final-path.txt').read_text());C=json.loads((R/'tools/slides/lecture3-current/content.json').read_text());V=B/'assets'
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def resolve(owner,target):return target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(owner),target))
def rels(z,owner):
 f=posixpath.join(posixpath.dirname(owner),'_rels',posixpath.basename(owner)+'.rels')
 return {e.get('Id'):(e.get('Type').rsplit('/',1)[-1],e.get('Target'),e.get('TargetMode')) for e in E.fromstring(z.read(f))}
checks=[]
animated=[]
with zipfile.ZipFile(F) as z:
 presentation=E.fromstring(z.read('ppt/presentation.xml'))
 assert len(presentation.xpath('//p:sldId',namespaces=ns))==33,'Unexpected slide count'
 for c in C:
  i=c['slide'];owner=f'ppt/slides/slide{i}.xml';x=E.fromstring(z.read(owner));r=rels(z,owner)
  texts=x.xpath('//a:t/text()',namespaces=ns);assert str(i) in texts,('page number',i)
  assert ('GIF' in texts)==any(n.endswith('.gif') for n in c['media']),('GIF badge',i)
  hashes=[]
  for q in x.xpath('//a:blip/@r:embed',namespaces=ns):
   part=resolve(owner,r[q][1]);hashes.append(hashlib.sha256(z.read(part)).hexdigest())
  for name in c['media'] if i>1 else ['car-logo.png']:
   assert hashlib.sha256((V/name).read_bytes()).hexdigest() in hashes,(i,name)
   if name.endswith('.gif'):
    im=Image.open(V/name)
    assert im.n_frames>1 and im.info.get('loop')==0,(i,name,'animation metadata')
    frame_hashes=[];durations=[]
    for frame_index in range(im.n_frames):
     im.seek(frame_index);im.load()
     frame_hashes.append(hashlib.sha256(im.convert('RGB').tobytes()).hexdigest())
     durations.append(im.info.get('duration',0))
    assert len(set(frame_hashes))>1 and all(durations),(i,name,'animation frames')
    animated.append(dict(slide=i,file=name,frames=im.n_frames,loop_ms=sum(durations)))
  if i>1:
   lay=resolve(owner,next(v[1] for v in r.values() if v[0]=='slideLayout'));lx=E.fromstring(z.read(lay));lr=rels(z,lay)
   logo=hashlib.sha256((V/'car-logo.png').read_bytes()).hexdigest()
   assert any(hashlib.sha256(z.read(resolve(lay,lr[q][1]))).hexdigest()==logo for q in lx.xpath('//a:blip/@r:embed',namespaces=ns)),('logo',i)
  checks.append(dict(slide=i,page=True,logo=True,visuals=True))
 assert sum(c['minutes'] for c in C)==75
 assert len(C)==33 and all(c['minutes']>0 for c in C)
 assert {g['slide'] for g in animated}=={5,6,7,9,10,11,13,14,15,16,19,20,24,26,27,32},animated

 for i in [22]:
  x=E.fromstring(z.read(f'ppt/slides/slide{i}.xml'));assert len(x.xpath('//a:tbl',namespaces=ns))==1
 links=[]
out=R/'2026/Presentations/Lecture 3 Perception - CNNs and Transformers.pptx'
shutil.copy2(F,out)
assert hashlib.sha256(F.read_bytes()).digest()==hashlib.sha256(out.read_bytes()).digest()
(B/'delivery-checks.json').write_text(json.dumps(dict(slides=checks,animations=animated,external_links=links,minutes=75,final=str(out)),indent=2))
print('33 page numbers, 33 logos, 16 looping GIFs, all embedded visuals matched, 75 minutes. Delivered',out)
