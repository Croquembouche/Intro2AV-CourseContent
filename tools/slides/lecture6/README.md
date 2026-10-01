# Lecture 6 authoring

The deck reuses the course starter's original cover background and logo, Arial typography, slide size, and blue/cyan palette. Text, equations, and comparison tables remain editable. Browser screenshots and GIFs show calculations from recorded KITTI frames.

1. Run `content.py` to generate the slide content.
2. Run `prepare_data.py` with a Python environment providing NumPy, SciPy, and OpenCV. Its `--source`, `--sequence`, `--start`, and `--count` options choose the NAS excerpt. Neither estimator reads reference pose files.
3. Capture the demo's visual and LiDAR modes in the browser. Private capture paths and measured crop bounds are in `prepare_assets.py`.
4. Run `prepare_assets.py`, then `build.mjs` with the bundled Node runtime.
5. Inspect every slide render and the finalizer receipt under `.build/slides/lecture6/`.
6. Run `verify_data.py`, then `package.py` to create the final PPTX and offline release.

The Pages workflow adds the mapping route and Lecture 6 downloads while retaining the existing demo collections.

The perspective 3D map and LiDAR scan viewer are in `2026/Labs/Mapping/scene3d.js`. Run `node tools/slides/lecture6/test_controls.cjs` to check orbit, pan, zoom, keyboard controls, multi-touch transitions, and camera limits. Verify the rendered desktop and mobile views in the browser before publication.

The current Artifact Tool runtime stalls during legacy template import and PNG rendering. The builder therefore preserves the original background artwork and logo while authoring editable content into a fresh deck. Render the exported PPTX with system LibreOffice and Poppler for visual QA. Package and layout validation still use the presentation finalizer.

The deck now has 49 slides, including controlled comparisons in slides 35–45. The `challenges.js` module models GPS, uneven terrain, false matches, tracking loss, GPS bias/outages, a verified loop edge and map rebuilding. Run `node tools/slides/lecture6/test_challenges.cjs` for numerical behavior checks. The controlled model is separate from the recorded KITTI traces.

For the new slide assets, capture full-page screenshots of the right-hand scene in the controlled mode. Crop the measured scene viewport (at the tested desktop size: x=714, y=833, width=506, height=366) into `assets/challenge-*.png`. Capture GPS off/on in top view at default settings; planar/3D in side view at hill=12%, bump=0.50 m, drift=0, GPS off; false match with gate off/on using the same noise-free terrain settings; loop off/on in perspective view at default settings. Filenames are declared in `content.py`. Re-measure the DOM bounds if page dimensions or text change. Comparisons are actual browser captures, not illustrations or real driving records.
