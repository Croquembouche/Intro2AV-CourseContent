# Lecture 6 authoring

The deck reuses the course starter's original cover background and logo, Arial typography, slide size, and blue/cyan palette. Text, equations, and comparison tables remain editable. Browser screenshots and GIFs show calculations from recorded KITTI frames.

1. Run `content.py` to generate the slide content.
2. Run `prepare_data.py` with a Python environment providing NumPy, SciPy, and OpenCV. Its `--source`, `--sequence`, `--start`, and `--count` options choose the NAS excerpt. Neither estimator reads reference pose files.
3. Capture the demo's visual and LiDAR modes in the browser. Private capture paths and measured crop bounds are in `prepare_assets.py`.
4. Run `prepare_assets.py`, then `build.mjs` with the bundled Node runtime.
5. Inspect every slide render and the finalizer receipt under `.build/slides/lecture6/`.
6. Run `verify_data.py`, then `package.py` to create the final PPTX and offline release.

The Pages workflow adds the mapping route and Lecture 6 downloads while retaining the existing demo collections.

The current Artifact Tool runtime stalls during legacy template import and PNG rendering. The builder therefore preserves the original background artwork and logo while authoring editable content into a fresh deck. Render the exported PPTX with system LibreOffice and Poppler for visual QA. Package and layout validation still use the presentation finalizer.
