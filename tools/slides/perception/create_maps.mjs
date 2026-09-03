import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolDir, "../../..");
const build = `${root}/.build/slides/perception`;

await fs.mkdir(`${build}/classical`, { recursive: true });
await fs.mkdir(`${build}/neural`, { recursive: true });

const classicalRoles = [
  "classical computer vision opening",
  "causal digits-to-roads learning path",
  "download and unpack student code",
  "install and verify ROS and OpenCV dependencies",
  "create a ROS 2 package and build the supplied package",
  "images as ten-by-ten numeric arrays",
  "projection-histogram descriptor",
  "nearest-template digit recognition",
  "projection-histogram ROS micro-experiment",
  "projection-histogram collision and variation failures",
  "projection-histogram failure micro-experiment",
  "failure types motivate morphology",
  "erosion and dilation",
  "opening and closing",
  "morphology changes recognition results",
  "morphology ROS micro-experiment",
  "boundary arrangement motivates edge maps",
  "kernel multiply-and-sum intuition",
  "horizontal and vertical edge kernels",
  "fixed-kernel ROS micro-experiment",
  "diagonal and curved handwriting limitation",
  "Sobel gradient intuition",
  "Canny edge intuition",
  "Hough straight-line voting intuition",
  "Sobel Canny Hough digit micro-experiment",
  "transfer the edge pipeline from digits to roads",
  "straight-lane pipeline",
  "straight-lane ROS micro-experiment",
  "curved-lane limitation",
  "curved-lane polynomial fit",
  "curved-lane ROS micro-experiment",
  "classical perception synthesis",
];

const neuralRoles = [
  "CNN and transformer opening",
  "dense-to-attention learning path",
  "reuse the ROS 2 experiment package",
  "fully connected image baseline",
  "dense layers and nonlinearities",
  "parameter-count pressure",
  "network-cost micro-experiment",
  "local connectivity prior",
  "shared-weight convolution",
  "feature-map shapes",
  "ReLU and leaky ReLU",
  "pooling and spatial reduction",
  "CNN operations micro-experiment",
  "repeated CNN motif",
  "CNN architecture design pressures",
  "efficiency mechanisms are different",
  "quantization micro-experiment",
  "why global context is expensive for CNNs",
  "scaled dot-product attention",
  "vision transformer patch pipeline",
  "CNN versus transformer inductive biases",
  "attention-token micro-experiment",
  "detection heads and NMS",
  "NMS micro-experiment",
  "choose the representation that matches the data",
];

const titleTargets = [
  { shapeId: "sh/kna1kzed", action: "rewrite-and-reposition" },
  { shapeId: "sh/loj2dkvy", action: "replace" },
];
const contentTargets = [
  { shapeId: "sh/sf2p07up", action: "rewrite" },
  { shapeId: "sh/jqt8nid8", action: "replace" },
  { shapeId: "sh/ipk7udcn", action: "rewrite" },
];

function makeMap(roles) {
  return {
    outputSlides: roles.map((role, index) => ({
      outputSlide: index + 1,
      sourceSlide: index === 0 ? 1 : 2,
      narrativeRole: role,
      reuseMode: "duplicate-slide",
      editTargets: index === 0 ? titleTargets : contentTargets,
    })),
    omittedSourceSlides: [
      { sourceSlide: 3, reason: "alternate branded layout not required" },
      { sourceSlide: 4, reason: "alternate branded layout not required" },
      { sourceSlide: 5, reason: "alternate branded layout not required" },
      { sourceSlide: 6, reason: "alternate branded layout not required" },
    ],
  };
}

await fs.writeFile(
  `${build}/classical/template-frame-map.json`,
  `${JSON.stringify(makeMap(classicalRoles), null, 2)}\n`,
);
await fs.writeFile(
  `${build}/neural/template-frame-map.json`,
  `${JSON.stringify(makeMap(neuralRoles), null, 2)}\n`,
);
await fs.writeFile(
  `${build}/template-audit.txt`,
  [
    "Visual source: 2026/Presentations/Lecture 8.pptx.",
    "The source contains six University of Delaware layouts; slides 1 and 2 provide the title and content frames used by the existing perception deck.",
    "Title frame: dark-blue left rail, authentic UD mark, image frame on the right.",
    "Content frame: inherited centered title, content placeholder, slide number, and CAR mark.",
    "Typography: Arial with cyan titles, orange section tags, navy body text, and 16 px minimum body copy.",
    "Insertion contract: duplicate source slide 1 once per deck and source slide 2 for every content slide; replace the inherited body placeholder instead of layering over it.",
  ].join("\n"),
);
await fs.writeFile(
  `${build}/deviation-log.txt`,
  [
    "Both decks preserve the established course template, master/layout hierarchy, CAR mark, title positions, and page-number treatment.",
    "The classical deck expands the original slides 1-16 into a 32-slide causal sequence with three setup slides and seven interleaved micro-experiments.",
    "The neural deck begins at the original slide-17 transition and adds a sourced transformer section plus a runnable attention experiment.",
  ].join("\n"),
);
