# 2026 presentations

The current editable PowerPoint decks are versioned in this repository, along
with the available PDF exports. Build sources live under
[`tools/slides`](../../tools/slides/). Inspection sidecars and intermediate
renders remain local.

| Lecture | Repository slides | Demo source / guide |
| --- | --- | --- |
| 0 | [Introduction PDF](Lecture%200.pptx.pdf) | — |
| 1 | [ROS 2 basics](Lecture%201%20ROS2%20Basics.pptx) | Examples in the deck |
| 2 | [Classical computer vision](Lecture%202%20Perception%20-%20Classical%20Computer%20Vision.pptx) | [Classical CV](../Labs/ClassicalCV/) |
| 3 | [CNNs and transformers](Lecture%203%20Perception%20-%20CNNs%20and%20Transformers.pptx) | [Neural Vision](../Labs/NeuralVision/) |
| 4 | [Sensor fusion](Lecture%204%20Sensor%20Fusion%20for%20Autonomous%20Driving.pptx) | [Sensor Fusion](../Labs/SensorFusion/) |
| 5 | [Localization](Lecture%205%20Localization%20for%20Autonomous%20Driving.pptx) | [Localization](../Labs/Localization/) |
| 6 | [Mapping](Lecture%206%20Mapping%20for%20Autonomous%20Driving.pptx) | [Mapping](../Labs/Mapping/) |
| 7 | [Path planning](Lecture%207%20Path%20Planning%20for%20Autonomous%20Driving.pptx) · [PDF](Lecture%207%20Path%20Planning%20for%20Autonomous%20Driving.pdf) | [Path Planning](../Labs/PathPlanning/) |
| 8 | [Control](Lecture%208%20Control%20for%20Autonomous%20Driving.pptx) · [PDF](Lecture%208%20Control%20for%20Autonomous%20Driving.pdf) | [Control](../Labs/Control/) |

The [2025 archive](../../2025/Presentations/) is also versioned. Repository
coverage and GitHub Pages hosting are separate. The
[course demo portal](https://croquembouche.github.io/Intro2AV-CourseContent/)
publishes Neural Vision, Sensor Fusion, Localization, Mapping, Path Planning,
and Control. Current decks and offline packages are also copied to its
`downloads/` directory by the Pages workflow.

Existing Drive copies remain available: [Lecture 1](https://docs.google.com/presentation/d/1NZPRR-B_KK7N3v9CwAPOoqlaPS_Nk-RU/edit),
[Lecture 2](https://docs.google.com/presentation/d/13MhqtOYasUGUjquqirFk_fNdEbJ-LuUq/edit),
and [Lecture 3](https://docs.google.com/presentation/d/1BoHz5tmJkPQyGxsHjku3TO5nixmvIEUL/edit).
When updating a Drive copy, preserve its existing file ID. A repository push
does not update Drive.

## Lecture 5: Localization

The Lecture 5 deck and offline package are also published through GitHub Pages:

- [PowerPoint: Localization for Autonomous Driving](https://croquembouche.github.io/Intro2AV-CourseContent/downloads/Lecture%205%20Localization%20for%20Autonomous%20Driving.pptx)
- [Interactive demos: ICP → AMCL → NDT](https://croquembouche.github.io/Intro2AV-CourseContent/localization/)
- [Animated GIFs](https://croquembouche.github.io/Intro2AV-CourseContent/localization/gifs/)
- [Offline lecture package](https://croquembouche.github.io/Intro2AV-CourseContent/downloads/Lecture5_Localization.zip)
- [Teaching guide](Lecture%205%20-%20Teaching%20Guide.md)

The revised version contains 36 slides for approximately 75–85 minutes, with editable text, equations, four comparison tables, and seven embedded GIFs. Authoring source: [`tools/slides/lecture5`](../../tools/slides/lecture5/). The deck and ZIP are tracked as Pages download inputs.


## Lecture 7: Path planning

The lecture contains 45 slides with embedded speaker notes and sources, 12 editable comparison tables, and three algorithm animations. It covers graph search, A* and D* / D* Lite, sampling methods, robot configuration space and obstacle expansion, potential fields, vehicle motion constraints, global and local planning, and Chirikjian’s Robot Imagination work.

- Repository PowerPoint: `Lecture 7 Path Planning for Autonomous Driving.pptx`
- Repository PDF: `Lecture 7 Path Planning for Autonomous Driving.pdf`
- [Nine interactive experiments and exercise instructions](../Labs/PathPlanning/README.md)
- Offline release: `2026/Data/Lecture7_PathPlanning.zip` (extract it and open `Lecture7/Labs/PathPlanning/index.html`)
- [Authoring and validation source](../../tools/slides/lecture7/README.md)

The demo runs without installation or network access. This release is versioned in GitHub; its demo is published on GitHub Pages. A Drive upload is not part of repository publication.

## Lecture 8: Control

A concept-first 35-slide lecture for approximately 65–80 minutes, with embedded speaker notes, eight editable comparison tables, four control-loop diagrams, and computed simulation plots. There are no displayed equations or by-hand exercises. Instructor demonstrations and verbal observation prompts teach feedback/feedforward, PID and anti-windup, Pure Pursuit, Stanley, LQR, MPC, and the effects of limits and delay.

- Repository PowerPoint: `Lecture 8 Control for Autonomous Driving.pptx`
- Repository PDF: `Lecture 8 Control for Autonomous Driving.pdf`
- [Interactive control lab](../Labs/Control/index.html)
- [Concept guide](../Labs/Control/concept-guide.html)
- [Demo and technical documentation](../Labs/Control/README.md)
- Offline package: `2026/Data/Lecture8_Control.zip`. Extract it and open `Lecture8/START_HERE.html`.
- [Authoring source](../../tools/slides/lecture8/README.md)

Six offline views offer named cases, vehicle close-ups, plain-language explanations, predictions and input/error plots. Fine tuning, numeric comparisons, and exports are optional. The simulated controllers use simplified vehicle models. This release is versioned in GitHub; its demo is published on GitHub Pages. A Drive upload is not part of repository publication.
