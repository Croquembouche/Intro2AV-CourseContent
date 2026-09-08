# CISC 647 — Introduction to Autonomous Driving

Course material is organized first by year and then by purpose. Start in the
year you are teaching; the same four category names are used every year.

```text
Intro2AV-CourseContent/
├── 2025/
│   ├── Presentations/     lecture decks and PDF exports
│   ├── Labs/              hands-on source, when present
│   ├── Data/              datasets and downloadable archives
│   └── Documents/         syllabus and course documents
├── 2026/
│   ├── Presentations/
│   ├── Labs/
│   │   ├── NeuralVision/   interactive MLP, CNN and transformer ROS 2 demos
│   │   └── ClassicalCV/
│   │       ├── student/   student starter and supplied results
│   │       └── answers/   instructor reference implementation
│   ├── Data/
│   └── Documents/
└── tools/
    └── slides/            source and assets used to rebuild slide decks
```

## Where new files belong

- Put PowerPoint files and their deliberate PDF exports in
  `<year>/Presentations/`.
- Put source exercises in `<year>/Labs/<topic>/`.
- Put student ZIPs, datasets, ROS bags, and other large inputs in
  `<year>/Data/`. Publish large release files to Google Drive and record their
  stable links in that directory's `README.md`.
- Put syllabi, onboarding documents, and other course administration files in
  `<year>/Documents/`.
- Put deck-generation source in `tools/slides/<deck>/`. Generated renders and
  inspection output belong in `.build/`; that directory is ignored.

Do not put generated ROS directories (`build/`, `install/`, or `log/`) in the
repository. The `ws/src/<package>` nesting inside a lab is intentional because
it is the standard ROS 2 workspace layout.

## 2026 quick links

- [Presentations and Drive downloads](2026/Presentations/README.md)
- [Classical computer vision lab](2026/Labs/ClassicalCV/)
- [Interactive neural vision demos](https://croquembouche.github.io/Intro2AV-CourseContent/) · [ROS 2 source and setup](2026/Labs/NeuralVision/README.md)
- [Downloadable data and ZIPs](2026/Data/README.md)
- [Course documents](2026/Documents/)
- [Slide-building tools](tools/slides/)

## Large-file policy

GitHub contains the material that should be reviewed, edited, and versioned:
source code, slide builders, lab instructions, small input data, PDF references,
and course documents. Generated PowerPoint files, downloadable lab ZIPs, and
ROS bag payloads are intentionally ignored by Git and published through Google
Drive instead. The repository keeps a link manifest in the corresponding
`Presentations` or `Data` directory, so every download still has one obvious
home without storing duplicate large binaries in Git history.

The ignored files may remain in a local checkout. Rebuilding a deck or unpacking
a dataset therefore does not make it appear as an untracked Git change.

The matching Google Drive course folder is
[Introduction to Autonomous Driving](https://drive.google.com/drive/folders/1GyVhgbK6Rju7t-wnl7EFoXqS-NeiBuim).
Drive is also organized by year, with `Presentations` and `Data` inside each
year. When replacing a shared file, keep its existing Drive file ID so links in
the lecture deck continue to work.
