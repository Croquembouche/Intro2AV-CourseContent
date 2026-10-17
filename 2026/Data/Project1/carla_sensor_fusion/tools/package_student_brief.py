#!/usr/bin/env python3
"""Build the limited-guidance UDrive student handout using an explicit file list."""
import hashlib,json,zipfile
from pathlib import Path

root=Path(__file__).resolve().parents[1]
course=root.parents[3]
files={
 'Project1_Description.pdf':course/'output/pdf/Project1_Description.pdf',
 'Project1_Description.md':root.parent/'Project1_Description.md',
 'README.md':root.parent/'Student_Setup.md',
}
for seq in ('stationary','driving'):
 for name in ('metadata.yaml','bag_0.db3'):files[f'{seq}/bag/{name}']=root/seq/'bag'/name
for name in ('CMakeLists.txt','package.xml','msg/DetectedObject.msg','msg/DetectedObjectArray.msg'):
 files['project1_interfaces/'+name]=root/'project1_interfaces'/name
assert len(files)==11
for seq in ('stationary','driving'):
 report=json.loads((root/seq/'playback_validation.json').read_text())
 assert report['status']=='passed' and report['header_frames_verified'] and report['clock_monotonic']
 assert report['tf_children']==['base_link','front_camera','front_camera_mount','top_lidar']
for path in files.values():assert path.is_file(),path

def digest_file(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(8*1024*1024),b''):h.update(chunk)
 return h.hexdigest()

destination=root.parents[1]/'project1_udrive_student.zip';temporary=destination.with_name(destination.name+'.tmp')
hashes={name:digest_file(path) for name,path in files.items()}
with zipfile.ZipFile(temporary,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for name,path in files.items():z.write(path,'project1_udrive/'+name)
 z.writestr('project1_udrive/SHA256SUMS',''.join(f'{h}  {name}\n' for name,h in hashes.items()))
# Reading every entry verifies ZIP CRC and SHA-256, including both full databases.
with zipfile.ZipFile(temporary) as z:
 assert set(z.namelist())=={'project1_udrive/'+n for n in files}|{'project1_udrive/SHA256SUMS'}
 for name,expected in hashes.items():
  h=hashlib.sha256()
  with z.open('project1_udrive/'+name) as f:
   for chunk in iter(lambda:f.read(8*1024*1024),b''):h.update(chunk)
  assert h.hexdigest()==expected,name
 assert not any(any(token in n.lower() for token in ('instructor','evaluation','ground_truth','projection','tools/')) for n in z.namelist())
temporary.replace(destination)
report={'status':'passed','zip':str(destination),'bytes':destination.stat().st_size,'sha256':digest_file(destination),'file_count':len(files)+1,'zip_crc_and_all_file_hashes':'passed','contents':hashes,'scope':'Only handout, setup, complete bags, output interface definitions and checksum manifest'}
(root.parent/'student_package_validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='contents'},indent=2),flush=True)
