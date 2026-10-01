"""Verify and publish the finalized course deck and self-contained offline package."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from PIL import Image
import io,re,json,shutil,hashlib
R=Path(__file__).resolve().parents[3];B=R/'.build/slides/lecture6';source=Path((B/'final-path.txt').read_text().strip());C=json.loads((R/'tools/slides/lecture6/content.json').read_text())
with ZipFile(source) as z:
 slides=[n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml',n)];notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+.xml',n)]
 assert len(slides)==len(notes)==len(C)==49
 assert all(b'[Sources]' in z.read(n) for n in notes)
 tables=sum(z.read(n).count(b'<a:tbl>') for n in slides);assert tables==6
 gifs=[n for n in z.namelist() if n.startswith('ppt/media/') and n.endswith('.gif')];assert len(gifs)==3
 assert all(Image.open(io.BytesIO(z.read(n))).n_frames==12 for n in gifs)
 rels=''.join(z.read(n).decode() for n in z.namelist() if n.endswith('.rels'));assert '/mapping/#visual' in rels and '/mapping/#lidar' in rels and '/mapping/#challenge' in rels
 assert z.testzip() is None
out=R/'2026/Presentations/Lecture 6 Mapping for Autonomous Driving.pptx';shutil.copy2(source,out)
release=R/'2026/Data/Lecture6_Mapping.zip';lab=R/'2026/Labs/Mapping'
with ZipFile(release,'w',ZIP_DEFLATED) as z:
 z.write(out,'Lecture6/Presentations/'+out.name)
 for p in sorted(lab.rglob('*')):
  if p.is_file():z.write(p,'Lecture6/Labs/Mapping/'+str(p.relative_to(lab)))
 z.writestr('Lecture6/README.txt','Lecture 6: Mapping for Autonomous Driving\n\nOpen Labs/Mapping/index.html to play the real KITTI camera/LiDAR sequence offline.\nThe slide deck is in Presentations/. Recorded display controls do not rerun estimators.\nThe separate controlled scenario recomputes GPS/loop pose graphs, terrain and failure effects locally.\nVisual map scale is arbitrary; LiDAR map units are meters.\nKITTI and derived data: CC BY-NC-SA 3.0, Geiger, Lenz, Urtasun, CVPR 2012.\nhttps://www.cvlibs.net/datasets/kitti/\n')
with ZipFile(release) as z:
 assert z.testzip() is None
 assert 'Lecture6/Labs/Mapping/challenges.js' in z.namelist()
 assert b'challenge-controls' in z.read('Lecture6/Labs/Mapping/index.html')
report={'slides':len(slides),'speaker_notes':len(notes),'animated_gifs':len(gifs),'editable_tables':tables,'pptx_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'zip_sha256':hashlib.sha256(release.read_bytes()).hexdigest()};(B/'package-check.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
