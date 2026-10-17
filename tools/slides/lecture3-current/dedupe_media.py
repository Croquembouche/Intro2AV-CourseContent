"""Deduplicate identical exported media, preserving every referenced byte."""
import zipfile,hashlib,posixpath,sys
from pathlib import Path
from lxml import etree as E
p=Path(sys.argv[1]);tmp=p.with_suffix('.compact.pptx')
with zipfile.ZipFile(p) as z:
 blobs={i.filename:z.read(i) for i in z.infolist()}; seen={}; aliases={}
 for name,data in blobs.items():
  if name.startswith('ppt/media/'):
   key=(Path(name).suffix,hashlib.sha256(data).hexdigest())
   if key in seen:aliases[name]=seen[key]
   else:seen[key]=name
 for name,data in list(blobs.items()):
  if not name.endswith('.rels'):continue
  root=E.fromstring(data);base=posixpath.dirname(posixpath.dirname(name));changed=False
  for r in root:
   target=r.get('Target','')
   if r.get('TargetMode')=='External':continue
   resolved=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(base,target))
   if resolved in aliases:r.set('Target','/'+aliases[resolved]);changed=True
  if changed:blobs[name]=E.tostring(root,xml_declaration=True,encoding='utf-8')
 ct=E.fromstring(blobs['[Content_Types].xml'])
 for e in list(ct):
  if e.get('PartName','').lstrip('/') in aliases:ct.remove(e)
 blobs['[Content_Types].xml']=E.tostring(ct,xml_declaration=True,encoding='utf-8')
 with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as out:
  for name,data in blobs.items():
   if name not in aliases:out.writestr(name,data)
tmp.replace(p)
print('Deduplicated',len(aliases),'identical media parts;',round(p.stat().st_size/1e6,1),'MB')
