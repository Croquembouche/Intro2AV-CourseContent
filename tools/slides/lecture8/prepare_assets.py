from pathlib import Path
from zipfile import ZipFile
R=Path(__file__).resolve().parents[3]
A=R/'.build/slides/lecture8/assets'; A.mkdir(parents=True,exist_ok=True)
with ZipFile(R/'2025/Presentations/Lecture 8.pptx') as z:
 for src,dst in [('ppt/media/image1.jpg','cover-background.jpeg'),('ppt/media/image4.png','course-logo.png')]:
  (A/dst).write_bytes(z.read(src))
print('Original Intro2AV artwork extracted from the editable reference deck')
