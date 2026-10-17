"""Package reviewed ImageGen process frames as GIFs without drawing artwork.

Only crop, pad and sequence the supplied artwork. The source images retain
the complete authored diagrams; explicit crops avoid storyboard separators.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageSequence
import hashlib
import json

R = Path(__file__).resolve().parents[3]
B = R / '.build/slides/lecture3-current'
V = B / 'assets'
Q = B / 'process-review'
G = Path('/home/william/.codex/generated_images/01a06e34-cbd2-7722-83b8-26580858a25f')


def boxes(xs, rows):
    return [(x0, y0, x1, y1) for y0, y1 in rows for x0, x1 in xs]


SPECS = {
    'training.gif': dict(source='exec-c837fbd0-3cf2-4ba8-92d0-8cf092dedaf4.png',
        boxes=boxes([(10, 760), (777, 1526)], [(8, 246), (251, 485), (488, 704)]),
        size=(768, 258), durations=[1300, 1600, 900, 1200, 1000, 3000],
        operation='Prediction scores change after error returns and weight dials turn.'),
    'dense_growth.gif': dict(source='exec-31ce29b3-bfe9-4c0f-b324-0bac18edd36e.png',
        boxes=boxes([(3, 764), (772, 1532)], [(3, 501), (510, 1020)]),
        size=(768, 520), durations=[1800, 1400, 1500, 2800],
        operation='Four new pixels create four input nodes, then twelve new weights.'),
    'local_response.gif': dict(source='exec-9138d842-b064-4f82-ba35-9323253c7fdb.png',
        boxes=boxes([(12, 757), (785, 1526)], [(12, 228), (260, 477), (509, 729), (762, 982)]),
        size=(768, 246), durations=[1200, 700, 700, 700, 700, 1000, 1800, 2800],
        operation='Corresponding pixel/filter products accumulate, then sum to response 3.'),
    'filter_bank.gif': dict(source='exec-ecb41374-fa91-4936-b79f-7c9e2806ac92.png',
        boxes=boxes([(35, 744), (795, 1515)], [(66, 481), (550, 949)]),
        select=[0, 1, 3], size=(768, 450), durations=[1600, 2200, 3200],
        operation='The scan moves and two different numeric response maps fill.'),
    'cnn_flow.gif': dict(source='exec-4bfc5921-ef38-4425-aa70-5321e245aa0f.png',
        boxes=boxes([(10, 758), (776, 1528)], [(140, 426), (550, 846)]),
        size=(768, 315), durations=[1700, 1700, 1700, 3000],
        operation='Feature maps fill, pooling reduces maps, combined features and scores appear.'),
    'relu_responses.gif': dict(source='exec-ebe1a99e-4f9c-4e97-a285-a5079dac20a5.png',
        boxes=boxes([(12, 751), (785, 1525)], [(16, 220), (250, 451), (489, 689), (728, 937)]),
        select=list(range(7)), size=(768, 235), durations=[1500]*6+[3000],
        operation='Individual values cross ReLU, negatives become zero, and the output grid fills.'),
    'leaky_sensitivity.gif': dict(source='exec-2af7769e-6862-4eaf-8525-30871b7fc6e6.png',
        boxes=boxes([(12, 747), (780, 1520)], [(9, 241), (268, 499), (523, 755), (780, 1006)]),
        select=[0,1,2,3,4,5,4,3,2,1], size=(768, 253), durations=[1100]*10,
        operation='The input marker moves through negative and positive values while both outputs update.'),
    'residual_motion.gif': dict(source='exec-1dc8b620-410d-4713-9e27-83587a3e26ff.png',
        boxes=boxes([(21, 748), (786, 1515)], [(22, 235), (273, 480), (516, 729), (761, 972)]),
        size=(768, 242), durations=[1100,800,900,1100,900,1400,900,3000],
        operation='Input and correction packets traverse separate paths and add [2,1]+[0,1]=[2,2].'),
    'pyramid_flow.gif': dict(source='exec-518ce8f8-a539-4b3a-a61b-a66ea305714f.png',
        boxes=boxes([(27, 742), (789, 1519)], [(40, 525), (565, 966)]),
        size=(768, 515), durations=[1900,1600,1800,3000],
        operation='One coarse cell expands into four fine cells, and context adds to finer evidence.'),
    'patches_motion.gif': dict(source='exec-364af27d-d987-41c3-8353-702bcfbdef07.png',
        boxes=boxes([(27, 741), (790, 1515)], [(68, 432), (567, 967)]),
        size=(768, 433), durations=[1800,1800,2200,3200],
        operation='The digit separates into four patches, then embedding produces feature vectors.'),
    'attention_motion.gif': dict(source='exec-2c5357ee-2c17-4eb7-998d-d1656e152ca5.png',
        boxes=boxes([(12, 764), (789, 1528)], [(40, 428), (514, 895)]),
        size=(768, 407), durations=[2000,2300,1600,3200],
        operation='Value components are weighted to 2.4,0.6,0 and their sum becomes 3.0.'),
    'windows_motion.gif': dict(source='exec-dbeddbe7-0d3b-4f24-9816-d3a4a119a326.png',
        boxes=boxes([(120, 719), (841, 1448)], [(18, 260), (291, 526), (550, 756), (789, 998)]),
        select=[0,1,3,4,5,6], size=(720, 292), durations=[1600,900,1300,900,900,2800],
        operation='Fixed patches share a shifted window, exchange feature packets, and update their vectors.'),
}


def main():
    Q.mkdir(exist_ok=True)
    manifest = json.loads((V / 'sources.json').read_text())
    checks = []
    for name, spec in SPECS.items():
        original = Image.open(G / spec['source']).convert('RGB')
        frames = [ImageOps.pad(original.crop(box), spec['size'], color='white')
                  for box in spec['boxes']]
        if 'select' in spec:
            frames = [frames[i] for i in spec['select']]
        assert len(frames) == len(spec['durations']), name
        frames[0].save(V / name, save_all=True, append_images=frames[1:],
                       duration=spec['durations'], loop=0, disposal=2, optimize=False)
        manifest[:] = [a for a in manifest if a['file'] != name]
        manifest.append(dict(file=name, kind='AI-generated process illustration sequenced as a GIF',
            sources=[str(G / spec['source'])], frames=len(frames),
            width=spec['size'][0], height=spec['size'][1],
            durations_ms=spec['durations'], operation=spec['operation']))
        folder = Q / name.removesuffix('.gif')
        folder.mkdir(exist_ok=True)
        for i, frame in enumerate(frames):
            frame.save(folder / f'frame-{i+1:02}.png')
        # The contact sheet is private review material, not a teaching visual.
        small = [ImageOps.pad(f, (480, 260), color='white') for f in frames]
        sheet = Image.new('RGB', (960, 260*((len(small)+1)//2)), 'white')
        for i, frame in enumerate(small):
            sheet.paste(frame, ((i%2)*480, (i//2)*260))
        sheet.save(Q / (name + '.png'))
        gif = Image.open(V / name)
        decoded = [f.convert('RGB') for f in ImageSequence.Iterator(gif)]
        distinct = len({hashlib.sha256(f.tobytes()).hexdigest() for f in decoded})
        assert len(decoded) == len(frames) and distinct > 1, name
        assert gif.info.get('loop') == 0, name
        checks.append(dict(file=name, frames=len(decoded), distinct_frames=distinct,
                           loop_ms=sum(spec['durations']), operation=spec['operation']))
    (V / 'sources.json').write_text(json.dumps(manifest, indent=2))
    (B / 'process-animation-checks.json').write_text(json.dumps(checks, indent=2))
    print('Packaged', len(checks), 'process animations.')


if __name__ == '__main__':
    main()
