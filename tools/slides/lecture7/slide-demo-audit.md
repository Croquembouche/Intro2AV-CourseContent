# Lecture 7 slide / demo alignment audit

Reviewed October 27, 2026 against the corrected PathPlanning engine, renderer and browser controls. The deck has 47 slides; slides 1–42 retain their numbers. All slide text and speaker notes were read against the implemented models. All slides were rendered; changed visual slides were inspected at readable size, with a whole-deck scan for unintended layout changes.

| Slides | Alignment correction |
| --- | --- |
| 2, 16–18 | Distinguish original D* from the implemented D* Lite. Show `rhs(goal) = 0` separately from the non-goal consistency relation. Separate initial expansions from the latest repair. |
| 7–14 | Link directly to Dijkstra, A*, terrain and Weighted A* settings. Identify the Weighted A* screenshot and weight 2. Preserve BFS edge count versus terrain cost and the conditional optimality explanation. |
| 21 | Show the actual persistent PRM roadmap beside the basic RRT animation, with separate links. Basic RRT stops at its first route. |
| 22 | Replace the basic RRT image with real RRT* and Informed RRT* captures. Explain current rewiring highlights and the improvement ellipse. Remove obsolete notes claiming rewiring is absent and segment checks are sampled. |
| 23–25 | Explain that the pictured green rectangle is the last clear pose before the next motion is rejected. Identify conservative orange clearance cells and correct “reducing resolution” to “using finer grid cells.” |
| 29–31 | Identify blue executed traces and blue-gray force strokes. Link the U-trap slide directly to the trap scene. |
| 34–37 | Refresh local captures with the corrected planning origins and obstacle timestamps. Distinguish predictions, executed motion, the current obstacle and its planning-time outline. Keep discrete-check and omitted braking-model limitations explicit. |
| 43 | Add Theta* beside its actual dashed gray eight-neighbor A* reference. Explain the shared circular geometry, Euclidean heuristic used by this implementation, and Basic Theta*'s optimality limit. |
| 44 | Add the actual MPPI-style sequence optimizer. Explain weighted controls, proposal rechecking, fallback/no-valid-sequence behavior, and differences from formal MPPI. |
| 45–47 | Include Dijkstra in the exercise and correct the resource link from seven to nine experiment families. |

All 18 illustrated slides have visible keys specific to their images. Cyan is search expansion in graph views, tree/roadmap structure in sampling views, and an accepted prediction in local views. Blue is a graph/global route in those views but an executed trace in the potential-field view. The captions intentionally do not imply one universal meaning per color. Transparent cyan over yellow terrain blends the two colors. Magenta latest-rewire highlights are captured from an actual current attempt, and the Informed RRT* ellipse is shown only after a route exists.

The refreshed GIF palette reserves the real demo marker colors; previous adaptive quantization could discard small orange sample and green start markers among many near-white pixels. GIFs retain their computed frames. The PDF displays their first, representative frame; the PPTX retains animation.

Validation:

- `check-demo.cjs`: original numerical and offline browser suite passed; fresh base screenshots.
- `capture-animations.cjs`: fresh computed animations and advanced/local images, with capture settings recorded privately in `.build/slides/lecture7/capture-manifest.json`.
- `audit-display.cjs`: corrected visualization behavior, all nine mobile families and zero browser errors passed.
- `verify-slide-alignment.cjs`: all 18 distinct slide-linked targets open the expected mode and relevant algorithm/scene/orientation preset.
- `verify-slide-package.py`: all 47 slides and notes match authored content, PDF text is present, embedded media exactly matches the captured assets, all 18 visual keys exist, and GIF marker colors survive encoding.
- Artifact Tool structural, geometry and font checks passed; 12 editable tables and three animations retained. Rendering was checked with LibreOffice/Poppler, not native PowerPoint. Artifact Tool import readback remains unverified.
- The release ZIP is checked for archive integrity and byte-for-byte equality with the current deck, PDF and demo files.

The theoretical qualifications are supported by the [Theta* paper](https://arxiv.org/abs/1401.3843), [Informed RRT* paper](https://arxiv.org/abs/1404.2334), and [MPPI paper](https://arxiv.org/abs/1509.01149); references are also in the relevant slide notes. The earlier [algorithm audit](algorithm-audit.md) records numerical tests and remaining model limits.
