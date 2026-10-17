#!/usr/bin/env python3
"""Create and fully verify a student-only ZIP; exclude source labels and capture tools."""
from pathlib import Path
import hashlib,json,zipfile,os
root=Path(__file__).resolve().parents[1]
paths=[root/'README.md',root/'validation.json',root/'playback_validation.json',root/'surround_preview.jpg']
paths+=sorted((root/'bag').glob('*'))
paths+=[root/'project1_interfaces'/p for p in ['CMakeLists.txt','package.xml','msg/DetectedObject.msg','msg/DetectedObjectArray.msg']]
assert len(paths)==10
entries={}
for p in paths:
 assert p.is_file(),p
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(8*1024*1024),b''):h.update(chunk)
 entries[p.relative_to(root).as_posix()]={'bytes':p.stat().st_size,'sha256':h.hexdigest()}
manifest=''.join(f'{v["sha256"]}  {k}\n' for k,v in entries.items())
zip_path=root.parent/'surround_fusion_async_student.zip';tmp=zip_path.with_suffix('.zip.building')
with zipfile.ZipFile(tmp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
 for p in paths:z.write(p,'surround_fusion_async/'+p.relative_to(root).as_posix())
 z.writestr('surround_fusion_async/SHA256SUMS',manifest)
with zipfile.ZipFile(tmp) as z:
 assert set(z.namelist())=={'surround_fusion_async/'+p for p in entries}|{'surround_fusion_async/SHA256SUMS'}
 for k,v in entries.items():
  h=hashlib.sha256()
  with z.open('surround_fusion_async/'+k) as f:
   for chunk in iter(lambda:f.read(8*1024*1024),b''):h.update(chunk)
  assert h.hexdigest()==v['sha256'],k
os.replace(tmp,zip_path)
h=hashlib.sha256()
with zip_path.open('rb') as f:
 for chunk in iter(lambda:f.read(8*1024*1024),b''):h.update(chunk)
r={'status':'passed','zip_path':str(zip_path),'bytes':zip_path.stat().st_size,'sha256':h.hexdigest(),'all_entry_crc_and_sha256_verified':True,'entries':entries}
(root/'instructor/student_package_validation.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
