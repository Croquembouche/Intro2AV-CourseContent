# Lecture 5 authoring

The course deck inherits the existing starter PPTX theme and uses Arial, matching Lecture 4. Text, equations, and the comparison table are editable. Simulation screenshots and GIFs are captured from the runnable Localization demos, not pre-scripted pose interpolation.

From the repository root:

1. `python3 tools/slides/lecture5/content.py`
2. Run `tools/slides/lecture5/check-demo.cjs` using Node with the bundled Playwright runtime and `/usr/bin/google-chrome`. This validates the numerical algorithms and UI, then captures frames.
3. `python3 tools/slides/lecture5/prepare-gifs.py`
4. Run `tools/slides/lecture5/build.mjs` using the bundled Node runtime. This imports the starter deck, exports and renders 32 slides, and finalizes the PPTX.
5. Inspect all renders in `.build/slides/lecture5/render/`.
6. `python3 tools/slides/lecture5/package.py`

The finalizer receipt and intermediate renders remain under `.build/slides/lecture5/`. The teaching guide is generated alongside the presentation. The Pages workflow adds `/localization/` and the deck/ZIP downloads while retaining existing routes.
