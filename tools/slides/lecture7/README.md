# Lecture 7 authoring

The lecture uses the current Intro2AV blue/cyan palette, Arial typography, 960 × 540 slide size, original cover artwork, and CAR logo. Editable slide copy, equations, tables, and notes come from `content.py`. Illustrations are captures of the companion demo's computed behavior.

From the repository root:

1. `python tools/slides/lecture7/content.py`
2. `node tools/slides/lecture7/check-demo.cjs` checks numerical behavior and the offline browser UI, and captures computed scenes.
   Run `node tools/slides/lecture7/check-advanced.cjs` for the additional any-angle, roadmap, improving-tree and MPPI experiments. It checks route collision clearance, parent costs, informed sample bounds, roadmap reuse, and MPPI motion/weights, then exercises the offline UI.
3. `node tools/slides/lecture7/capture-animations.cjs` captures algorithm progress and local-planning comparisons.
4. `python tools/slides/lecture7/prepare_assets.py`
5. Run `build.mjs` with the bundled Codex Node runtime. It exports and finalizes a draft with editable tables and course font/geometry checks.
6. Render `.build/slides/lecture7/candidate.pptx` using system LibreOffice into `.build/slides/lecture7/pdf/candidate.pdf`, then render the PDF using Poppler and inspect every slide.
7. `python tools/slides/lecture7/package.py` verifies 45 slides/notes, 12 native tables, three animations, and relative experiment links, then writes the PPTX, static PDF, and offline ZIP to the course directories.

Build outputs and validation records remain in `.build/slides/lecture7/`. The browser tests use the bundled Playwright package and `/usr/bin/google-chrome`. Sources and model limits appear in the demo README and slide notes.

The current Artifact Tool PPTX importer timed out during the 35-second readback attempt. The deck uses native artifact-tool authoring with the original course artwork, and LibreOffice/Poppler for full visual inspection. Import-readback validation remains unverified.

The lecture and demo are local deliverables. This task does not publish to Pages or upload to Drive. The deck's relative links resolve within the extracted offline package.

The revised demo layout was designed in `layout-design.json` before implementation. The page keeps experiment navigation, simulation playback, live results, grouped settings and interpretation in separate areas. Responsive checks cover widths 320, 390, 768, 1024 and 1440 pixels; the phone layout places the simulation before settings, and focus view restores settings when the viewport narrows. Design and final screenshots stay in `.build/slides/lecture7/layout-design/`.
