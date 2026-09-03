# Slide-building tools

This directory contains rebuildable source rather than lecture deliverables.
Final decks are written to `2026/Presentations/`; the generated PowerPoint files
are ignored by Git and published through the stable Drive links in
[`2026/Presentations/README.md`](../../2026/Presentations/README.md). Generated
PNGs, layouts, montages, and inspection files are written to the ignored
`.build/` directory.

## Builders

- `ros2-basics/build.mjs` rebuilds
  `2026/Presentations/Lecture 1 ROS2 Basics.pptx`.
- `perception/build.mjs classical` rebuilds the classical perception deck.
- `perception/build.mjs` also retains the CNN/transformer authoring source for
  the next lecture. Its current student lab assets are not part of the
  classical-only release, so treat that target as source-in-progress rather
  than the current lab build.

Each builder resolves the repository root from its own location, so it does not
depend on William's absolute filesystem path. Templates and image assets live
beside the builder that uses them.

These scripts require the presentation runtime used by Codex. They are
instructor/development tools and are not part of the student lab download.
