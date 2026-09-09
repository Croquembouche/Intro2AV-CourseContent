# Lecture 4 authoring

The demo source is in `2026/Labs/SensorFusion/`. The slide content is authored in `content.py`, which produces `content.json`. `build.mjs` imports the existing course starter deck, builds 30 slides with editable text and tables, renders them, and finalizes the PPTX using the Presentations runtime.

From the repository root:

1. `python tools/slides/lecture4/content.py`
2. Run `tools/slides/lecture4/test-demo.cjs` with the bundled Node runtime. This tests the demos and captures the slide visuals into `.build/slides/lecture4/assets/`.
3. Run `tools/slides/lecture4/test-3d.cjs` to test the 3D controls and capture the updated slide visuals.
4. Run `tools/slides/lecture4/build.mjs` with the bundled Node runtime.
5. Inspect the rendered slides in `.build/slides/lecture4/render/`. The validated PPTX path is written to `.build/slides/lecture4/final-path.txt`.

The browser tests use the installed `/usr/bin/google-chrome` in a separate headless session. They do not open or modify the user's existing browser profile. The runtime paths match this course author's machine.

The inherited theme comes from `tools/slides/perception/templates/neural-template-starter.pptx`. Typography follows the current Lecture 3 PPTX, which uses Arial. All diagram-like images are captured results of the runnable teaching simulations. Equations and comparison tables remain editable slide objects.

Run `python tools/slides/lecture4/package.py` after validation and visual inspection to replace the deliverable and rebuild the portable ZIP. The ZIP includes the local Three.js renderer and its MIT license.
