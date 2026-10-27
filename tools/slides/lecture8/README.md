# Lecture 8 authoring

The concept-first 35-slide lecture follows the current Intro2AV 960 × 540 format, Arial typography, original blue cover artwork, cyan headings, and CAR logo. Content, concept diagrams, tables, sources and speaker notes are in `content.py`. The lab is in `2026/Labs/Control/` and runs directly from a local file without dependencies.

Build from the repository root:

1. `python tools/slides/lecture8/prepare_assets.py`, then `python tools/slides/lecture8/content.py`
2. `node tools/slides/lecture8/review-check.cjs` validates every guided preset, controller behavior, read-only decision previews and UI event handlers with lightweight DOM doubles. It renders computed plots using the same pure rendering component as the lab. No browser access is used. The earlier `check.cjs` and `check-package.cjs` target the original release and are superseded for this revision.
3. Run `node tools/slides/lecture8/check-control-display.cjs`, `node tools/slides/lecture8/check-control-regressions.cjs` and `python tools/slides/lecture8/check-control-reference.py` (NumPy/SciPy required) for geometry, lag/delay prediction, constrained optimizer, and independent LQR checks.
4. Run `build.mjs` with the bundled Codex Node runtime. It authors editable text/diagrams and eight native tables using artifact-tool, then runs the PPTX finalizer.
5. Render the candidate with system LibreOffice, then Poppler into `.build/slides/lecture8/render/`. Inspect all slides before packaging.
6. `python tools/slides/lecture8/package.py` packages the verified deck, PDF and offline lab.

Private renders, screenshots, numerical results and validation receipts live in `.build/slides/lecture8/`. The builder uses original artwork prepared from the preceding lecture. No network or package installation is needed for the student lab. Publication is separate from local generation.

The first-party Artifact Tool import-readback exceeded its 90-second timeout. The finalizer records that readback as unperformed on the delivered build; package integrity, geometry, font checks and independent LibreOffice/Poppler rendering are used. PowerPoint application playback is not claimed.

The revised browser UI could not be exercised live because the computer-use tool rejected the local preview URL. Numerical tests, DOM-double component tests, static HTML/link checks and computed-plot inspection do not replace real browser layout or interaction checks. This remains an explicit verification limitation.

This revision has no displayed equations or calculation exercises. Instructor demonstrations and verbal observations replace the earlier student worksheet. The companion concept guide is `concept-guide.html`.
