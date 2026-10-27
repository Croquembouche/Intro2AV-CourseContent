"""Refresh demo files in existing lecture ZIPs without rebuilding slide decks."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import subprocess
ROOT=Path(__file__).resolve().parents[2]
for number,lab in [(4,'SensorFusion'),(5,'Localization'),(6,'Mapping'),(7,'PathPlanning'),(8,'Control')]:
 archive=next((ROOT/'2026/Data').glob(f'Lecture{number}_*.zip'))
 prefix=f'Lecture{number}/Labs/{lab}/'
 folder=ROOT/'2026/Labs'/lab
 payload={prefix+p.relative_to(folder).as_posix():p.read_bytes() for p in folder.rglob('*') if p.is_file() and not {'__pycache__','build','install','log'} & set(p.parts) and p.suffix!='.pyc'}
 with ZipFile(archive) as z: preserved=[(info,z.read(info.filename)) for info in z.infolist() if not info.filename.startswith(prefix)]
 temp=archive.with_suffix('.zip.tmp')
 with ZipFile(temp,'w',ZIP_DEFLATED,compresslevel=9) as z:
  for info,data in preserved:z.writestr(info,data)
  for name,data in sorted(payload.items()):z.writestr(name,data)
 with ZipFile(temp) as z:
  assert z.testzip() is None
  for name,data in payload.items():assert z.read(name)==data
 temp.replace(archive)
 print('Updated and verified',archive.name,len(payload),'demo files')
subprocess.run(['python',str(ROOT/'2026/Labs/NeuralVision/tools/package_release.py'),'--output',str(ROOT/'2026/Data/NeuralVision_student.zip')],check=True)
