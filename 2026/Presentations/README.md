# 2026 presentations

The current editable PowerPoint deliverables are hosted on Google Drive. They
are generated from the source under [`tools/slides`](../../tools/slides/) and
are intentionally ignored by Git so large binary revisions do not accumulate
in the repository history.

| Lecture | Google Drive | Local generated filename |
| --- | --- | --- |
| ROS 2 basics | [Download or open the PowerPoint](https://docs.google.com/presentation/d/1NZPRR-B_KK7N3v9CwAPOoqlaPS_Nk-RU/edit?usp=drivesdk&ouid=117128555251322073493&rtpof=true&sd=true) | `Lecture 1 ROS2 Basics.pptx` |
| Perception: classical computer vision | [Download or open the PowerPoint](https://docs.google.com/presentation/d/13MhqtOYasUGUjquqirFk_fNdEbJ-LuUq/edit?usp=drivesdk&ouid=117128555251322073493&rtpof=true&sd=true) | `Lecture 2 Perception - Classical Computer Vision.pptx` |
| Perception: CNNs and transformers | [Download or open the PowerPoint](https://docs.google.com/presentation/d/1BoHz5tmJkPQyGxsHjku3TO5nixmvIEUL/edit?usp=drivesdk&ouid=117128555251322073493&rtpof=true&sd=true) | `Lecture 3 Perception - CNNs and Transformers.pptx` |

Small PDF references and the small `Lecture 8.pptx` reference deck remain in
Git. When updating a published deck, replace the existing Drive file rather
than uploading a second copy; this preserves the link used here and in the
lecture material.

## Lecture 5: Localization

The Lecture 5 deck and offline package are also published through GitHub Pages:

- [PowerPoint: Localization for Autonomous Driving](https://croquembouche.github.io/Intro2AV-CourseContent/downloads/Lecture%205%20Localization%20for%20Autonomous%20Driving.pptx)
- [Interactive demos: ICP → AMCL → NDT](https://croquembouche.github.io/Intro2AV-CourseContent/localization/)
- [Animated GIFs](https://croquembouche.github.io/Intro2AV-CourseContent/localization/gifs/)
- [Offline lecture package](https://croquembouche.github.io/Intro2AV-CourseContent/downloads/Lecture5_Localization.zip)
- [Teaching guide](Lecture%205%20-%20Teaching%20Guide.md)

The revised version contains 36 slides for approximately 75–85 minutes, with editable text, equations, four comparison tables, and seven embedded GIFs. Authoring source: [`tools/slides/lecture5`](../../tools/slides/lecture5/). The deck and ZIP are tracked as Pages download inputs.


## Lecture 7: Path planning

The new local lecture contains 45 slides with embedded speaker notes and sources, 12 editable comparison tables, and three algorithm animations. It covers graph search, A* and D* / D* Lite, sampling methods, robot configuration space and obstacle expansion, potential fields, vehicle motion constraints, global and local planning, and Chirikjian’s Robot Imagination work.

- Local generated PowerPoint: `Lecture 7 Path Planning for Autonomous Driving.pptx`
- Local generated static PDF: `Lecture 7 Path Planning for Autonomous Driving.pdf`
- [Nine interactive experiments and exercise instructions](../Labs/PathPlanning/README.md)
- Offline release: `2026/Data/Lecture7_PathPlanning.zip` (extract it and open `Lecture7/Labs/PathPlanning/index.html`)
- [Authoring and validation source](../../tools/slides/lecture7/README.md)

The demo runs without installation or network access. This release is local and has not been published to GitHub Pages or Google Drive.

## Lecture 8: Control

A concept-first 35-slide lecture for approximately 65–80 minutes, with embedded speaker notes, eight editable comparison tables, four control-loop diagrams, and computed simulation plots. There are no displayed equations or by-hand exercises. Instructor demonstrations and verbal observation prompts teach feedback/feedforward, PID and anti-windup, Pure Pursuit, Stanley, LQR, MPC, and the effects of limits and delay.

- Local PowerPoint: `Lecture 8 Control for Autonomous Driving.pptx`
- Local PDF: `Lecture 8 Control for Autonomous Driving.pdf`
- [Interactive control lab](../Labs/Control/index.html)
- [Concept guide](../Labs/Control/concept-guide.html)
- [Demo and technical documentation](../Labs/Control/README.md)
- Offline package: `2026/Data/Lecture8_Control.zip`. Extract it and open `Lecture8/START_HERE.html`.
- [Authoring source](../../tools/slides/lecture8/README.md)

Six offline views offer named cases, vehicle close-ups, plain-language explanations, predictions and input/error plots. Fine tuning, numeric comparisons, and exports are optional. The simulated controllers use simplified vehicle models. This local release has not been published to Pages or Drive.
