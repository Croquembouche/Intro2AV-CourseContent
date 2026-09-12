"""Add the course chooser while preserving the existing root download URLs."""
import argparse
from pathlib import Path
import shutil
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
out=args.output.resolve();source=Path(__file__).resolve().parent
assert (out/'index.html').is_file(), 'Build Neural Vision first'
perception=out/'perception';perception.mkdir(exist_ok=True)
for item in list(out.iterdir()):
 if item.name in ['perception','sensor-fusion','localization','downloads']:continue
 if item.is_dir():shutil.copytree(item,perception/item.name,dirs_exist_ok=True)
 else:shutil.copy2(item,perception/item.name)
shutil.copy2(source/'index.html',out/'index.html')
for page in [perception/'index.html',out/'sensor-fusion/index.html',out/'localization/index.html']:
 if not page.is_file():continue
 s=page.read_text()
 # Hosting-only navigation keeps local and ROS demo packages independent.
 link='<a href="../" aria-label="All course demos" style="color:inherit;font:600 13px Arial,sans-serif;white-space:nowrap;padding:8px;border:1px solid currentColor;border-radius:5px;text-decoration:none">← All demos</a>'
 s=s.replace('<header>','<header>'+link,1);page.write_text(s)
print('Course portal built with perception/, sensor-fusion/, and localization/')
