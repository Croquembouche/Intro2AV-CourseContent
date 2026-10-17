"""Assemble reviewed ImageGen storyboard panels as slow explanatory GIFs.

This crops supplied illustrations and sequences them; it draws no visual assets.
Original artwork and build products remain in private folders.
"""
from pathlib import Path
from PIL import Image, ImageSequence, ImageOps
import json, hashlib, shutil

R = Path(__file__).resolve().parents[3]
B = R / '.build/slides/lecture3-current'
V = B / 'assets'
G = Path('/home/william/.codex/generated_images/01a06e34-cbd2-7722-83b8-26580858a25f')
SHEETS = {
    'pooling_motion.gif': 'exec-818d7e1c-1773-482e-a184-0df172e22aed.png',
    'residual_motion.gif': 'exec-2ce0e4bd-147c-4511-9daa-e286a4de8a0c.png',
    'attention_motion.gif': 'exec-e3d19363-c004-4d49-9a72-d982eb7a9dd7.png',
    'relu_motion.gif': 'exec-0c443220-b193-4696-a146-4557ef7d08b1.png',
    'patches_motion.gif': 'exec-a35b9ca6-7626-4abe-8eaf-d18a0af03610.png',
    'hierarchy_motion.gif': 'exec-59942154-b4ca-4041-b51a-92cf758b56fa.png',
    'windows_motion.gif': 'exec-4455f784-4cbe-4848-9d3a-783ab5ddc330.png',
    'leaky_motion.gif': 'exec-aa21e47b-78f6-443b-8b7b-bc58bc5870c7.png',
}
manifest = json.loads((V / 'sources.json').read_text())
def record(entry):
    manifest[:] = [x for x in manifest if x['file'] != entry['file']]
    manifest.append(entry)

for name, source in SHEETS.items():
    im = Image.open(G / source).convert('RGB')
    if name == 'windows_motion.gif':
        # The shared footer belongs to the whole storyboard, not any GIF frame.
        # Center the four supplied diagrams; do not crop through their headings.
        boxes = [(210, 105, 618, 465), (885, 105, 1305, 465),
                 (210, 582, 618, 925), (885, 582, 1305, 925)]
        frames = [ImageOps.pad(im.crop(box), (440, 370), color='white') for box in boxes]
    elif name == 'leaky_motion.gif':
        w, h = im.size
        # Keep the two response rows. The slide supplies the title and takeaway.
        frames = [im.crop((x, y + round(h * .09), x + w // 2, y + round(h * .36)))
                  for y in (0, h // 2) for x in (0, w // 2)]
    else:
        assert im.size == (1536, 1024), (source, im.size)
        frames = [im.crop((x, y, x + 768, y + 512))
                  for y in (0, 512) for x in (0, 768)]
    # Remove redundant storyboard headings/captions so the mechanism occupies
    # the slide area. All four frames get the same crop; the deck supplies text.
    mechanism_crops = {
        'pooling_motion.gif': (12, 92, 744, 422),
        'hierarchy_motion.gif': (8, 78, 760, 405),
        'residual_motion.gif': (12, 80, 758, 375),
        'patches_motion.gif': (20, 70, 748, 416),
        'relu_motion.gif': (40, 90, 727, 410),
    }
    if name in mechanism_crops:
        frames = [f.crop(mechanism_crops[name]) for f in frames]
    if name == 'attention_motion.gif':
        frames = [ImageOps.pad(f.crop((22, 65 if i < 2 else 50, 755, 430)),
                               (733, 380), color='white')
                  for i, f in enumerate(frames)]
    durations = [2600, 2600, 2600, 4200]
    frames[0].save(V / name, save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, disposal=2, optimize=False)
    record(dict(file=name, kind='AI-generated teaching storyboard assembled as an animated GIF',
                sources=[str(G / source)], frames=4, width=frames[0].width, height=frames[0].height,
                durations_ms=durations))

old = R / '.build/slides/lecture3-history/20260904-200802/presentations/Lecture3_Visuals'
shutil.copy2(old / '21_global_cost.gif', V / 'dilation_motion.gif')
record(dict(file='dilation_motion.gif', kind='Original animated GIF: dilated convolution',
            sources=['https://github.com/vdumoulin/conv_arithmetic',
                     'https://raw.githubusercontent.com/vdumoulin/conv_arithmetic/master/gif/dilation.gif'],
            frames=9, width=395, height=381))
(V / 'sources.json').write_text(json.dumps(manifest, indent=2))

checks = []
for name in [*SHEETS, 'dilation_motion.gif']:
    im = Image.open(V / name)
    hashes = []
    durations = []
    for frame in ImageSequence.Iterator(im):
        frame.load()
        hashes.append(hashlib.sha256(frame.convert('RGB').tobytes()).hexdigest())
        durations.append(frame.info.get('duration', 0))
    assert im.n_frames > 1 and len(set(hashes)) == im.n_frames, name
    assert all(durations) and im.info.get('loop') == 0, name
    checks.append(dict(file=name, frames=im.n_frames, distinct_frames=len(set(hashes)),
                       loop_ms=sum(durations), loop_forever=True))
(B / 'animation-checks.json').write_text(json.dumps(checks, indent=2))
print(json.dumps(checks, indent=2))
