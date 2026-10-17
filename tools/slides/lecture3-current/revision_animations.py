"""Crop reviewed storyboard artwork and package the requested slide animations."""
from pathlib import Path
from PIL import Image, ImageSequence
import json, hashlib

R = Path(__file__).resolve().parents[3]
B = R / '.build/slides/lecture3-current'
V = B / 'assets'
G = Path('/home/william/.codex/generated_images/01a06e34-cbd2-7722-83b8-26580858a25f')
SHEETS = {
    'dense_growth.gif': ('exec-6840a0a5-869f-412f-976f-94815dee46db.png', (30, 22, 744, 427)),
    'filter_bank.gif': ('exec-ee97c311-84b3-4082-bf4f-1b16328dee54.png', (25, 60, 742, 454)),
    'cnn_flow.gif': ('exec-6cece131-271e-4b6e-8da5-2fe8167327ea.png', (16, 86, 752, 399)),
    'relu_responses.gif': ('exec-4df6f79d-8c3c-41b6-bc2d-f003313512d5.png', (16, 90, 752, 377)),
    'leaky_sensitivity.gif': ('exec-722031b8-0433-43f6-a7c4-f45a593e7db5.png', (20, 8, 752, 452)),
    'local_response.gif': ('exec-77216b92-e6af-4e52-8792-5764e45ea287.png', (15, 85, 768, 410)),
    'pyramid_flow.gif': ('exec-34714e9e-1eb1-4527-8e92-d407092b3ef5.png', (20, 86, 768, 479)),
}

manifest = json.loads((V / 'sources.json').read_text())
def record(entry):
    manifest[:] = [x for x in manifest if x['file'] != entry['file']]
    manifest.append(entry)

for name, (source, crop) in SHEETS.items():
    sheet = Image.open(G / source).convert('RGB')
    assert sheet.size == (1536, 1024), (source, sheet.size)
    frames = [sheet.crop((x, y, x + 768, y + 512)).crop(crop)
              for y in (0, 512) for x in (0, 768)]
    durations = [2800, 2800, 2800, 4600]
    frames[0].save(V / name, save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, disposal=2, optimize=False)
    record(dict(file=name, kind='AI-generated teaching storyboard assembled as an animated GIF',
                sources=[str(G / source)], frames=4, width=frames[0].width,
                height=frames[0].height, durations_ms=durations))
    # A private contact sheet supports checking every stage, including its edges.
    review = Image.new('RGB', (frames[0].width * 2, frames[0].height * 2), 'white')
    for i, frame in enumerate(frames):
        review.paste(frame, ((i % 2) * frame.width, (i // 2) * frame.height))
    review.save(B / (name + '.revision-review.png'))

original = next(a for a in manifest if a['file'] == 'digit_shift.gif')
im = Image.open(V / 'digit_shift.gif')
for name, index in [('digit_left.png', 0), ('digit_right.png', 4)]:
    im.seek(index)
    im.convert('RGB').save(V / name)
    record(dict(file=name, kind='Static frame from the digit-position illustration',
                sources=original['sources'], frame_index=index))
(V / 'sources.json').write_text(json.dumps(manifest, indent=2))

checks = []
for name in SHEETS:
    im = Image.open(V / name)
    frames = [f.convert('RGB') for f in ImageSequence.Iterator(im)]
    distinct = len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})
    assert distinct == 4 and im.info.get('loop') == 0, name
    checks.append(dict(file=name, frames=len(frames), distinct_frames=distinct))
(B / 'revision-animation-checks.json').write_text(json.dumps(checks, indent=2))
print('Prepared', len(SHEETS), 'GIFs and two static digit-position images.')
