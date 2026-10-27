"""Complete a Neural Vision Pages build with the course portal and materials."""
import argparse
from pathlib import Path
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
out = args.output.resolve()
source = Path(__file__).resolve().parent
course = source.parents[1]
routes = {
    'sensor-fusion': 'SensorFusion',
    'localization': 'Localization',
    'mapping': 'Mapping',
    'path-planning': 'PathPlanning',
    'control': 'Control',
}
assert (out / 'index.html').is_file(), 'Build Neural Vision first'
perception = out / 'perception'
perception.mkdir(exist_ok=True)
for item in list(out.iterdir()):
    if item.name in {'perception', 'downloads', *routes}:
        continue
    if item.is_dir():
        shutil.copytree(item, perception / item.name, dirs_exist_ok=True)
    else:
        shutil.copy2(item, perception / item.name)
for route, lab in routes.items():
    shutil.copytree(course / 'Labs' / lab, out / route, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
downloads = out / 'downloads'
downloads.mkdir(exist_ok=True)
for pattern in ('*.pptx', '*.pdf'):
    for deck in sorted((course / 'Presentations').glob(pattern)):
        shutil.copy2(deck, downloads / deck.name)
for pattern in ('Lecture*.zip', 'ClassicalCV*.zip', 'NeuralVision*.zip'):
    for package in sorted((course / 'Data').glob(pattern)):
        shutil.copy2(package, downloads / package.name)
shutil.copy2(source / 'index.html', out / 'index.html')
for route in ['perception', *routes]:
    page = out / route / 'index.html'
    text = page.read_text().replace('../Portal/index.html', '../')
    if 'id="all-demos"' not in text:
        link = '<a href="../" aria-label="All course demos" style="color:inherit;font:600 13px Arial,sans-serif;white-space:nowrap;padding:8px;border:1px solid currentColor;border-radius:5px;text-decoration:none">← All demos</a>'
        text = text.replace('<header>', '<header>' + link, 1)
    page.write_text(text)
print('Course portal built: ' + ', '.join(['perception', *routes]))
