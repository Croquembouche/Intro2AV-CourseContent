import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOL_DIR, "../../..");
const BUILD = `${ROOT}/.build/slides/perception`;
const CLASSICAL_STARTER = `${TOOL_DIR}/templates/classical-template-starter.pptx`;
const NEURAL_STARTER = `${TOOL_DIR}/templates/neural-template-starter.pptx`;
const STARTER = CLASSICAL_STARTER;
const FINAL = process.env.FINAL_PPTX ?? `${ROOT}/2026/Presentations/Lecture 2 Perception - Classical Computer Vision.pptx`;
const RENDER_DIR = `${BUILD}/final-render`;
const LAYOUT_DIR = `${BUILD}/final-layout/final`;
const IMG = `${TOOL_DIR}/images`;
const LAB_ROOT = `${ROOT}/2026/Labs/ClassicalCV`;
const LAB = `${LAB_ROOT}/student`;
const ANSWERS = `${LAB_ROOT}/answers`;
const LAB_OUT = `${LAB}/outputs`;
const LAB_NOTEBOOK = `${LAB}/lab.ipynb`;
const ROS_GUIDE = `${LAB}/ROS2_HANDS_ON.md`;
const DATA_README = `${LAB}/DATA_README.md`;
const ROS_PACKAGE = `${LAB}/ws/src/cv_lab`;
const HANDS_ON_DRIVE = "https://drive.google.com/file/d/15JSaotsxEXHAcFdtfUTNPBkq8JsG8RKH/view?usp=drivesdk";
const ROS_PACKAGE_DOC = "https://docs.ros.org/en/humble/Tutorials/Beginner-Client-Libraries/Creating-Your-First-ROS2-Package.html";
const ROS_PUBSUB_DOC = "https://docs.ros.org/en/humble/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.html";
const ROS_PARAM_DOC = "https://docs.ros.org/en/humble/Tutorials/Beginner-Client-Libraries/Using-Parameters-In-A-Class-Python.html";
const ROS_SERVICE_DOC = "https://docs.ros.org/en/humble/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Service-And-Client.html";
const ROS_INSTALL_DOC = "https://docs.ros.org/en/humble/Installation/Ubuntu-Install-Debs.html";
const ROSDEP_DOC = "https://docs.ros.org/en/humble/Tutorials/Intermediate/Rosdep.html";

const BLUE = "#00539F";
const CYAN = "#00A0DF";
const ORANGE = "#EF8200";
const NAVY = "#17324D";
const SLATE = "#4B6072";
const PALE = "#EAF4FA";
const LIGHT = "#F6F9FB";
const BORDER = "#C8D7E1";
const RED = "#AF1E2D";
const GREEN = "#5A8E22";

const TEMPLATE = `${ROOT}/2026/Presentations/Lecture 8.pptx`;
const LECTURE2 = `${ROOT}/2026/Presentations/Lecture 2.pptx.pdf`;
const LECTURE5 = `${ROOT}/2026/Presentations/Lecture 5.pptx.pdf`;
const OPENCV_SOBEL = "https://docs.opencv.org/4.x/d2/d2c/tutorial_sobel_derivatives.html";
const OPENCV_CANNY = "https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html";
const OPENCV_MORPHOLOGY = "https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphological_ops.html";
const OPENCV_HOUGH = "https://docs.opencv.org/4.x/d9/db0/tutorial_hough_lines.html";
const HOG = "https://lear.inrialpes.fr/people/triggs/pubs/Dalal-cvpr05.pdf";
const LENET = "http://yann.lecun.com/exdb/publis/pdf/lecun-98.pdf";
const RELU = "https://proceedings.mlr.press/v15/glorot11a.html";
const ALEXNET = "https://proceedings.neurips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html";
const VGG = "https://arxiv.org/abs/1409.1556";
const INCEPTION = "https://arxiv.org/abs/1409.4842";
const RESNET = "https://openaccess.thecvf.com/content_cvpr_2016/html/He_Deep_Residual_Learning_CVPR_2016_paper.html";
const MOBILENET = "https://arxiv.org/abs/1704.04861";
const BATCHNORM = "https://arxiv.org/abs/1502.03167";
const PRUNING = "https://proceedings.neurips.cc/paper/2015/hash/ae0eb3eed39d2bcef4622b2499a05fe6-Abstract.html";
const YOLO = "https://openaccess.thecvf.com/content_cvpr_2016/html/Redmon_You_Only_Look_CVPR_2016_paper.html";
const FASTER_RCNN = "https://arxiv.org/abs/1506.01497";
const ATTENTION = "https://arxiv.org/abs/1706.03762";
const VIT = "https://arxiv.org/abs/2010.11929";

function notes(cue, sources = []) {
  return [cue, "", "[Sources]", ...sources.map((s) => `- ${s}`)].join("\n");
}

function setNotes(slide, text) {
  slide.speakerNotes.textFrame.setText(text);
  slide.speakerNotes.setVisible(true);
}

function setTitle(slide, text, size = 38) {
  const title = slide.placeholders.getItem("title");
  title.position = { left: 48, top: 55.5, width: 864, height: 78 };
  title.text = text;
  title.text.style = {
    fontSize: size,
    typeface: "Arial",
    bold: false,
    color: CYAN,
    alignment: "center",
    verticalAlignment: "middle",
    autoFit: "shrinkText",
    wrap: "none",
    insets: { top: 4.8, right: 9.6, bottom: 4.8, left: 9.6 },
  };
}

function clearBody(slide) {
  slide.placeholders.getItem("body").delete();
}

function setPage(slide, number) {
  const page = slide.placeholders.getItem("slideNumber");
  page.text = String(number);
  page.text.style = { fontSize: 16, typeface: "Arial", color: BLUE, alignment: "center", verticalAlignment: "middle" };
}

function addText(slide, text, position, size = 24, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: options.name ?? "Lecture text",
    position,
    fill: options.fill ?? "none",
    line: options.line ?? { style: "solid", fill: "none", width: 0 },
    ...(options.radius ? { borderRadius: options.radius } : {}),
  });
  shape.text = text;
  shape.text.style = {
    fontSize: size,
    typeface: options.typeface ?? "Arial",
    bold: options.bold ?? false,
    color: options.color ?? NAVY,
    alignment: options.align ?? "left",
    verticalAlignment: options.valign ?? "top",
    autoFit: "shrinkText",
    wrap: "square",
    insets: options.insets ?? { top: 4, right: 6, bottom: 4, left: 6 },
  };
  return shape;
}

function addCode(slide, code, position, options = {}) {
  return addText(slide, code, position, options.size ?? 17, {
    typeface: "Courier New",
    color: options.color ?? NAVY,
    fill: options.fill ?? "#F3F7FA",
    line: options.line ?? { style: "solid", fill: options.border ?? BORDER, width: 1.2 },
    radius: options.radius ?? 8,
    valign: options.valign ?? "top",
    insets: options.insets ?? { top: 10, right: 12, bottom: 10, left: 12 },
    name: options.name ?? "Runnable code",
  });
}

function addBox(slide, text, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: options.geometry ?? "roundRect",
    name: options.name ?? text,
    position,
    fill: options.fill ?? LIGHT,
    line: options.line ?? { style: "solid", fill: options.border ?? BORDER, width: options.lineWidth ?? 1.3 },
    borderRadius: options.radius ?? 10,
  });
  shape.text = text;
  shape.text.style = {
    fontSize: options.size ?? 22,
    typeface: "Arial",
    bold: options.bold ?? true,
    color: options.color ?? NAVY,
    alignment: options.align ?? "center",
    verticalAlignment: options.valign ?? "middle",
    autoFit: "shrinkText",
    wrap: "square",
    insets: { top: 6, right: 7, bottom: 6, left: 7 },
  };
  return shape;
}

function connect(slide, a, b, options = {}) {
  return slide.shapes.connect(a, b, {
    kind: options.kind ?? "straight",
    fromSide: options.fromSide ?? "right",
    toSide: options.toSide ?? "left",
    line: { style: options.style ?? "solid", fill: options.color ?? SLATE, width: options.width ?? 2 },
    tail: { type: options.head ?? "triangle", width: "sm", length: "sm" },
  });
}

function addLine(slide, x1, y1, x2, y2, color = SLATE, width = 2, name = "line") {
  return slide.shapes.add({
    geometry: "line",
    name,
    position: {
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      horizontalFlip: x2 < x1,
      verticalFlip: y2 < y1,
    },
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
}

function addPolyline(slide, points, color = SLATE, width = 2, name = "polyline") {
  for (let i = 0; i < points.length - 1; i += 1) {
    addLine(slide, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], color, width, `${name}-${i}`);
  }
}

function addOutline(slide, position, color = CYAN, width = 2, name = "outline") {
  return slide.shapes.add({
    geometry: "rect",
    name,
    position,
    fill: { color: "#FFFFFF", transparency: 100000 },
    line: { style: "solid", fill: color, width },
  });
}

function addCircle(slide, x, y, d, fill, name = "node") {
  return slide.shapes.add({
    geometry: "ellipse",
    name,
    position: { left: x, top: y, width: d, height: d },
    fill,
    line: { style: "solid", fill: "#FFFFFF", width: 1 },
  });
}

async function addImage(slide, path, alt, position, fit = "contain") {
  const file = await fs.readFile(path);
  const bytes = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
  return slide.images.add({ blob: bytes, contentType: "image/png", alt, fit, position });
}

function addSectionTag(slide, text) {
  addText(slide, text.toUpperCase(), { left: 65, top: 137, width: 210, height: 24 }, 16, { color: ORANGE, bold: true, name: "Section tag", valign: "middle" });
}

function addCaption(slide, text, x, y, w, color = SLATE) {
  return addText(slide, text, { left: x, top: y, width: w, height: 34 }, 18, { color, align: "center", valign: "middle", name: "Diagram caption" });
}

function addGrid(slide, x, y, rows, cols, cell, values, options = {}) {
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const value = values?.[r]?.[c] ?? 0;
      slide.shapes.add({
        geometry: "rect",
        name: `${options.name ?? "grid"}-${r}-${c}`,
        position: { left: x + c * cell, top: y + r * cell, width: cell - 1, height: cell - 1 },
        fill: value ? (options.on ?? BLUE) : (options.off ?? "#FFFFFF"),
        line: { style: "solid", fill: options.border ?? BORDER, width: 0.6 },
      });
    }
  }
}

function addHistogram(slide, values, x, y, width, height, color = BLUE, name = "histogram") {
  const gap = 4;
  const barW = (width - gap * (values.length - 1)) / values.length;
  const max = Math.max(...values);
  addLine(slide, x, y + height, x + width, y + height, SLATE, 1.3, `${name}-axis`);
  values.forEach((v, i) => {
    const h = (v / max) * (height - 8);
    slide.shapes.add({
      geometry: "rect",
      name: `${name}-${i}`,
      position: { left: x + i * (barW + gap), top: y + height - h, width: barW, height: h },
      fill: color,
      line: { style: "solid", fill: "none", width: 0 },
    });
  });
}

function addKernel(slide, matrix, x, y, cell, label) {
  addText(slide, label, { left: x, top: y - 35, width: cell * 3, height: 28 }, 19, { color: BLUE, bold: true, align: "center", valign: "middle" });
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      addBox(slide, String(matrix[r][c]), { left: x + c * cell, top: y + r * cell, width: cell - 2, height: cell - 2 }, { geometry: "rect", size: 20, fill: r === 1 && c === 1 ? PALE : "#FFFFFF", border: BORDER, radius: 0, bold: false });
    }
  }
}

let pageNumberForContent = (number) => number;

function contentSetup(slide, number, title, section, titleSize = 38) {
  setTitle(slide, title, titleSize);
  clearBody(slide);
  setPage(slide, pageNumberForContent(number));
  addSectionTag(slide, section);
}

async function buildLegacy() {
  await fs.rm(RENDER_DIR, { recursive: true, force: true });
  await fs.rm(`${BUILD}/final-layout`, { recursive: true, force: true });
  await fs.mkdir(RENDER_DIR, { recursive: true });
  await fs.mkdir(LAYOUT_DIR, { recursive: true });

  const presentation = await PresentationFile.importPptx(await FileBlob.load(STARTER));

  const contentOrder = [
    1, 2, 27,
    3, 4, 28, 5, 6,
    7, 8, 9, 29, 30,
    11, 10, 12,
    13, 14, 15, 31, 16, 17, 18,
    19, 20, 21, 32,
    22, 23, 24,
    26, 25, 33,
    34,
  ];
  const physicalIndexByContent = new Map(contentOrder.map((contentNumber, index) => [contentNumber, index]));
  const physicalSlideAt = presentation.slides.getItem.bind(presentation.slides);
  const contentSlides = {
    getItem(contentIndex) {
      const physicalIndex = physicalIndexByContent.get(contentIndex + 1);
      if (physicalIndex === undefined) throw new Error(`Missing physical slide for content ${contentIndex + 1}`);
      return physicalSlideAt(physicalIndex);
    },
  };
  pageNumberForContent = (contentNumber) => physicalIndexByContent.get(contentNumber) + 1;

  // Slide 1: cover
  {
    const slide = contentSlides.getItem(0);
    const title = slide.shapes.items[0];
    const subtitle = slide.shapes.items[1];
    await addImage(slide, `${IMG}/cover-perception.png`, "Illustrative autonomous-driving scene transitioning from classical edges to learned features and object detections.", { left: 540, top: 0, width: 420, height: 540 }, "cover");
    title.position = { left: 64, top: 106, width: 430, height: 190 };
    title.text.set([
      { spaceAfter: 10, runs: [{ run: "CISC 647", textStyle: { fontSize: "21px", bold: true, color: "#9FD5F2", typeface: "Arial" } }] },
      { runs: [{ run: "Perception:\nAlgorithms as\nROS 2 Nodes", textStyle: { fontSize: "40px", bold: true, color: "#FFFFFF", typeface: "Arial" } }] },
    ]);
    title.text.style = { alignment: "left", verticalAlignment: "middle", autoFit: "shrinkText", insets: { top: 0, right: 8, bottom: 0, left: 0 } };
    subtitle.position = { left: 66, top: 312, width: 420, height: 116 };
    subtitle.text.set([
      { spaceAfter: 8, runs: [{ run: "LECTURE PERCEPTION", textStyle: { fontSize: "18px", bold: true, color: ORANGE, typeface: "Arial" } }] },
      { spaceAfter: 8, runs: [{ run: "Classical vision → CNNs → a working ROS 2 graph", textStyle: { fontSize: "21px", bold: true, color: "#FFFFFF", typeface: "Arial" } }] },
      { runs: [{ run: "Fall 2026", textStyle: { fontSize: "16px", color: "#D7E7F2", typeface: "Arial" } }] },
    ]);
    subtitle.text.style = { alignment: "left", verticalAlignment: "top", autoFit: "shrinkText", insets: { top: 0, right: 8, bottom: 0, left: 0 } };
    setNotes(slide, notes("Open with the central question: when a vision system succeeds, who designed the useful representation—the engineer or the training process? Preview the causal progression rather than presenting a list of algorithms.", [TEMPLATE, LECTURE2, "OpenAI ImageGen: autonomous-driving perception hero illustration"]));
  }

  // Slide 2
  {
    const slide = contentSlides.getItem(1);
    contentSetup(slide, 2, "Connect each operation to the result you can see", "Learning outcomes", 35);
    const outcomes = [
      ["ROS 2 package", "Create, build, source, and run an ament_python package", BLUE],
      ["Nodes + topics", "Send a 10×10 matrix, classify it, and echo the result", ORANGE],
      ["Parameters", "Tune classical and CNN operations while nodes run", GREEN],
      ["Services + launch", "Call NMS and start the complete perception graph", RED],
    ];
    outcomes.forEach(([head, detail, color], i) => {
      const y = 176 + i * 67;
      addText(slide, head, { left: 78, top: y, width: 225, height: 43 }, 22, { color, bold: true, valign: "middle" });
      addLine(slide, 305, y + 21, 345, y + 21, color, 3, `outcome-link-${i}`);
      addText(slide, detail, { left: 355, top: y, width: 510, height: 43 }, 21, { color: NAVY, valign: "middle" });
    });
    addBox(slide, "Learn the idea  →  add a ROS 2 node  →  inspect data and visualize the result", { left: 105, top: 444, width: 750, height: 48 }, { fill: PALE, border: CYAN, size: 20, color: BLUE });
    setNotes(slide, notes("Frame the class around observable ROS 2 outcomes. Students create the package once, then add or run a small node for each perception mechanism. They inspect topics, parameters, services, logs, input data, and images generated by the nodes. There is no submission or grading step.", [LECTURE2, ROS_GUIDE, DATA_README, ROS_PACKAGE]));
  }

  // Slide 3
  {
    const slide = contentSlides.getItem(2);
    contentSetup(slide, 3, "Classical vision separates features from decisions", "Classical vision", 38);
    const labels = ["Preprocess", "Describe", "Classify", "Post-process"];
    const details = ["denoise\nnormalize", "histogram\nedges / gradient bins", "threshold\nSVM / tree", "merge\ntrack / suppress"];
    const nodes = [];
    labels.forEach((label, i) => {
      const x = 76 + i * 213;
      nodes.push(addBox(slide, `${label}\n${details[i]}`, { left: x, top: 208, width: 150, height: 116 }, { fill: i % 2 ? PALE : "#FFFFFF", border: i % 2 ? CYAN : BORDER, size: 21 }));
    });
    for (let i = 0; i < nodes.length - 1; i += 1) connect(slide, nodes[i], nodes[i + 1]);
    addText(slide, "The engineer chooses the representation; the classifier only learns the boundary.", { left: 125, top: 376, width: 710, height: 54 }, 24, { color: BLUE, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Use one lane-marking or pedestrian example to instantiate every block. Stress modularity as both the strength and the limitation of classical vision.", [LECTURE2, HOG]));
  }

  // Slide 4
  {
    const slide = contentSlides.getItem(3);
    contentSetup(slide, 4, "Projection histograms compress a digit into counts", "Classical vision", 36);
    const digit = [
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,1,1,0],
      [0,0,0,0,0,0,0,1,1,0],
      [0,0,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,1,1,0],
      [0,0,0,0,0,0,0,1,1,0],
      [0,0,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
    ];
    addGrid(slide, 72, 184, 10, 10, 25, digit, { name: "worked-digit-10x10", on: NAVY, off: "#FFFFFF" });
    addCaption(slide, "10×10 binary digit 3", 68, 442, 260, SLATE);
    const rowSums = [6,7,2,2,7,7,2,2,7,6];
    rowSums.forEach((v, i) => {
      addText(slide, String(v), { left: 358, top: 184 + i * 25, width: 28, height: 23 }, 15, { color: BLUE, bold: true, align: "center", valign: "middle" });
      addLine(slide, 390, 196 + i * 25, 390 + v * 24, 196 + i * 25, CYAN, 9, `row-sum-${i}`);
    });
    addText(slide, "row sums", { left: 365, top: 442, width: 190, height: 30 }, 18, { color: BLUE, bold: true, align: "center" });
    const colSums = [0,0,6,6,6,6,6,10,8,0];
    addHistogram(slide, colSums, 638, 225, 250, 175, ORANGE, "digit-column-sums");
    addText(slide, "column sums", { left: 655, top: 410, width: 215, height: 30 }, 18, { color: ORANGE, bold: true, align: "center" });
    addText(slide, "Feature vector = 10 row counts + 10 column counts", { left: 600, top: 174, width: 320, height: 42 }, 20, { color: NAVY, bold: true, align: "center", valign: "middle" });
    addText(slide, "Next: send all 100 pixels through ROS 2", { left: 575, top: 454, width: 345, height: 32 }, 16, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("Work the supplied 10×10 digit 3 from the pixels. Count the foreground cells in each row and each column, concatenate the two lists, then compare feature vectors with stored class prototypes. This demonstrates projection features. In the following micro-experiment, students deliberately send the full 100-pixel matrix so the ROS 2 node can visualize it and match it against all ten templates.", [LECTURE2, `${LAB}/inputs/digit_3.csv`, "Instructor-created projection-histogram calculation"]));
  }

  // Slide 5
  {
    const slide = contentSlides.getItem(4);
    contentSetup(slide, 5, "A global count loses location; projections retain some geometry", "Classical vision", 31);
    const a = [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,1,1,0]];
    const b = [[0,1,1,0],[0,0,1,0],[0,0,1,0],[0,1,1,0]];
    addGrid(slide, 100, 194, 4, 4, 42, a, { name: "pattern-a", on: BLUE });
    addGrid(slide, 692, 194, 4, 4, 42, b, { name: "pattern-b", on: ORANGE });
    addCaption(slide, "Pattern A", 95, 374, 180, BLUE);
    addCaption(slide, "Pattern B", 687, 374, 180, ORANGE);
    addText(slide, "global count", { left: 350, top: 185, width: 260, height: 32 }, 19, { color: SLATE, bold: true, align: "center" });
    addBox(slide, "6 dark cells = 6 dark cells", { left: 330, top: 224, width: 300, height: 55 }, { fill: "#FFF1E4", border: ORANGE, size: 22 });
    addText(slide, "projection vectors", { left: 350, top: 304, width: 260, height: 32 }, 19, { color: SLATE, bold: true, align: "center" });
    addBox(slide, "columns [0,4,2,0] ≠ [0,2,4,0]", { left: 305, top: 342, width: 350, height: 55 }, { fill: PALE, border: CYAN, size: 20 });
    addText(slide, "Global histogram: cheapest, least spatial information", { left: 110, top: 428, width: 740, height: 28 }, 20, { color: RED, bold: true, align: "center" });
    addText(slide, "Projection histogram: keeps row/column location, but not full shape", { left: 110, top: 458, width: 740, height: 28 }, 20, { color: BLUE, bold: true, align: "center" });
    setNotes(slide, notes("Keep the descriptor definitions separate. Both patterns have the same two-bin global intensity histogram because each has six foreground cells. Their column projections differ, so projection histograms retain more location information. They still cannot reconstruct every possible shape, which motivates local descriptors.", ["Instructor-created global-versus-projection histogram example"]));
  }

  // Slide 6
  {
    const slide = contentSlides.getItem(5);
    contentSetup(slide, 6, "Try it now: send a binary matrix through morphology", "Micro-experiment 2", 30);
    await addImage(slide, `${LAB_OUT}/morphology_result.png`, "The supplied morphology matrix before and after opening and closing.", { left: 55, top: 175, width: 410, height: 245 }, "contain");
    addText(slide, "Terminal 1 — run the subscriber", { left: 505, top: 170, width: 370, height: 28 }, 18, { color: ORANGE, bold: true });
    addCode(slide, "ros2 run cv_lab \\\n  classical_vision_node", { left: 500, top: 202, width: 390, height: 62 }, { size: 15 });
    addText(slide, "Terminal 2 — observe the result", { left: 505, top: 275, width: 370, height: 28 }, 18, { color: BLUE, bold: true });
    addCode(slide, "ros2 topic echo \\\n  /perception/morphology_report --once", { left: 500, top: 307, width: 390, height: 62 }, { size: 14 });
    addText(slide, "Terminal 3 — publish the supplied 9×19 matrix", { left: 505, top: 379, width: 385, height: 28 }, 17, { color: GREEN, bold: true });
    addCode(slide, "./publish_morphology.sh", { left: 500, top: 411, width: 390, height: 50 }, { size: 16 });
    addBox(slide, "opening_removed=1   •   closing_filled=1", { left: 80, top: 436, width: 360, height: 45 }, { fill: PALE, border: CYAN, size: 17, color: BLUE });
    addText(slide, "View: /tmp/cv_lab/morphology_result.png", { left: 495, top: 471, width: 400, height: 25 }, 14, { color: SLATE, bold: true, align: "center", typeface: "Courier New" });
    setNotes(slide, notes("Students inspect morphology.csv as two 9×9 binary inputs separated by one zero column. They start classical_vision_node, start echo --once on /perception/morphology_report, and run publish_morphology.sh. The node validates all 171 values, applies opening and closing only after the message arrives, publishes the two changed-pixel counts, and saves the four visible matrices.", [LECTURE2, "https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphological_ops.html", ROS_GUIDE, `${LAB}/publish_morphology.sh`, `${LAB}/inputs/morphology.csv`, `${ROS_PACKAGE}/cv_lab/classical_vision_node.py`, `${LAB_OUT}/morphology_result.png`]));
  }

  // Slide 7
  {
    const slide = contentSlides.getItem(6);
    contentSetup(slide, 7, "Gradients turn brightness changes into edges", "Lines and lanes", 38);
    addText(slide, "Intensity", { left: 72, top: 174, width: 120, height: 32 }, 20, { color: BLUE, bold: true });
    addLine(slide, 115, 351, 115, 220, SLATE, 1.4, "intensity-y");
    addLine(slide, 115, 351, 440, 351, SLATE, 1.4, "intensity-x");
    addLine(slide, 130, 325, 270, 325, BLUE, 4, "dark-region");
    addLine(slide, 270, 325, 270, 245, BLUE, 4, "brightness-jump");
    addLine(slide, 270, 245, 420, 245, BLUE, 4, "bright-region");
    addText(slide, "Derivative", { left: 520, top: 174, width: 130, height: 32 }, 20, { color: ORANGE, bold: true });
    addLine(slide, 560, 351, 560, 220, SLATE, 1.4, "derivative-y");
    addLine(slide, 560, 351, 865, 351, SLATE, 1.4, "derivative-x");
    addLine(slide, 575, 325, 695, 325, ORANGE, 4, "derivative-zero-left");
    addLine(slide, 695, 325, 720, 242, ORANGE, 4, "derivative-rise");
    addLine(slide, 720, 242, 745, 325, ORANGE, 4, "derivative-fall");
    addLine(slide, 745, 325, 845, 325, ORANGE, 4, "derivative-zero-right");
    addText(slide, "Large change → large gradient → candidate edge", { left: 220, top: 390, width: 520, height: 45 }, 25, { color: NAVY, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Build the derivative intuition before showing a kernel. A gradient gives magnitude and direction; thresholding or non-maximum suppression turns that continuous response into an edge map.", [OPENCV_SOBEL, LECTURE2]));
  }

  // Slide 8
  {
    const slide = contentSlides.getItem(7);
    contentSetup(slide, 8, "One Sobel response is a 3×3 dot product", "Lines and lanes", 35);
    addKernel(slide, [[10,10,80],[10,10,80],[10,10,80]], 75, 235, 50, "image patch");
    addText(slide, "⊙", { left: 245, top: 278, width: 55, height: 55 }, 34, { color: SLATE, bold: true, align: "center", valign: "middle" });
    addKernel(slide, [[-1,0,1],[-2,0,2],[-1,0,1]], 315, 235, 50, "Sobel Gx");
    addText(slide, "sum", { left: 490, top: 287, width: 70, height: 38 }, 22, { color: ORANGE, bold: true, align: "center" });
    addBox(slide, "280", { left: 580, top: 258, width: 110, height: 78 }, { fill: "#FFF1E4", border: ORANGE, size: 32, color: RED });
    addText(slide, "large positive response", { left: 555, top: 349, width: 160, height: 42 }, 19, { color: ORANGE, bold: true, align: "center" });
    addText(slide, "Bright pixels lie to the right of dark pixels → strong vertical edge", { left: 715, top: 237, width: 185, height: 125 }, 21, { color: NAVY, bold: true, align: "center", valign: "middle", fill: PALE, line: { style: "solid", fill: CYAN, width: 1.2 }, radius: 10 });
    addText(slide, "Repeat this calculation at every image location; combine Gx and Gy for magnitude and direction.", { left: 130, top: 420, width: 700, height: 54 }, 22, { color: BLUE, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Compute the displayed value: each row contributes 70, 140, and 70, for a total Gx response of 280. The positive sign means the patch becomes brighter from left to right. Sliding the same fixed kernel across the image is classical convolution.", [OPENCV_SOBEL, LECTURE2, "Instructor calculation: Sobel patch dot product = 280"]));
  }

  // Slide 9
  {
    const slide = contentSlides.getItem(8);
    contentSetup(slide, 9, "Collinear edge points agree on one (ρ, θ)", "Lines and lanes", 35);
    addText(slide, "image space", { left: 78, top: 173, width: 250, height: 30 }, 20, { color: BLUE, bold: true, align: "center" });
    addLine(slide, 105, 398, 105, 220, SLATE, 1.4, "image-y-axis");
    addLine(slide, 105, 398, 330, 398, SLATE, 1.4, "image-x-axis");
    addLine(slide, 135, 365, 295, 237, BLUE, 3, "source-line");
    [[160,345],[215,301],[270,257]].forEach(([x,y], i) => addCircle(slide, x - 8, y - 8, 16, [CYAN,ORANGE,GREEN][i], `edge-point-${i}`));
    addText(slide, "three edge pixels on one line", { left: 80, top: 414, width: 270, height: 36 }, 19, { color: NAVY, align: "center" });
    addText(slide, "ρ = x cos θ + y sin θ", { left: 360, top: 270, width: 205, height: 70 }, 23, { color: NAVY, bold: true, align: "center", valign: "middle", fill: PALE, line: { style: "solid", fill: CYAN, width: 1.2 }, radius: 10 });
    addText(slide, "parameter space", { left: 610, top: 173, width: 270, height: 30 }, 20, { color: ORANGE, bold: true, align: "center" });
    const px = 625; const py = 391; const pw = 235; const ph = 175;
    addLine(slide, px, py, px, py - ph, SLATE, 1.4, "rho-axis");
    addLine(slide, px, py - ph / 2, px + pw, py - ph / 2, SLATE, 1.4, "theta-axis");
    addText(slide, "ρ", { left: px - 32, top: py - ph - 12, width: 30, height: 28 }, 18, { color: SLATE, bold: true, align: "center" });
    addText(slide, "θ", { left: px + pw, top: py - ph / 2 + 4, width: 30, height: 28 }, 18, { color: SLATE, bold: true, align: "center" });
    const houghPoints = [[1,1],[2,2],[3,3]];
    houghPoints.forEach(([xp, yp], idx) => {
      const pts = [];
      for (let deg = 0; deg <= 180; deg += 6) {
        const rad = deg * Math.PI / 180;
        const rho = xp * Math.cos(rad) + yp * Math.sin(rad);
        const sx = px + (deg / 180) * pw;
        const sy = py - ph / 2 - (rho / 4.5) * (ph / 2);
        pts.push([sx, sy]);
      }
      addPolyline(slide, pts, [CYAN,ORANGE,GREEN][idx], 2.2, `hough-curve-${idx}`);
    });
    const peakX = px + (135 / 180) * pw;
    const peakY = py - ph / 2;
    addCircle(slide, peakX - 9, peakY - 9, 18, RED, "hough-peak");
    addText(slide, "intersection = accumulator peak", { left: 620, top: 412, width: 250, height: 34 }, 19, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("Each edge point produces a sinusoidal curve of possible lines in Hough parameter space. The three points shown lie on y=x. Their curves intersect at θ=135 degrees and ρ=0, so the accumulator receives multiple votes at that parameter pair.", [OPENCV_HOUGH, LECTURE2, "Instructor-created Hough parameter-space calculation"]));
  }

  // Slide 10
  {
    const slide = contentSlides.getItem(9);
    contentSetup(slide, 10, "Try it now: select a window, then republish the image", "Micro-experiment 4", 29);
    await addImage(slide, `${LAB_OUT}/window_result.png`, "The supplied road image with three candidate windows, edge-density labels, and the selected window highlighted.", { left: 55, top: 174, width: 500, height: 260 }, "contain");
    addText(slide, "1  Select", { left: 610, top: 175, width: 125, height: 28 }, 19, { color: ORANGE, bold: true });
    addCode(slide, "ros2 param set /classical_vision \\\n  window_index 0", { left: 590, top: 207, width: 310, height: 62 }, { size: 14 });
    addText(slide, "2  Observe", { left: 610, top: 278, width: 125, height: 28 }, 19, { color: BLUE, bold: true });
    addCode(slide, "ros2 topic echo \\\n  /perception/window_report --once", { left: 590, top: 310, width: 310, height: 62 }, { size: 13 });
    addText(slide, "3  Send the road again", { left: 610, top: 383, width: 250, height: 28 }, 19, { color: GREEN, bold: true });
    addCode(slide, "./publish_road.sh", { left: 590, top: 415, width: 310, height: 50 }, { size: 16 });
    addBox(slide, "selected=0  •  selected_edge_density=...  •  window_result.png", { left: 85, top: 451, width: 470, height: 42 }, { fill: PALE, border: CYAN, size: 15, color: BLUE });
    addText(slide, "The parameter changes the next input—not a hidden timer.", { left: 570, top: 475, width: 340, height: 24 }, 16, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("Students keep classical_vision_node running, set window_index, start echo --once on /perception/window_report, and run publish_road.sh again. The node recomputes all three edge-density scores only when the road path arrives, highlights the selected window in green, and publishes the selected score. Repeat for indices 1 and 2. The score is a descriptor, not an object probability.", [HOG, ROS_GUIDE, `${LAB}/publish_road.sh`, `${ROS_PACKAGE}/cv_lab/classical_vision_node.py`, `${LAB_OUT}/window_result.png`, ROS_PARAM_DOC]));
  }

  // Slide 11
  {
    const slide = contentSlides.getItem(10);
    contentSetup(slide, 11, "Classical detection repeats one classifier over many windows", "Object detection", 33);
    addText(slide, "1  image pyramid", { left: 50, top: 170, width: 225, height: 30 }, 20, { color: BLUE, bold: true, align: "center" });
    addOutline(slide, { left: 80, top: 224, width: 170, height: 130 }, BORDER, 1.5, "pyramid-large");
    addOutline(slide, { left: 103, top: 242, width: 125, height: 95 }, CYAN, 1.5, "pyramid-medium");
    addOutline(slide, { left: 126, top: 260, width: 80, height: 60 }, ORANGE, 1.5, "pyramid-small");
    addText(slide, "same object at several scales", { left: 55, top: 373, width: 220, height: 45 }, 18, { color: SLATE, align: "center" });
    addText(slide, "2  sliding windows", { left: 345, top: 170, width: 225, height: 30 }, 20, { color: BLUE, bold: true, align: "center" });
    addOutline(slide, { left: 370, top: 225, width: 185, height: 130 }, BORDER, 1.5, "scan-image");
    [[382,238],[422,238],[462,238],[402,278],[442,278],[482,278]].forEach(([x,y], i) => addOutline(slide, { left: x, top: y, width: 58, height: 48 }, i === 4 ? ORANGE : "#9CB4C4", i === 4 ? 3 : 1, `window-${i}`));
    addText(slide, "HOG bins local edge directions → SVM score", { left: 340, top: 369, width: 240, height: 52 }, 17, { color: SLATE, align: "center" });
    addText(slide, "3  suppress duplicates", { left: 650, top: 170, width: 250, height: 30 }, 20, { color: BLUE, bold: true, align: "center" });
    addOutline(slide, { left: 692, top: 233, width: 118, height: 112 }, CYAN, 2, "candidate-a");
    addOutline(slide, { left: 705, top: 242, width: 118, height: 112 }, ORANGE, 2, "candidate-b");
    addOutline(slide, { left: 718, top: 251, width: 118, height: 112 }, GREEN, 3.5, "nms-final");
    addText(slide, "NMS keeps one high-score box", { left: 655, top: 373, width: 240, height: 45 }, 18, { color: SLATE, align: "center" });
    addText(slide, "Cost grows with scales × locations × window sizes", { left: 170, top: 444, width: 620, height: 40 }, 23, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("Make the loops explicit. The detector resizes the image, scans many locations, computes a fixed descriptor such as HOG, applies a classifier, and uses non-maximum suppression to remove overlapping detections. The expensive part is evaluating many candidate windows.", [HOG, YOLO, "Instructor-created classical detection schematic"]));
  }

  // Slide 12
  {
    const slide = contentSlides.getItem(11);
    contentSetup(slide, 12, "Classical features encode only the invariances we design", "Transition", 32);
    const conditions = [
      ["Lighting", "normalize or design contrast features"],
      ["Viewpoint", "add templates or orientation bins"],
      ["Scale", "build an image pyramid"],
      ["Clutter", "add context rules and hard negatives"],
    ];
    conditions.forEach(([head, detail], i) => {
      const y = 181 + i * 62;
      addText(slide, head, { left: 100, top: y, width: 150, height: 42 }, 23, { color: BLUE, bold: true, valign: "middle" });
      addLine(slide, 255, y + 20, 335, y + 20, BORDER, 3, `shift-${i}`);
      addText(slide, detail, { left: 360, top: y, width: 390, height: 42 }, 21, { color: NAVY, valign: "middle" });
      addText(slide, "explicit design", { left: 760, top: y, width: 125, height: 42 }, 17, { color: RED, bold: true, align: "center", valign: "middle" });
    });
    addText(slide, "Can training learn the representation and its useful invariances from examples?", { left: 150, top: 435, width: 660, height: 48 }, 25, { color: ORANGE, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Do not dismiss classical vision as universally brittle. Its strength is that the designer can encode known invariances directly. Its limitation is scaling that design across the long tail of conditions. Learned features shift more of that representation design into data and optimization.", [HOG, ALEXNET]));
  }

  // Slide 13
  {
    const slide = contentSlides.getItem(12);
    contentSetup(slide, 13, "Start naive: a fully connected image classifier", "Neural networks", 36);
    addText(slide, "Not yet a CNN", { left: 710, top: 142, width: 160, height: 30 }, 18, { color: RED, bold: true, align: "center" });
    const xs = [145, 410, 700];
    const counts = [6, 5, 3];
    const nodes = counts.map((count, layer) => Array.from({ length: count }, (_, i) => addCircle(slide, xs[layer], 190 + i * (210 / Math.max(1, count - 1)), 28, layer === 0 ? PALE : layer === 1 ? CYAN : ORANGE, `dense-${layer}-${i}`)));
    nodes[0].forEach(a => nodes[1].forEach(b => connect(slide, a, b, { width: 0.8, color: "#AFC2CF", head: "none" })));
    nodes[1].forEach(a => nodes[2].forEach(b => connect(slide, a, b, { width: 0.8, color: "#AFC2CF", head: "none" })));
    addCaption(slide, "Flattened pixels", 80, 425, 160, BLUE);
    addCaption(slide, "Hidden units", 345, 425, 160, CYAN);
    addCaption(slide, "Class scores", 650, 425, 160, ORANGE);
    addText(slide, "Every neuron sees every output from the prior layer", { left: 280, top: 462, width: 430, height: 28 }, 20, { color: SLATE, align: "center" });
    setNotes(slide, notes("Correct the terminology explicitly: a fully connected image classifier is a useful starting point, but it is not yet convolutional. Explain forward propagation before discussing how the connectivity pattern changes.", [LENET]));
  }

  // Slide 14
  {
    const slide = contentSlides.getItem(13);
    contentSetup(slide, 14, "A dense classifier alternates transforms and nonlinearities", "Neural networks", 31);
    const stages = [
      ["Image", "28×28"],
      ["Flatten", "784 values"],
      ["Dense", "784 → 128"],
      ["ReLU", "nonlinearity"],
      ["Dense", "128 → 10 logits"],
      ["Softmax", "10 probabilities"],
    ];
    const boxes = stages.map(([head, detail], i) => {
      const x = 35 + i * 151;
      const box = addBox(slide, head, { left: x, top: 211, width: 112, height: 60 }, { fill: i === 3 ? "#FFF1E4" : (i === 2 || i === 4 ? PALE : "#FFFFFF"), border: i === 3 ? ORANGE : BORDER, size: 20 });
      addText(slide, detail, { left: x - 8, top: 286, width: 128, height: 49 }, 17, { color: SLATE, align: "center", valign: "top" });
      return box;
    });
    for (let i = 0; i < boxes.length - 1; i += 1) connect(slide, boxes[i], boxes[i + 1], { width: 1.7 });
    addBox(slide, "label → cross-entropy loss → backpropagation → update both Dense layers", { left: 165, top: 382, width: 630, height: 64 }, { fill: "#EAF5E6", border: GREEN, size: 22, color: NAVY });
    addText(slide, "Logits are outputs of the second Dense layer—not a layer by themselves.", { left: 165, top: 447, width: 630, height: 30 }, 18, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("Walk left to right during the forward pass, then right to left during learning. The first Dense layer creates hidden features. ReLU makes the network nonlinear. The second Dense layer produces ten class logits. Softmax converts them to probabilities, and cross-entropy plus backpropagation updates both learned affine transforms.", [LENET, RELU, "Instructor-created 28×28 digit-classifier example"]));
  }

  // Slide 15
  {
    const slide = contentSlides.getItem(14);
    contentSetup(slide, 15, "On the same 28×28 digit, convolution uses far fewer parameters", "Why convolution", 31);
    addText(slide, "Dense baseline", { left: 70, top: 174, width: 365, height: 34 }, 23, { color: BLUE, bold: true, align: "center" });
    addBox(slide, "784 inputs × 128 units + bias", { left: 70, top: 222, width: 365, height: 60 }, { fill: PALE, border: CYAN, size: 21 });
    addBox(slide, "100,480 parameters", { left: 70, top: 305, width: 365, height: 68 }, { fill: "#FFF1E4", border: ORANGE, size: 27, color: RED });
    addText(slide, "Convolutional alternative", { left: 525, top: 174, width: 365, height: 34 }, 23, { color: GREEN, bold: true, align: "center" });
    addBox(slide, "16 filters × 3×3×1 + bias", { left: 525, top: 222, width: 365, height: 60 }, { fill: "#EAF5E6", border: GREEN, size: 21 });
    addBox(slide, "160 parameters", { left: 525, top: 305, width: 365, height: 68 }, { fill: "#EAF5E6", border: GREEN, size: 27, color: GREEN });
    addText(slide, "The shared filters are reused at every location.", { left: 525, top: 381, width: 365, height: 32 }, 19, { color: GREEN, bold: true, align: "center" });
    addText(slide, "628× fewer first-layer parameters—because locality and sharing are built into the architecture", { left: 105, top: 435, width: 750, height: 46 }, 21, { color: NAVY, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Use one consistent 28×28 grayscale digit for both calculations. The dense layer has 784×128 weights plus 128 biases = 100,480 parameters. Sixteen 3×3 grayscale kernels have 16×3×3×1 weights plus 16 biases = 160 parameters. The 628× ratio illustrates connectivity cost; it does not imply equal representational capacity.", [LENET, LAB_NOTEBOOK, "Instructor calculations: 784×128+128 = 100,480; 16×3×3×1+16 = 160"]));
  }

  // Slide 16
  {
    const slide = contentSlides.getItem(15);
    contentSetup(slide, 16, "Local connectivity encodes the neighborhood prior", "Why convolution", 35);
    const grid = Array.from({ length: 8 }, () => Array(8).fill(0));
    addGrid(slide, 130, 180, 8, 8, 34, grid, { name: "image-grid", off: "#FFFFFF" });
    for (let r = 2; r < 5; r += 1) {
      for (let c = 3; c < 6; c += 1) {
        slide.shapes.add({ geometry: "rect", name: `rf-${r}-${c}`, position: { left: 130 + c * 34, top: 180 + r * 34, width: 33, height: 33 }, fill: PALE, line: { style: "solid", fill: CYAN, width: 1.4 } });
      }
    }
    const neuron = addCircle(slide, 665, 268, 68, ORANGE, "local-output-neuron");
    addLine(slide, 334, 298, 665, 302, CYAN, 3, "receptive-field-link");
    addText(slide, "3 × 3 neighborhood", { left: 208, top: 458, width: 220, height: 34 }, 21, { color: CYAN, bold: true, align: "center" });
    addText(slide, "one local response", { left: 585, top: 358, width: 230, height: 38 }, 22, { color: ORANGE, bold: true, align: "center" });
    addText(slide, "One layer sees nearby pixels; deeper layers combine larger regions.", { left: 470, top: 410, width: 420, height: 58 }, 23, { color: NAVY, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Local connectivity is an architectural prior, not learned pruning. A unit in one convolutional layer uses only a nearby patch. Stacking layers allows information to travel farther, so the effective receptive field grows with depth.", [LENET, ALEXNET]));
  }

  // Slide 17
  {
    const slide = contentSlides.getItem(16);
    contentSetup(slide, 17, "Convolution = local dot product + shared weights", "Why convolution", 34);
    addKernel(slide, [[0.1,-0.3,0.2],[0.4,0.8,-0.1],[-0.2,0.5,0.0]], 82, 236, 48, "trainable 3×3 slice");
    const positions = [355, 535, 715];
    positions.forEach((x, i) => {
      addGrid(slide, x, 230, 3, 3, 36, [[0,0,0],[0,0,0],[0,0,0]], { name: `shared-patch-${i}`, off: i === 1 ? PALE : "#FFFFFF" });
      addCaption(slide, `location ${i + 1}`, x - 5, 354, 120, SLATE);
    });
    addLine(slide, 245, 288, 340, 288, ORANGE, 3, "share-arrow-a");
    addLine(slide, 463, 288, 520, 288, ORANGE, 3, "share-arrow-b");
    addLine(slide, 643, 288, 700, 288, ORANGE, 3, "share-arrow-c");
    addText(slide, "The same learned numbers are reused at every location", { left: 270, top: 405, width: 575, height: 42 }, 23, { color: BLUE, bold: true, align: "center", valign: "middle" });
    addText(slide, "For RGB, one 3×3 filter actually has shape 3×3×3 and sums across channels.", { left: 100, top: 442, width: 760, height: 35 }, 18, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("The displayed matrix is one channel slice of a trainable kernel, deliberately not a hand-designed Sobel filter. Training changes the values. Local connectivity alone would learn different weights at every position; weight sharing reuses one kernel across the image, yielding translation-equivariant responses and far fewer parameters.", [LENET, ALEXNET]));
  }

  // Slide 18
  {
    const slide = contentSlides.getItem(17);
    contentSetup(slide, 18, "Filters transform H×W×C into a stack of feature maps", "Why convolution", 32);
    addBox(slide, "Input tensor\n32×32×3", { left: 65, top: 230, width: 170, height: 105 }, { fill: PALE, border: CYAN, size: 24 });
    addText(slide, "16 filters", { left: 305, top: 176, width: 165, height: 34 }, 22, { color: ORANGE, bold: true, align: "center" });
    for (let i = 0; i < 4; i += 1) addOutline(slide, { left: 325 + i * 11, top: 232 - i * 9, width: 105, height: 105 }, i === 3 ? ORANGE : "#F7C58A", i === 3 ? 2.5 : 1.2, `kernel-stack-${i}`);
    addText(slide, "each 3×3×3", { left: 300, top: 353, width: 180, height: 32 }, 19, { color: SLATE, bold: true, align: "center" });
    addText(slide, "stride 1\npadding 1", { left: 505, top: 248, width: 110, height: 70 }, 20, { color: NAVY, bold: true, align: "center", valign: "middle" });
    for (let i = 0; i < 5; i += 1) addOutline(slide, { left: 670 + i * 13, top: 226 - i * 9, width: 150, height: 120 }, i === 4 ? GREEN : "#A9C89A", i === 4 ? 2.5 : 1.2, `feature-map-${i}`);
    addText(slide, "Output tensor\n32×32×16", { left: 670, top: 365, width: 205, height: 62 }, 24, { color: GREEN, bold: true, align: "center", valign: "middle" });
    addLine(slide, 245, 283, 300, 283, ORANGE, 3, "tensor-arrow-a");
    addLine(slide, 445, 283, 495, 283, ORANGE, 3, "tensor-arrow-b");
    addLine(slide, 615, 283, 655, 283, ORANGE, 3, "tensor-arrow-c");
    addText(slide, "One filter produces one output channel; padding controls spatial size.", { left: 135, top: 443, width: 690, height: 42 }, 22, { color: BLUE, bold: true, align: "center" });
    setNotes(slide, notes("Name every tensor dimension. The input has height, width, and three color channels. Each of sixteen filters spans all three input channels. With stride one and one-pixel padding, the spatial size remains 32×32, while the sixteen filters create sixteen output channels.", [LENET, ALEXNET, "Instructor-created tensor-shape example"]));
  }

  // Slide 19
  {
    const slide = contentSlides.getItem(18);
    contentSetup(slide, 19, "Without nonlinearities, deep linear layers collapse into one", "Activations", 31);
    addBox(slide, "W₃(W₂(W₁x)) = W*x", { left: 70, top: 188, width: 370, height: 74 }, { fill: PALE, border: CYAN, size: 27, color: BLUE });
    addText(slide, "more layers, but still one linear transformation", { left: 85, top: 272, width: 340, height: 45 }, 19, { color: SLATE, align: "center" });
    addBox(slide, "W₃ ReLU(W₂ ReLU(W₁x))", { left: 70, top: 342, width: 370, height: 74 }, { fill: "#FFF1E4", border: ORANGE, size: 24, color: ORANGE });
    addText(slide, "piecewise nonlinear decision boundary", { left: 85, top: 426, width: 340, height: 38 }, 19, { color: SLATE, align: "center" });
    addText(slide, "ReLU(x) = max(0, x)", { left: 540, top: 176, width: 300, height: 42 }, 25, { color: BLUE, bold: true, align: "center" });
    addLine(slide, 655, 376, 655, 225, SLATE, 1.5, "relu-y");
    addLine(slide, 535, 329, 865, 329, SLATE, 1.5, "relu-x");
    addLine(slide, 550, 329, 655, 329, BLUE, 4, "relu-negative");
    addLine(slide, 655, 329, 820, 240, BLUE, 4, "relu-positive");
    addText(slide, "simple positive-side gradient", { left: 555, top: 391, width: 285, height: 32 }, 19, { color: NAVY, bold: true, align: "center" });
    addText(slide, "ReLU zeros activations for this input; it does not remove weights or links.", { left: 485, top: 440, width: 410, height: 46 }, 20, { color: RED, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Motivate nonlinearity before optimization. Composing affine or linear transforms without an activation produces another affine or linear transform. ReLU breaks that collapse. It also offers a simple positive-side derivative and sparse activations, but it does not prune the network's stored connectivity.", [RELU, ALEXNET]));
  }

  // Slide 20
  {
    const slide = contentSlides.getItem(19);
    contentSetup(slide, 20, "Leaky ReLU keeps a gradient when x < 0", "Activations", 36);
    addLine(slide, 510, 370, 510, 185, SLATE, 1.5, "leaky-y");
    addLine(slide, 280, 315, 820, 315, SLATE, 1.5, "leaky-x");
    addLine(slide, 310, 315, 510, 315, BLUE, 4, "standard-relu-negative");
    addLine(slide, 510, 315, 760, 205, BLUE, 4, "standard-relu-positive");
    addLine(slide, 310, 345, 510, 315, ORANGE, 4, "leaky-negative");
    addText(slide, "ReLU", { left: 705, top: 220, width: 90, height: 28 }, 19, { color: BLUE, bold: true });
    addText(slide, "Leaky: αx", { left: 305, top: 350, width: 130, height: 28 }, 19, { color: ORANGE, bold: true });
    addBox(slide, "Dead ReLU: preactivation remains negative for all observed samples", { left: 65, top: 185, width: 375, height: 86 }, { fill: "#FFF1E4", border: ORANGE, size: 20, bold: false });
    addText(slide, "x < 0", { left: 80, top: 299, width: 95, height: 32 }, 20, { color: SLATE, bold: true, align: "center" });
    addText(slide, "ReLU slope = 0", { left: 78, top: 337, width: 155, height: 34 }, 20, { color: BLUE, bold: true });
    addText(slide, "Leaky slope = α", { left: 78, top: 377, width: 175, height: 34 }, 20, { color: ORANGE, bold: true });
    addText(slide, "A small negative slope preserves a local learning signal.", { left: 440, top: 407, width: 430, height: 45 }, 23, { color: NAVY, bold: true, align: "center", valign: "middle" });
    addText(slide, "Tradeoff: fewer dead units, but fewer exact-zero activations.", { left: 180, top: 455, width: 600, height: 30 }, 19, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("A unit is not dead merely because one input produces a negative preactivation. The problem is persistent negativity across the relevant data, which makes the local ReLU derivative zero and prevents incoming weights from receiving a useful local gradient. Leaky ReLU uses a small slope alpha on the negative branch.", [RELU, "https://ai.stanford.edu/~amaas/papers/relu_hybrid_icml2013_final.pdf"]));
  }

  // Slide 21
  {
    const slide = contentSlides.getItem(20);
    contentSetup(slide, 21, "Pooling reduces spatial size without learned weights", "Spatial hierarchy", 34);
    const vals = [[1,3,2,0],[4,6,1,2],[2,5,7,3],[0,1,2,8]];
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const quadrantFill = r < 2 && c < 2 ? PALE : r < 2 && c >= 2 ? "#FFF1E4" : r >= 2 && c < 2 ? "#EEF6EA" : "#FFFFFF";
        addBox(slide, String(vals[r][c]), { left: 125 + c * 52, top: 194 + r * 52, width: 48, height: 48 }, { geometry: "rect", fill: quadrantFill, border: BORDER, radius: 0, size: 21, bold: false });
      }
    }
    addText(slide, "2×2 max pool, stride 2", { left: 350, top: 260, width: 225, height: 40 }, 21, { color: ORANGE, bold: true, align: "center" });
    addLine(slide, 340, 286, 400, 286, ORANGE, 3, "pool-arrow-a");
    const pooled = [[6,2],[5,8]];
    for (let r = 0; r < 2; r += 1) {
      for (let c = 0; c < 2; c += 1) {
        addBox(slide, String(pooled[r][c]), { left: 610 + c * 76, top: 236 + r * 76, width: 70, height: 70 }, { geometry: "rect", fill: "#FFF1E4", border: ORANGE, radius: 0, size: 28 });
      }
    }
    addText(slide, "4×4×C → 2×2×C", { left: 600, top: 405, width: 250, height: 38 }, 24, { color: BLUE, bold: true, align: "center" });
    addText(slide, "Top-right window max{2, 0, 1, 2} = 2", { left: 95, top: 424, width: 410, height: 34 }, 19, { color: RED, bold: true, align: "center" });
    addText(slide, "Tradeoff: lower compute and more context for later layers, but less precise localization", { left: 95, top: 456, width: 810, height: 26 }, 18, { color: SLATE, align: "center" });
    setNotes(slide, notes("Work all four pooling windows. The top-right maximum is 2, so the correct output is [[6,2],[5,8]]. Pooling has no learned weights and leaves the channel count unchanged. Discuss the tradeoff between lower spatial cost and loss of precise localization; aggressive downsampling can hurt small-object detection.", [LENET, ALEXNET, "Instructor calculation: 2×2 max-pooling output [[6,2],[5,8]]"]));
  }

  // Slide 22
  {
    const slide = contentSlides.getItem(21);
    contentSetup(slide, 22, "A CNN repeats one shape-aware computational motif", "CNN architecture", 34);
    const labels = ["Input", "Conv 3×3", "ReLU", "Pool 2×2", "Repeat"];
    const shapes = ["32×32×3", "32×32×32", "32×32×32", "16×16×32", "larger context"];
    const colors = ["#FFFFFF", PALE, "#FFF1E4", "#EAF5E6", PALE];
    const borders = [BORDER, CYAN, ORANGE, GREEN, CYAN];
    const boxes = labels.map((label, i) => addBox(slide, label, { left: 45 + i * 184, top: 215, width: 145, height: 64 }, { fill: colors[i], border: borders[i], size: 20 }));
    for (let i = 0; i < boxes.length - 1; i += 1) connect(slide, boxes[i], boxes[i + 1]);
    shapes.forEach((shape, i) => addText(slide, shape, { left: 40 + i * 184, top: 298, width: 155, height: 34 }, 17, { color: SLATE, bold: true, align: "center" }));
    addBox(slide, "Conv: learn local patterns   •   ReLU: add nonlinearity   •   Pool: reduce spatial cost", { left: 95, top: 365, width: 770, height: 58 }, { fill: "#FFFFFF", border: BORDER, size: 22, color: BLUE, bold: true });
    addText(slide, "As blocks repeat, spatial size usually falls, channel count grows, and receptive field expands.", { left: 125, top: 438, width: 710, height: 42 }, 20, { color: NAVY, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Use the tensor shapes to review the entire mechanism. Convolution learns local patterns and changes the channel dimension. ReLU adds nonlinearity without changing shape. Pooling reduces height and width without changing channels. Repetition gives later features access to a larger image region.", [LENET, ALEXNET, BATCHNORM, RESNET, "Instructor-created tensor-shape walkthrough"]));
  }

  // Slide 23
  {
    const slide = contentSlides.getItem(22);
    contentSetup(slide, 23, "Use CNN history as a map of design pressures", "CNN architecture", 35);
    addText(slide, "Bottleneck", { left: 65, top: 167, width: 350, height: 32 }, 21, { color: RED, bold: true });
    addText(slide, "Representative answer", { left: 480, top: 167, width: 410, height: 32 }, 21, { color: GREEN, bold: true });
    const milestones = [
      ["Learn local digit features", "1998  LeNet-5 — convolution + subsampling"],
      ["Scale training to ImageNet", "2012  AlexNet — GPU + ReLU + dropout"],
      ["Grow depth and scale", "2014  VGG / Inception — small filters + multi-scale paths"],
      ["Train very deep networks", "2015/16  BatchNorm + ResNet shortcuts"],
      ["Deploy under compute constraints", "2017  MobileNet — depthwise separable convolution"],
    ];
    milestones.forEach(([problem, answer], i) => {
      const y = 208 + i * 49;
      addText(slide, problem, { left: 65, top: y, width: 360, height: 40 }, 19, { color: NAVY, valign: "middle" });
      addText(slide, answer, { left: 470, top: y, width: 430, height: 40 }, 19, { color: i % 2 ? BLUE : GREEN, bold: true, valign: "middle" });
      addLine(slide, 430, y + 16, 460, y + 16, BORDER, 2, `milestone-link-${i}`);
    });
    addText(slide, "Remember the pressure → mechanism relationship; the names and dates are reference points.", { left: 105, top: 457, width: 750, height: 30 }, 18, { color: ORANGE, bold: true, align: "center" });
    setNotes(slide, notes("Keep this concise. Students should retain the design pressure and representative mechanism, not memorize a chronology. Emphasize that VGG, Inception, BatchNorm, and ResNet overlapped and combined ideas rather than forming one strict linear progression.", [LENET, ALEXNET, VGG, INCEPTION, BATCHNORM, RESNET, MOBILENET]));
  }

  // Slide 24
  {
    const slide = contentSlides.getItem(23);
    contentSetup(slide, 24, "Try it now: change precision, then resend the same patch", "Micro-experiment 7", 28);
    addText(slide, "architecture → operations", { left: 50, top: 164, width: 270, height: 32 }, 19, { color: BLUE, bold: true, align: "center" });
    addText(slide, "precision → numeric levels", { left: 345, top: 164, width: 270, height: 32 }, 19, { color: ORANGE, bold: true, align: "center" });
    addText(slide, "pruning → stored weights / channels", { left: 640, top: 164, width: 270, height: 32 }, 19, { color: GREEN, bold: true, align: "center" });
    addCode(slide, "ros2 param set /cnn_ops \\\n  quantization_levels 4\n\nros2 topic echo \\\n  /perception/cnn_ops_report --once &\n\n./publish_cnn_patch.sh", { left: 52, top: 216, width: 345, height: 205 }, { size: 14 });
    await addImage(slide, `${LAB_OUT}/quantization_result_4.png`, "Executed quantization experiment comparing a normalized activation map with a four-level approximation and its absolute error.", { left: 420, top: 210, width: 480, height: 220 }, "contain");
    addBox(slide, "Report: levels=4  •  mean_error increases  •  quantization_result.png", { left: 145, top: 436, width: 670, height: 50 }, { fill: PALE, border: CYAN, size: 16, color: BLUE });
    addText(slide, "Parameter → resend input → new report + new image", { left: 180, top: 490, width: 600, height: 20 }, 16, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("Students keep cnn_ops_node running, change quantization_levels, start echo --once on /perception/cnn_ops_report, and republish the same 8×8 patch. The node only recomputes after the input arrives. Four levels produce a coarser approximation and a larger mean error than sixteen. ReLU zeros activations; quantization changes numeric precision; neither operation prunes stored weights.", [MOBILENET, PRUNING, ROS_GUIDE, `${LAB}/publish_cnn_patch.sh`, `${ROS_PACKAGE}/cv_lab/cnn_ops_node.py`, `${LAB_OUT}/quantization_result_4.png`, ROS_PARAM_DOC]));
  }

  // Slide 25
  {
    const slide = contentSlides.getItem(24);
    contentSetup(slide, 25, "NMS keeps one box when predictions overlap", "Object detection", 36);
    addText(slide, "before: two predictions", { left: 70, top: 170, width: 260, height: 32 }, 21, { color: RED, bold: true, align: "center" });
    addOutline(slide, { left: 98, top: 224, width: 190, height: 155 }, BORDER, 1.4, "nms-image-frame");
    addOutline(slide, { left: 130, top: 245, width: 105, height: 105 }, RED, 3, "nms-box-high");
    addOutline(slide, { left: 150, top: 262, width: 105, height: 105 }, ORANGE, 3, "nms-box-low");
    addText(slide, "0.92", { left: 112, top: 219, width: 75, height: 28 }, 19, { color: RED, bold: true });
    addText(slide, "0.81", { left: 238, top: 343, width: 75, height: 28 }, 19, { color: ORANGE, bold: true });
    addText(slide, "IoU = intersection / union", { left: 355, top: 218, width: 260, height: 40 }, 22, { color: BLUE, bold: true, align: "center" });
    addBox(slide, "IoU = 0.65", { left: 390, top: 278, width: 190, height: 68 }, { fill: PALE, border: CYAN, size: 28, color: BLUE });
    addText(slide, "0.65 > threshold 0.50", { left: 370, top: 359, width: 230, height: 34 }, 20, { color: RED, bold: true, align: "center" });
    addText(slide, "after: keep highest score", { left: 645, top: 170, width: 260, height: 32 }, 21, { color: GREEN, bold: true, align: "center" });
    addOutline(slide, { left: 680, top: 224, width: 190, height: 155 }, BORDER, 1.4, "nms-output-frame");
    addOutline(slide, { left: 720, top: 245, width: 105, height: 105 }, GREEN, 4, "nms-kept-box");
    addText(slide, "keep 0.92", { left: 710, top: 355, width: 130, height: 32 }, 20, { color: GREEN, bold: true, align: "center" });
    addBox(slide, "Sort by score  →  keep highest  →  suppress lower-score boxes with large IoU", { left: 120, top: 422, width: 720, height: 58 }, { fill: "#FFFFFF", border: BORDER, size: 21, color: NAVY });
    setNotes(slide, notes("Work the displayed pair. The overlap is large enough that IoU is about 0.65, above the 0.50 threshold. NMS retains the 0.92 box and suppresses the 0.81 duplicate. The companion exercise repeats the same logic with four supplied boxes.", [YOLO, FASTER_RCNN, LAB_NOTEBOOK, `${LAB}/inputs/boxes.csv`]));
  }

  // Slide 26
  {
    const slide = contentSlides.getItem(25);
    contentSetup(slide, 26, "Detection adds localization and duplicate removal to CNN features", "Object detection", 30);
    addText(slide, "One-stage detector", { left: 70, top: 170, width: 380, height: 32 }, 22, { color: BLUE, bold: true, align: "center" });
    const oneA = addBox(slide, "Backbone / FPN", { left: 55, top: 224, width: 130, height: 58 }, { fill: PALE, border: CYAN, size: 18 });
    const oneB = addBox(slide, "Dense class + box\npredictions", { left: 220, top: 216, width: 145, height: 74 }, { fill: "#EAF5E6", border: GREEN, size: 18 });
    const oneC = addBox(slide, "NMS", { left: 400, top: 224, width: 75, height: 58 }, { fill: "#FFF1E4", border: ORANGE, size: 18 });
    connect(slide, oneA, oneB); connect(slide, oneB, oneC);
    addText(slide, "YOLO-style: predict at many feature-map locations", { left: 65, top: 305, width: 390, height: 42 }, 18, { color: SLATE, align: "center" });
    addText(slide, "Two-stage detector", { left: 515, top: 170, width: 380, height: 32 }, 22, { color: ORANGE, bold: true, align: "center" });
    const twoA = addBox(slide, "CNN\nbackbone", { left: 500, top: 216, width: 105, height: 74 }, { fill: PALE, border: CYAN, size: 17 });
    const twoB = addBox(slide, "Region proposals", { left: 630, top: 224, width: 125, height: 58 }, { fill: "#FFF1E4", border: ORANGE, size: 17 });
    const twoC = addBox(slide, "ROI classify +\nrefine box", { left: 780, top: 216, width: 125, height: 74 }, { fill: "#EAF5E6", border: GREEN, size: 17 });
    connect(slide, twoA, twoB); connect(slide, twoB, twoC);
    addText(slide, "Faster R-CNN-style: propose regions, then refine", { left: 510, top: 305, width: 380, height: 42 }, 18, { color: SLATE, align: "center" });
    addBox(slide, "Both learn class scores + box regression, then remove duplicate boxes.", { left: 165, top: 370, width: 630, height: 58 }, { fill: "#FFFFFF", border: BORDER, size: 21, color: NAVY });
    addText(slide, "Final causal chain: dense cost → convolution   |   linear stack → ReLU   |   dead unit → leaky ReLU   |   deployment cost → compression", { left: 75, top: 444, width: 810, height: 42 }, 18, { color: BLUE, bold: true, align: "center", valign: "middle" });
    setNotes(slide, notes("Contrast the architectures. A one-stage detector predicts class and box outputs densely. A two-stage detector first proposes regions, then classifies and refines them. Both can produce overlapping candidates and therefore use duplicate removal such as non-maximum suppression.", [YOLO, FASTER_RCNN, LECTURE5]));
  }

  // Slide 27
  {
    const slide = contentSlides.getItem(26);
    contentSetup(slide, 27, "Create the ROS 2 package before the first perception experiment", "Hands-on setup", 30);
    addText(slide, "1  Create", { left: 60, top: 166, width: 150, height: 32 }, 22, { color: ORANGE, bold: true });
    addCode(slide, "mkdir -p ~/cv_ws/src\ncd ~/cv_ws/src\nros2 pkg create --build-type ament_python \\\n  --dependencies rclpy std_msgs \\\n  ament_index_python \\\n  --node-name digit_recognizer_node \\\n  cv_lab", { left: 55, top: 205, width: 480, height: 205 }, { size: 15 });
    addText(slide, "2  Build + source", { left: 585, top: 166, width: 250, height: 32 }, 22, { color: BLUE, bold: true });
    addCode(slide, "cd ~/cv_ws\ncolcon build --symlink-install\nsource install/setup.bash\nros2 pkg executables \\\n  cv_lab", { left: 575, top: 205, width: 330, height: 160 }, { size: 16 });
    addText(slide, "package.xml  •  setup.py  •  resource/  •  cv_lab/*.py", { left: 105, top: 418, width: 750, height: 28 }, 19, { color: GREEN, bold: true, align: "center" });
    addBox(slide, "Nothing is submitted: create, run, inspect data, visualize, change, and rerun.", { left: 115, top: 454, width: 730, height: 42 }, { fill: "#EAF5E6", border: GREEN, size: 19, color: NAVY });
    setNotes(slide, notes("Students create their own ament_python package first. The student download contains a tested package skeleton, complete publisher test harnesses, and numbered TODOs, but no perception implementations. The completed nodes remain in the instructor-only answer folder. Remind ROS 2 Humble users to deactivate Conda before sourcing ROS 2.", [ROS_GUIDE, DATA_README, ROS_PACKAGE, `${ANSWERS}/README.md`, ROS_PACKAGE_DOC]));
  }

  // Slide 28
  {
    const slide = contentSlides.getItem(27);
    contentSetup(slide, 28, "Try it now: send a 10×10 digit and echo the prediction", "Micro-experiment 1", 30);
    addText(slide, "ROS 2 message flow", { left: 50, top: 166, width: 360, height: 30 }, 20, { color: BLUE, bold: true, align: "center" });
    const input = addBox(slide, "CLI publisher\n10×10 matrix", { left: 55, top: 225, width: 135, height: 72 }, { fill: PALE, border: CYAN, size: 18 });
    const recognizer = addBox(slide, "projection features\nnearest prototype", { left: 235, top: 225, width: 160, height: 72 }, { fill: "#FFF1E4", border: ORANGE, size: 18 });
    connect(slide, input, recognizer);
    addText(slide, "/perception/digit_matrix", { left: 77, top: 312, width: 300, height: 28 }, 14, { color: SLATE, typeface: "Courier New", align: "center" });
    addText(slide, "Terminal 1 — run the subscriber/publisher node", { left: 450, top: 166, width: 440, height: 30 }, 18, { color: ORANGE, bold: true });
    addCode(slide, "ros2 run cv_lab \\\n  digit_recognizer_node", { left: 445, top: 201, width: 450, height: 66 }, { size: 16 });
    addText(slide, "Terminal 2 — observe the output before sending input", { left: 450, top: 280, width: 440, height: 30 }, 18, { color: BLUE, bold: true });
    addCode(slide, "ros2 topic echo \\\n  /perception/digit_prediction --once", { left: 445, top: 315, width: 450, height: 66 }, { size: 16 });
    addText(slide, "Terminal 3 — choose one supplied matrix", { left: 65, top: 367, width: 350, height: 30 }, 18, { color: GREEN, bold: true });
    addCode(slide, "cd '2026/Labs/ClassicalCV/student'\n./publish_digit.sh 3", { left: 55, top: 401, width: 390, height: 70 }, { size: 14 });
    addBox(slide, "Expected topic output\ndata: 3", { left: 485, top: 404, width: 180, height: 68 }, { fill: "#EAF5E6", border: GREEN, size: 20, color: GREEN });
    addText(slide, "View the received matrix", { left: 690, top: 395, width: 205, height: 27 }, 17, { color: BLUE, bold: true, align: "center" });
    addCode(slide, "xdg-open /tmp/cv_lab/\ndigit_received.png", { left: 680, top: 426, width: 225, height: 58 }, { size: 12 });
    setNotes(slide, notes("Students use three sourced terminals. First run digit_recognizer_node. Second start ros2 topic echo on /perception/digit_prediction with --once. Third run publish_digit.sh 3; the helper reads digit_3.csv, verifies 100 values, flattens the matrix, and executes ros2 topic pub --once on /perception/digit_matrix. The recognizer reshapes the message to 10×10, saves digit_received.png, computes ten row counts, ten column counts, and four quadrant counts, compares that hand-crafted descriptor with all ten class prototypes, and publishes Int32 data: 3. Repeat with 7, 0, and 9.", [ROS_GUIDE, DATA_README, `${LAB}/publish_digit.sh`, `${LAB}/inputs/digit_3.csv`, `${ROS_PACKAGE}/cv_lab/digit_recognizer_node.py`, ROS_PUBSUB_DOC]));
  }

  // Slide 29
  {
    const slide = contentSlides.getItem(28);
    contentSetup(slide, 29, "Try it now: publish a road image and echo the line count", "Micro-experiment 3", 29);
    addText(slide, "Terminal 1 — keep the node running", { left: 55, top: 170, width: 380, height: 28 }, 18, { color: ORANGE, bold: true });
    addCode(slide, "ros2 run cv_lab \\\n  classical_vision_node", { left: 50, top: 202, width: 400, height: 62 }, { size: 15 });
    addText(slide, "Terminal 2 — observe one result", { left: 55, top: 279, width: 380, height: 28 }, 18, { color: BLUE, bold: true });
    addCode(slide, "ros2 topic echo \\\n  /perception/line_report --once", { left: 50, top: 311, width: 400, height: 62 }, { size: 15 });
    addText(slide, "Terminal 3 — send the supplied input path", { left: 55, top: 388, width: 390, height: 28 }, 18, { color: GREEN, bold: true });
    addCode(slide, "./publish_road.sh", { left: 50, top: 420, width: 400, height: 50 }, { size: 16 });
    addText(slide, "Change, then repeat the same publication", { left: 520, top: 168, width: 380, height: 34 }, 17, { color: RED, bold: true, align: "center" });
    addCode(slide, "ros2 param set /classical_vision \\\n  canny_low 100\nros2 param set /classical_vision \\\n  canny_high 200\nros2 param set /classical_vision \\\n  hough_threshold 80\n\nros2 topic echo \\\n  /perception/line_report --once &\n./publish_road.sh", { left: 510, top: 208, width: 390, height: 220 }, { size: 13 });
    addBox(slide, "Input arrival → Canny + ROI + Hough → /line_report + line_result.png", { left: 500, top: 446, width: 410, height: 44 }, { fill: PALE, border: CYAN, size: 15, color: BLUE });
    setNotes(slide, notes("Students keep classical_vision_node running, start echo --once on /perception/line_report, and run publish_road.sh. The helper publishes the absolute path of the supplied road image as a ROS String. The node loads and processes that exact input once, publishes the thresholds and line count, and saves line_result.png. After changing Canny or Hough parameters, students must start another observer and republish the image to create a new result.", [OPENCV_SOBEL, OPENCV_HOUGH, ROS_GUIDE, `${LAB}/publish_road.sh`, `${LAB}/inputs/road.png`, `${ROS_PACKAGE}/cv_lab/classical_vision_node.py`, ROS_PARAM_DOC]));
  }

  // Slide 30
  {
    const slide = contentSlides.getItem(29);
    contentSetup(slide, 30, "The node saves the stages while the topic reports the numbers", "Micro-experiment 3 — result", 31);
    await addImage(slide, `${LAB_OUT}/line_result.png`, "Executed event-driven ROS 2 result showing the supplied road image, Canny edges, road-region edges, and Hough line segments.", { left: 72, top: 158, width: 816, height: 276 }, "contain");
    addBox(slide, "Default report: image=road.png  •  lines=18  •  line_result.png", { left: 155, top: 444, width: 650, height: 40 }, { fill: PALE, border: CYAN, size: 18, color: BLUE });
    setNotes(slide, notes("Pause on the executed result created by publish_road.sh. The broad Canny map includes trees, barriers, vehicles, and road texture. The ROI removes most irrelevant regions. The tested node reports eighteen Hough segments with the default parameters and saves the four stages. It does not compute until a road-image path is received.", [ROS_GUIDE, `${LAB}/publish_road.sh`, `${ROS_PACKAGE}/cv_lab/classical_vision_node.py`, `${LAB_OUT}/line_result.png`]));
  }

  // Slide 31
  {
    const slide = contentSlides.getItem(30);
    contentSetup(slide, 31, "Try it now: publish a network configuration and compare cost", "Micro-experiment 5", 28);
    await addImage(slide, `${LAB_OUT}/cnn_cost_result.png`, "Log-scaled visualization of the dense and convolutional parameter counts computed from the topic-supplied configuration.", { left: 50, top: 178, width: 430, height: 245 }, "contain");
    addText(slide, "Terminal 1", { left: 535, top: 174, width: 120, height: 28 }, 18, { color: ORANGE, bold: true });
    addCode(slide, "ros2 run cv_lab cnn_ops_node", { left: 520, top: 206, width: 380, height: 50 }, { size: 14 });
    addText(slide, "Terminal 2", { left: 535, top: 270, width: 120, height: 28 }, 18, { color: BLUE, bold: true });
    addCode(slide, "ros2 topic echo \\\n  /perception/cnn_cost_report --once", { left: 520, top: 302, width: 380, height: 62 }, { size: 14 });
    addText(slide, "Terminal 3 — publish the configuration", { left: 535, top: 377, width: 350, height: 28 }, 17, { color: GREEN, bold: true });
    addCode(slide, "./publish_cnn_config.sh 16", { left: 520, top: 409, width: 380, height: 50 }, { size: 15 });
    addBox(slide, "100,480 dense  •  160 convolution  •  628× ratio", { left: 85, top: 443, width: 390, height: 45 }, { fill: PALE, border: CYAN, size: 17, color: BLUE });
    addText(slide, "Try 32 filters → conv_params=320", { left: 550, top: 471, width: 320, height: 25 }, 16, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("Students start cnn_ops_node, start echo --once on /perception/cnn_cost_report, and run publish_cnn_config.sh 16. The helper publishes [28,28,128,3,3,1,16]. The node computes 100,480 dense parameters and 160 convolution parameters, publishes the ratio, and saves a log-scaled comparison. Running the helper with 32 sends new input and doubles only the convolution count.", [ROS_GUIDE, `${LAB}/publish_cnn_config.sh`, `${ROS_PACKAGE}/cv_lab/cnn_ops_node.py`, `${LAB_OUT}/cnn_cost_result.png`, LENET]));
  }

  // Slide 32
  {
    const slide = contentSlides.getItem(31);
    contentSetup(slide, 32, "Try it now: publish an 8×8 patch through convolution, ReLU, and pooling", "Micro-experiment 6", 27);
    await addImage(slide, `${LAB_OUT}/cnn_ops_result.png`, "Executed event-driven result showing the supplied eight-by-eight intensity patch, kernel, signed convolution response, ReLU output, and two-by-two max-pooled output.", { left: 52, top: 169, width: 856, height: 226 }, "contain");
    addText(slide, "Terminal 1", { left: 65, top: 407, width: 120, height: 26 }, 17, { color: ORANGE, bold: true });
    addCode(slide, "ros2 run cv_lab cnn_ops_node", { left: 55, top: 438, width: 310, height: 48 }, { size: 12 });
    addText(slide, "Terminal 2 — observe", { left: 385, top: 407, width: 205, height: 26 }, 17, { color: BLUE, bold: true });
    addCode(slide, "ros2 topic echo \\\n  /perception/cnn_ops_report --once", { left: 375, top: 438, width: 275, height: 48 }, { size: 12 });
    addText(slide, "Terminal 3 — publish", { left: 680, top: 407, width: 210, height: 26 }, 17, { color: GREEN, bold: true });
    addCode(slide, "./publish_cnn_patch.sh", { left: 670, top: 438, width: 235, height: 48 }, { size: 13 });
    addBox(slide, "Expected: input=8x8  •  response=8x8  •  pool=4x4  •  cnn_ops_result.png", { left: 128, top: 497, width: 704, height: 32 }, { fill: PALE, border: CYAN, size: 15, color: BLUE });
    setNotes(slide, notes("Students start cnn_ops_node, arm echo --once on /perception/cnn_ops_report, and run publish_cnn_patch.sh. The helper flattens the supplied 8×8 cnn_patch.csv into 64 integer values. Only after that message arrives does the node apply the fixed 3×3 edge kernel, ReLU, 2×2 max pooling, and quantization; it publishes the array shapes and statistics and saves cnn_ops_result.png. Students can compare the signed response with the nonnegative ReLU panel and verify that pooling changes 8×8 to 4×4.", [ROS_GUIDE, `${LAB}/publish_cnn_patch.sh`, `${LAB}/inputs/cnn_patch.csv`, `${ROS_PACKAGE}/cv_lab/cnn_ops_node.py`, `${LAB_OUT}/cnn_ops_result.png`]));
  }

  // Slide 33
  {
    const slide = contentSlides.getItem(32);
    contentSetup(slide, 33, "Try it now: publish candidate boxes, then request NMS", "Micro-experiment 8", 29);
    await addImage(slide, `${LAB_OUT}/nms_result.png`, "Executed result showing four topic-supplied candidate boxes before NMS and the retained boxes after NMS.", { left: 500, top: 174, width: 400, height: 242 }, "contain");
    addText(slide, "Terminal 1 — start the subscriber + service", { left: 52, top: 169, width: 410, height: 27 }, 17, { color: ORANGE, bold: true });
    addCode(slide, "ros2 run cv_lab \\\n  nms_service_node", { left: 47, top: 201, width: 420, height: 54 }, { size: 14 });
    addText(slide, "Terminal 2 — send the four supplied boxes", { left: 52, top: 267, width: 410, height: 27 }, 17, { color: GREEN, bold: true });
    addCode(slide, "./publish_boxes.sh", { left: 47, top: 299, width: 420, height: 46 }, { size: 14 });
    addText(slide, "Terminal 3 — observe in background, then call", { left: 52, top: 358, width: 410, height: 27 }, 16, { color: BLUE, bold: true });
    addCode(slide, "ros2 topic echo /perception/nms_report --once &\nros2 service call /perception/run_nms \\\n  example_interfaces/srv/Trigger '{}'", { left: 47, top: 390, width: 420, height: 83 }, { size: 12 });
    addBox(slide, "0.50 → kept [0, 2]  •  nms_result.png", { left: 520, top: 431, width: 360, height: 39 }, { fill: "#EAF5E6", border: GREEN, size: 18, color: GREEN });
    addText(slide, "Try 0.70, arm echo again, and call again → kept [0, 1, 2, 3]", { left: 500, top: 480, width: 400, height: 34 }, 14, { color: RED, bold: true, align: "center" });
    setNotes(slide, notes("The service deliberately refuses to run until boxes arrive. Students start nms_service_node and run publish_boxes.sh to send the four x1,y1,x2,y2,score rows as a Float32MultiArray. In Terminal 3, the ampersand keeps echo --once active in the background so the following service command can execute in the same shell. At the default IoU threshold 0.50 the node keeps [0,2], publishes the report, returns the same information in the Trigger response, and saves nms_result.png. Set iou_threshold to 0.70, arm a fresh observer, and call again; all four boxes remain.", [ROS_GUIDE, DATA_README, `${LAB}/publish_boxes.sh`, `${LAB}/inputs/boxes.csv`, `${ROS_PACKAGE}/cv_lab/nms_service_node.py`, `${LAB_OUT}/nms_result.png`, ROS_SERVICE_DOC]));
  }

  // Slide 34
  {
    const slide = contentSlides.getItem(33);
    contentSetup(slide, 34, "Finish by launching and inspecting the complete perception graph", "Synthesis", 30);
    addText(slide, "Start four executables", { left: 70, top: 165, width: 360, height: 32 }, 22, { color: ORANGE, bold: true, align: "center" });
    addCode(slide, "cd '2026/Labs/ClassicalCV/student/ws'\nsource /opt/ros/humble/setup.bash\nsource install/setup.bash\nros2 launch cv_lab \\\n  perception_lab.launch.py", { left: 55, top: 208, width: 420, height: 155 }, { size: 14 });
    addText(slide, "Inspect the ROS graph", { left: 530, top: 165, width: 360, height: 32 }, 22, { color: BLUE, bold: true, align: "center" });
    addCode(slide, "ros2 node list\nros2 topic list\nros2 service list\nros2 node info /classical_vision\nros2 topic echo \\\n  /perception/cnn_ops_report --once", { left: 525, top: 208, width: 370, height: 155 }, { size: 15 });
    const checks = [
      ["matrix → prediction", "/perception/digit_matrix → /perception/digit_prediction", BLUE],
      ["data → reports", "matrix or image path → report + PNG", ORANGE],
      ["boxes → service", "/nms_boxes → /run_nms → report + PNG", GREEN],
    ];
    checks.forEach(([kind, name, color], index) => {
      const y = 360 + index * 33;
      addText(slide, kind, { left: 115, top: y, width: 235, height: 28 }, 18, { color, bold: true, align: "right" });
      addText(slide, name, { left: 380, top: y, width: 500, height: 28 }, index === 0 ? 14 : 18, { color: NAVY, typeface: "Courier New" });
    });
    addBox(slide, "Nothing is submitted: the finish line is a running graph and a result you can explain.", { left: 125, top: 466, width: 710, height: 34 }, { fill: PALE, border: CYAN, size: 17, color: BLUE });
    setNotes(slide, notes("Close by launching the four-node graph. None of the nodes periodically manufactures results: each waits for a supplied matrix, image path, configuration, or box array. Students can arm an output observer, run any helper, and explain which callback produced which topic and PNG. Suggested checks are publish_digit.sh 6, publish_road.sh, publish_cnn_patch.sh, and publish_boxes.sh followed by the NMS service call. The goal remains observable practice rather than submission.", [ROS_GUIDE, DATA_README, `${LAB}/publish_digit.sh`, `${LAB}/publish_road.sh`, `${LAB}/publish_cnn_patch.sh`, `${LAB}/publish_boxes.sh`, `${ROS_PACKAGE}/launch/perception_lab.launch.py`]));
  }

  for (let i = 0; i < presentation.slides.items.length; i += 1) {
    const slide = physicalSlideAt(i);
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 2 });
    await fs.writeFile(`${RENDER_DIR}/${stem}.png`, new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(`${LAYOUT_DIR}/${stem}.layout.json`, await layout.text(), "utf8");
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(`${BUILD}/final-montage.webp`, new Uint8Array(await montage.arrayBuffer()));
  const inspect = await presentation.inspect({ kind: "deck,slide,textbox,shape,image,notes,layout", maxChars: 300000 });
  await fs.writeFile(`${BUILD}/final-inspect.ndjson`, inspect.ndjson, "utf8");
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL);
  console.log(JSON.stringify({ final: FINAL, slideCount: presentation.slides.items.length }, null, 2));
}

function addCards(slide, cards, top = 185, bottom = 425) {
  const gap = 18;
  const width = (840 - gap * (cards.length - 1)) / cards.length;
  cards.forEach((card, i) => {
    const x = 60 + i * (width + gap);
    addBox(slide, card[0], { left: x, top, width, height: 46 }, { fill: card[2] ?? PALE, border: card[3] ?? CYAN, size: 20, color: card[4] ?? BLUE });
    addText(slide, card[1], { left: x + 4, top: top + 56, width: width - 8, height: bottom - top - 58 }, card[5] ?? 19, { color: NAVY, align: "center", valign: "middle" });
  });
}

function addTakeaway(slide, text, color = BLUE) {
  addBox(slide, text, { left: 105, top: 454, width: 750, height: 40 }, { fill: PALE, border: color, size: 18, color });
}

function addFlow(slide, stages, top = 230) {
  const width = Math.min(160, (790 - (stages.length - 1) * 38) / stages.length);
  const used = stages.length * width + (stages.length - 1) * 38;
  const start = (960 - used) / 2;
  const nodes = stages.map((stage, i) => addBox(slide, stage, { left: start + i * (width + 38), top, width, height: 82 }, { fill: i % 2 ? PALE : "#FFFFFF", border: i % 2 ? CYAN : BORDER, size: 19 }));
  for (let i = 0; i < nodes.length - 1; i += 1) connect(slide, nodes[i], nodes[i + 1]);
  return nodes;
}

async function addExperiment(slide, number, title, imagePath, imageAlt, command, expected, sources, options = {}) {
  contentSetup(slide, number, title, options.section ?? "Hands-on checkpoint", options.titleSize ?? 31);
  if (imagePath) await addImage(slide, imagePath, imageAlt, { left: 54, top: 179, width: 410, height: 250 }, "contain");
  else addBox(slide, options.leftText ?? "Inspect the input\nbefore you run the node", { left: 78, top: 215, width: 355, height: 150 }, { fill: PALE, border: CYAN, size: 25, color: BLUE });
  if (options.todo) {
    addBox(slide, options.todo, { left: 495, top: 174, width: 405, height: 72 }, { fill: "#FFF7E8", border: ORANGE, size: options.todoSize ?? 15, color: NAVY, name: "Student coding task" });
    addText(slide, options.actionText ?? "Then rebuild and run one command", { left: 505, top: 250, width: 385, height: 26 }, 16, { color: ORANGE, bold: true });
    addCode(slide, command, { left: 495, top: 280, width: 405, height: 145 }, { size: options.codeSize ?? 11.8 });
  } else {
    addText(slide, "One command", { left: 505, top: 174, width: 370, height: 28 }, 19, { color: ORANGE, bold: true });
    addCode(slide, command, { left: 495, top: 207, width: 405, height: 190 }, { size: options.codeSize ?? 13.5 });
  }
  addBox(slide, expected, { left: 80, top: 443, width: 800, height: 50 }, { fill: "#FFF7E8", border: ORANGE, size: options.expectedSize ?? 17, color: NAVY });
  setNotes(slide, notes(options.cue ?? `Run the checkpoint after the concept. Students inspect the input data, arm topic echo before publishing, inspect the report, and open the generated image. Nothing is submitted.`, sources));
}

function addCommandExperiment(slide, number, title, task, actionText, command,
                              expected, sources, options = {}) {
  contentSetup(slide, number, title, options.section ?? "Hands-on checkpoint",
               options.titleSize ?? 31);
  addBox(slide, task, { left: 70, top: 157, width: 820, height: 55 }, {
    fill: "#FFF7E8", border: ORANGE, size: options.taskSize ?? 15,
    color: NAVY, name: "Student coding task",
  });
  addText(slide, actionText, { left: 80, top: 218, width: 800, height: 25 },
          16, { color: ORANGE, bold: true, align: "center" });
  addCode(slide, command, { left: 70, top: 247, width: 820, height: 188 }, {
    size: options.codeSize ?? 9.2,
  });
  addBox(slide, expected, { left: 80, top: 443, width: 800, height: 50 }, {
    fill: "#FFF7E8", border: ORANGE, size: options.expectedSize ?? 15,
    color: NAVY,
  });
  setNotes(slide, notes(options.cue, sources));
}

async function prepareDeck(starter, root) {
  await fs.rm(`${root}/final-render`, { recursive: true, force: true });
  await fs.rm(`${root}/final-layout`, { recursive: true, force: true });
  await fs.mkdir(`${root}/final-render`, { recursive: true });
  await fs.mkdir(`${root}/final-layout/final`, { recursive: true });
  pageNumberForContent = (n) => n;
  return PresentationFile.importPptx(await FileBlob.load(starter));
}

async function finishDeck(presentation, finalPath, root) {
  for (let i = 0; i < presentation.slides.items.length; i += 1) {
    const slide = presentation.slides.getItem(i);
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(`${root}/final-render/${stem}.png`, new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(`${root}/final-layout/final/${stem}.layout.json`, await layout.text(), "utf8");
  }
  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(`${root}/final-montage.webp`, new Uint8Array(await montage.arrayBuffer()));
  const inspect = await presentation.inspect({ kind: "deck,slide,textbox,shape,image,notes,layout", maxChars: 600000 });
  await fs.writeFile(`${root}/final-inspect.ndjson`, inspect.ndjson, "utf8");
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(finalPath);
}

function setCover(slide, courseTitle, subtitleText, cue, sources) {
  const title = slide.shapes.items[0];
  const subtitle = slide.shapes.items[1];
  return addImage(slide, `${IMG}/cover-perception.png`, "Autonomous-driving perception illustration.", { left: 540, top: 0, width: 420, height: 540 }, "cover").then(() => {
    title.position = { left: 64, top: 94, width: 430, height: 210 };
    title.text.set([
      { spaceAfter: 10, runs: [{ run: "CISC 647", textStyle: { fontSize: "21px", bold: true, color: "#9FD5F2", typeface: "Arial" } }] },
      { runs: [{ run: courseTitle, textStyle: { fontSize: "38px", bold: true, color: "#FFFFFF", typeface: "Arial" } }] },
    ]);
    title.text.style = { alignment: "left", verticalAlignment: "middle", autoFit: "shrinkText", insets: { top: 0, right: 8, bottom: 0, left: 0 } };
    subtitle.position = { left: 66, top: 320, width: 420, height: 116 };
    subtitle.text.set([
      { spaceAfter: 8, runs: [{ run: "LECTURE PERCEPTION", textStyle: { fontSize: "18px", bold: true, color: ORANGE, typeface: "Arial" } }] },
      { spaceAfter: 8, runs: [{ run: subtitleText, textStyle: { fontSize: "20px", bold: true, color: "#FFFFFF", typeface: "Arial" } }] },
      { runs: [{ run: "Fall 2026", textStyle: { fontSize: "16px", color: "#D7E7F2", typeface: "Arial" } }] },
    ]);
    subtitle.text.style = { alignment: "left", verticalAlignment: "top", autoFit: "shrinkText", insets: { top: 0, right: 8, bottom: 0, left: 0 } };
    setNotes(slide, notes(cue, sources));
  });
}

async function buildClassicalLegacy() {
  const root = `${BUILD}/classical`;
  const final = process.env.FINAL_PPTX ?? `${ROOT}/2026/Presentations/Lecture 2 Perception - Classical Computer Vision.pptx`;
  const p = await prepareDeck(CLASSICAL_STARTER, root);
  const s = (n) => p.slides.getItem(n - 1);

  await setCover(s(1), "Perception:\nClassical Computer\nVision", "Pixels → features → geometry → detections", "Introduce one cumulative pipeline. Every operation will be paired with a small ROS 2 checkpoint whose input, output topic, and visualization are visible in the deck.", [TEMPLATE, LECTURE2, "OpenAI ImageGen: autonomous-driving perception hero illustration"]);

  contentSetup(s(2), 2, "Today we build one classical detector, step by step", "Learning path", 34);
  addFlow(s(2), ["Pixels\narrays", "Clean\nmask", "Measure\nedges", "Vote for\nlines", "Detect\nobjects"], 215);
  addTakeaway(s(2), "At each arrow: predict → publish supplied data → echo the report → inspect the image.");
  setNotes(s(2), notes("Use this as the navigation map. The order follows data dependencies rather than a historical list of algorithms.", [LECTURE2, ROS_GUIDE, DATA_README]));

  contentSetup(s(3), 3, "Create the package shell; then add ROS + perception checkpoints", "ROS 2 setup", 30);
  addCode(s(3), "# From the extracted student folder\nexport CV_STARTER_DIR=\"$PWD/ws/src/cv_lab\"\nmkdir -p ~/cv_ws/src && cd ~/cv_ws/src\nsource /opt/ros/humble/setup.bash\nros2 pkg create --build-type ament_python \\\n  --dependencies rclpy std_msgs example_interfaces \\\n  ament_index_python cv_lab\ncp -r \"$CV_STARTER_DIR\"/. cv_lab/\ncd ~/cv_ws && colcon build --symlink-install", { left: 75, top: 174, width: 810, height: 192 }, { size: 13.2 });
  addCards(s(3), [["1  Create", "make the ROS package shell", PALE], ["2  Write", "ROS interface + CV operation", "#FFF7E8", ORANGE], ["3  Observe", "publish → echo → open PNG", "#EEF7EA", GREEN]], 375, 447);
  const downloadLabel = "Download the short-path student lab, data, and result images from Google Drive";
  const download = addBox(s(3), downloadLabel, { left: 165, top: 454, width: 630, height: 40 }, { fill: PALE, border: CYAN, size: 18, color: BLUE, name: "Student files Drive link" });
  download.text.get(downloadLabel).link = { uri: HANDS_ON_DRIVE, isExternal: true };
  download.text.get(downloadLabel).underline = "sng";
  setNotes(s(3), notes("Students create the ament_python package shell themselves, inspect it, and then copy in the supplied non-assessed scaffolding. At each orange checkpoint they write only the ROS interface, the focused perception operation, and the publish call. Data loading, validation, reshaping, reporting, error handling, and PNG visualization are supplied.", [HANDS_ON_DRIVE, ROS_PACKAGE_DOC, ROS_PUBSUB_DOC, ROS_GUIDE, `${ROS_PACKAGE}/package.xml`, `${ROS_PACKAGE}/setup.py`, `${ANSWERS}/README.md`]));

  contentSetup(s(4), 4, "An image is a sampled function stored as an array", "Pixels and features", 35);
  const digit = [[0,0,1,1,1,1,1,1,0,0],[0,0,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,1,1,0],[0,0,0,0,0,0,0,1,1,0],[0,0,1,1,1,1,1,1,1,0],[0,0,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,1,1,0],[0,0,0,0,0,0,0,1,1,0],[0,0,1,1,1,1,1,1,1,0],[0,0,1,1,1,1,1,1,0,0]];
  addGrid(s(4), 90, 184, 10, 10, 25, digit, { name: "digit-three", on: NAVY });
  addBox(s(4), "Shape", { left: 430, top: 184, width: 135, height: 44 }, { fill: PALE, border: CYAN, size: 19, color: BLUE });
  addText(s(4), "10 rows × 10 columns", { left: 575, top: 184, width: 290, height: 44 }, 20, { color: NAVY, valign: "middle" });
  addBox(s(4), "Value", { left: 430, top: 248, width: 135, height: 44 }, { fill: "#FFF7E8", border: ORANGE, size: 19, color: ORANGE });
  addText(s(4), "0 = background   •   1 = foreground", { left: 575, top: 248, width: 310, height: 44 }, 19, { color: NAVY, valign: "middle" });
  addBox(s(4), "Message", { left: 430, top: 312, width: 135, height: 44 }, { fill: "#EEF7EA", border: GREEN, size: 19, color: GREEN });
  addText(s(4), "Int32MultiArray carries 100 values", { left: 575, top: 312, width: 310, height: 44 }, 19, { color: NAVY, valign: "middle" });
  addText(s(4), "Keep row order: index = row × width + column", { left: 430, top: 398, width: 455, height: 42 }, 20, { color: BLUE, bold: true, align: "center" });
  setNotes(s(4), notes("Read a few pixels by row and column, then flatten the array. This concrete representation prevents the later feature equations from feeling detached from data.", [`${LAB}/inputs/digit_3.csv`, DATA_README]));

  contentSetup(s(5), 5, "Projection histograms turn 100 pixels into 20 counts", "Handcrafted features", 33);
  addGrid(s(5), 65, 183, 10, 10, 23, digit, { name: "digit-projection", on: NAVY });
  const rowSums = [6,7,2,2,7,7,2,2,7,6];
  rowSums.forEach((v, i) => addLine(s(5), 325, 194 + i * 23, 325 + v * 21, 194 + i * 23, CYAN, 8, `row-${i}`));
  addHistogram(s(5), [0,0,6,6,6,6,6,10,8,0], 620, 235, 260, 160, ORANGE, "columns");
  addCaption(s(5), "10 row counts", 312, 430, 220, BLUE);
  addCaption(s(5), "10 column counts", 635, 410, 230, ORANGE);
  addTakeaway(s(5), "Descriptor = what we choose to preserve; classifier = how we compare descriptors.");
  setNotes(s(5), notes("Compute two projection histograms. Contrast this with a global two-bin intensity histogram: projection counts retain some location, but not the complete shape.", [`${LAB}/inputs/digit_3.csv`, `${LAB_OUT}/projection_histograms.png`, "Instructor-created projection-histogram calculation"]));

  await addExperiment(s(6), 6, "Try it: publish a 10×10 digit and echo its class", `${LAB_OUT}/digit_received.png`, "Received 10 by 10 digit matrix and projection-count result.", "# T1\nros2 run cv_lab digit_recognizer_node\n# T2\nros2 topic echo /perception/digit_report --once\n# T3\n./publish_digit.sh 3", "Expected: prediction=3; distance_to_3=0; then open digit_received.png", [ROS_GUIDE, `${LAB}/publish_digit.sh`, `${LAB}/inputs/digit_3.csv`, `${ROS_PACKAGE}/cv_lab/digit_recognizer_node.py`, `${LAB_OUT}/digit_received.png`], { todo: "OPEN digit_recognizer_node.py\nCOMPLETE TODOs: DIGIT-ROS • DIGIT-CV • DIGIT-PUB" });

  contentSetup(s(7), 7, "All three look like 3—but their count vectors disagree", "Handcrafted-feature failure", 31);
  const shiftedThree = [[0,1,1,1,1,1,1,0,0,0],[0,1,1,1,1,1,1,1,0,0],[0,0,0,0,0,0,1,1,0,0],[0,0,0,0,0,0,1,1,0,0],[0,1,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,0,0],[0,0,0,0,0,0,1,1,0,0],[0,0,0,0,0,0,1,1,0,0],[0,1,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,0,0,0]];
  const thickThree = [[0,0,1,1,1,1,1,1,1,0],[0,0,1,1,1,1,1,1,1,1],[0,0,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,1,1,1],[0,0,1,1,1,1,1,1,1,1],[0,0,1,1,1,1,1,1,1,1],[0,0,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,1,1,1],[0,0,1,1,1,1,1,1,1,1],[0,0,1,1,1,1,1,1,1,1]];
  const thinThree = [[0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,1,1,1,0,0],[0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,0,0],[0,0,1,1,1,1,1,1,0,0],[0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,0,0],[0,0,1,1,1,1,1,1,0,0]];
  [[shiftedThree, 88, "shifted", "48 pixels → predicts 2*", BLUE], [thickThree, 355, "thick", "69 pixels → predicts 9", ORANGE], [thinThree, 622, "thin", "24 pixels → predicts 7", GREEN]].forEach(([matrix, x, label, result, color]) => {
    addGrid(s(7), x, 184, 10, 10, 19, matrix, { name: `${label}-three`, on: color });
    addText(s(7), label, { left: x - 5, top: 382, width: 200, height: 28 }, 19, { color, bold: true, align: "center" });
    addText(s(7), result, { left: x - 25, top: 411, width: 240, height: 30 }, 17, { color: NAVY, bold: true, align: "center" });
  });
  addTakeaway(s(7), "*The shifted 3 keeps 48 foreground pixels, but its projection vector ties digits 2 and 5—not 3.", RED);
  setNotes(s(7), notes("Treat all three matrices as human-readable examples of the class 3. The shifted version preserves the total foreground count but moves evidence between columns. Dilation changes stroke thickness; thinning changes nearly every count. The stored-template projection descriptor therefore predicts 2 (tied with 5), 9, and 7. This is the concrete invariance failure students should observe before morphology.", [`${LAB}/inputs/digit_variants/digit_3_shifted.csv`, `${LAB}/inputs/digit_variants/digit_3_thick.csv`, `${LAB}/inputs/digit_variants/digit_3_thin.csv`, `${ROS_PACKAGE}/cv_lab/digit_recognizer_node.py`]));

  contentSetup(s(8), 8, "Try it: publish three valid 3s and watch the naïve count classifier fail", "Hands-on checkpoint", 28);
  addCode(s(8), "# T1 — run once\nros2 run cv_lab digit_recognizer_node\n\n# T2 — restart before each input\nros2 topic echo /perception/digit_report --once\n\n# T3 — publish one variant at a time\n./publish_digit_variant.sh shifted\n./publish_digit_variant.sh thick\n./publish_digit_variant.sh thin", { left: 65, top: 176, width: 500, height: 270 }, { size: 15.5 });
  addText(s(8), "Expected reports", { left: 610, top: 176, width: 270, height: 32 }, 21, { color: ORANGE, bold: true, align: "center" });
  addBox(s(8), "shifted 3\nprediction=2\nbest_matches=[2,5]\ndistance_to_3=32", { left: 600, top: 218, width: 290, height: 82 }, { fill: PALE, border: CYAN, size: 17, color: BLUE });
  addBox(s(8), "thick 3\nprediction=9\ndistance_to_3=63", { left: 600, top: 310, width: 290, height: 66 }, { fill: "#FFF7E8", border: ORANGE, size: 17, color: NAVY });
  addBox(s(8), "thin 3\nprediction=7\ndistance_to_3=72", { left: 600, top: 386, width: 290, height: 66 }, { fill: "#EEF7EA", border: GREEN, size: 17, color: NAVY });
  addTakeaway(s(8), "Open each reported PNG. The mistake is in the representation, not in your visual judgment.", RED);
  setNotes(s(8), notes("Students arm digit_report before every publication, then compare the visible 10 by 10 matrix with the reported count-vector match. The node preserves the simple integer prediction topic and adds a detailed String report with ties, distances, foreground count, and a unique PNG path. Nothing is submitted.", [ROS_GUIDE, `${LAB}/publish_digit_variant.sh`, `${ROS_PACKAGE}/cv_lab/digit_recognizer_node.py`]));

  contentSetup(s(9), 9, "Threshold first; then morphology changes binary shape", "Binary preprocessing", 31);
  const thresholdNode = addBox(s(9), "Threshold\nintensity → 0/1", { left: 70, top: 235, width: 155, height: 90 }, { fill: "#FFFFFF", border: BORDER, size: 21 });
  const maskNode = addBox(s(9), "Binary\nmask", { left: 275, top: 235, width: 125, height: 90 }, { fill: PALE, border: CYAN, size: 22, color: BLUE });
  connect(s(9), thresholdNode, maskNode);
  addBox(s(9), "Erode\nshrink foreground", { left: 475, top: 178, width: 175, height: 72 }, { fill: "#FFFFFF", border: BORDER, size: 19 });
  addBox(s(9), "Dilate\ngrow foreground", { left: 685, top: 178, width: 175, height: 72 }, { fill: PALE, border: CYAN, size: 19, color: BLUE });
  addBox(s(9), "Opening\nerode → dilate\nremove small specks", { left: 475, top: 275, width: 175, height: 92 }, { fill: "#EEF7EA", border: GREEN, size: 18, color: NAVY });
  addBox(s(9), "Closing\ndilate → erode\nfill small gaps", { left: 685, top: 275, width: 175, height: 92 }, { fill: "#FFF7E8", border: ORANGE, size: 18, color: NAVY });
  addLine(s(9), 400, 280, 455, 280, SLATE, 2.2, "mask-to-operations");
  addText(s(9), "choose by the mask's failure mode", { left: 450, top: 385, width: 430, height: 30 }, 19, { color: ORANGE, bold: true, align: "center" });
  addText(s(9), "Morphology can normalize some noise or stroke variation—but it does not create translation invariance.", { left: 85, top: 414, width: 790, height: 35 }, 20, { color: NAVY, bold: true, align: "center" });
  addTakeaway(s(9), "Kernel shape and size encode which variations you are willing to treat as irrelevant.");
  setNotes(s(9), notes("Connect the three digit failures to preprocessing carefully. Thresholding creates the binary mask. Erosion and dilation deliberately change stroke thickness; opening and closing can repair specific noise and gaps. They may make descriptors more stable, but a shifted digit still needs an invariant representation or alignment step.", ["https://docs.opencv.org/4.x/d7/d4d/tutorial_py_thresholding.html", OPENCV_MORPHOLOGY]));

  await addExperiment(s(10), 10, "Try it: remove one speck and fill one hole", `${LAB_OUT}/morphology_result.png`, "Opening and closing results for the binary matrices.", "# T1\nros2 run cv_lab classical_vision_node\n# T2\nros2 topic echo /perception/morphology_report --once\n# T3\n./publish_morphology.sh", "Expected: opening_removed=1; closing_filled=1; view morphology_result.png", [OPENCV_MORPHOLOGY, ROS_GUIDE, `${LAB}/publish_morphology.sh`, `${LAB}/inputs/morphology.csv`, `${LAB_OUT}/morphology_result.png`], { todo: "OPEN classical_vision_node.py\nCOMPLETE TODOs: MORPH-ROS • MORPH-CV • MORPH-PUB" });

  contentSetup(s(11), 11, "Sobel looks for sudden brightness changes", "Edges and gradients", 34);
  addText(s(11), "Brightness profile", { left: 100, top: 202, width: 240, height: 36 }, 24, { color: BLUE, bold: true, align: "center" });
  addText(s(11), "same → same → sudden jump", { left: 85, top: 241, width: 270, height: 36 }, 18, { color: SLATE, align: "center" });
  addText(s(11), "Sobel output", { left: 470, top: 202, width: 240, height: 36 }, 24, { color: ORANGE, bold: true, align: "center" });
  addText(s(11), "small → large spike → small", { left: 455, top: 241, width: 270, height: 36 }, 18, { color: SLATE, align: "center" });
  addLine(s(11), 100, 350, 340, 350, SLATE, 1.5, "profile-axis");
  addPolyline(s(11), [[105,340],[190,340],[200,290],[335,290]], BLUE, 4, "step");
  addLine(s(11), 470, 350, 710, 350, SLATE, 1.5, "derivative-axis");
  addPolyline(s(11), [[475,340],[565,340],[585,285],[605,340],[705,340]], ORANGE, 4, "peak");
  addCaption(s(11), "dark → bright", 105, 370, 230);
  addCaption(s(11), "large response at the change", 480, 370, 225);
  addTakeaway(s(11), "Sobel turns “dark next to bright” into a large edge response.");
  setNotes(s(11), notes("Begin with the visible brightness step, not calculus vocabulary. Then name the response a gradient: Gx measures left-to-right change, Gy measures top-to-bottom change, and magnitude combines them.", [OPENCV_SOBEL]));

  contentSetup(s(12), 12, "Two small Sobel filters compare left–right and top–bottom", "Edges and gradients", 31);
  addKernel(s(12), [[-1,0,1],[-2,0,2],[-1,0,1]], 145, 232, 58, "Gₓ: compare left with right");
  addKernel(s(12), [[-1,-2,-1],[0,0,0],[1,2,1]], 635, 232, 58, "Gᵧ: compare top with bottom");
  addText(s(12), "1  place the filter on a 3×3 patch", { left: 335, top: 225, width: 290, height: 34 }, 19, { color: SLATE, bold: true, align: "center" });
  addText(s(12), "2  multiply matching cells", { left: 335, top: 273, width: 290, height: 34 }, 19, { color: SLATE, bold: true, align: "center" });
  addText(s(12), "3  add the results", { left: 335, top: 321, width: 290, height: 34 }, 19, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(12), "Large Gₓ means a left/right brightness change; large Gᵧ means a top/bottom change.");
  setNotes(s(12), notes("Work one multiply-and-add example. Only after students understand the comparison, explain that this is a discrete derivative. Clarify the common orientation confusion: Gx measures change along x, so it responds strongly at a vertical brightness boundary.", [OPENCV_SOBEL]));

  contentSetup(s(13), 13, "Combine Gₓ and Gᵧ to describe one edge pixel", "Edges and gradients", 33);
  addCards(s(13), [["Strength", "How different are the two sides?\n|G| = √(Gₓ²+Gᵧ²)", PALE], ["Change direction", "Which way gets brighter?\natan2(Gᵧ,Gₓ)", "#FFF7E8", ORANGE], ["Still local", "This describes one pixel—\nnot a whole line", "#EEF7EA", GREEN]], 195, 410);
  addTakeaway(s(13), "Sobel finds edge pixels. It does not yet decide which pixels form one line.", ORANGE);
  setNotes(s(13), notes("Use a vertical boundary: brightness changes left-to-right, so the gradient arrow is horizontal while the visual edge is vertical. Gradient direction is perpendicular to edge direction. Keep this as a second-pass detail after the strength and change-direction meanings are clear.", [OPENCV_SOBEL, HOG]));

  await addExperiment(s(14), 14, "Try it: publish a 9×9 intensity step to Sobel", `${LAB_OUT}/sobel_result.png`, "Intensity matrix, Sobel Gx, Gy, magnitude, and direction.", "# T1\nros2 run cv_lab classical_vision_node\n# T2\nros2 topic echo /perception/sobel_report --once\n# T3\n./publish_sobel.sh", "Expected: max_magnitude=1020.0; peak_col=3; peak_direction_deg=0.0", [OPENCV_SOBEL, ROS_GUIDE, `${LAB}/publish_sobel.sh`, `${LAB}/inputs/sobel_matrix.csv`, `${LAB_OUT}/sobel_result.png`], { todo: "OPEN classical_vision_node.py\nCOMPLETE TODOs: SOBEL-ROS • SOBEL-CV • SOBEL-PUB" });

  contentSetup(s(15), 15, "Canny turns noisy gradients into thin connected edges", "Edges and gradients", 32);
  addFlow(s(15), ["Gaussian\nblur", "Sobel\ngradients", "Non-max\nsuppression", "Dual\nthreshold", "Hysteresis\ntracking"], 220);
  addTakeaway(s(15), "Canny cleans the Sobel responses into thin edge pixels that Hough can group.");
  setNotes(s(15), notes("Explain why each stage exists: suppress noise, estimate derivatives, thin ridges, label strong/weak edges, and retain weak edges connected to strong ones.", [OPENCV_CANNY]));

  contentSetup(s(16), 16, "Before coding, predict what the two Canny thresholds will change", "Reason before running", 30);
  addCards(s(16), [["Too low", "texture and shadows become edge pixels", "#FCEAEC", RED], ["Balanced", "lane boundaries stay connected", PALE], ["Too high", "useful lane evidence disappears", "#FFF7E8", ORANGE]], 205, 405);
  addTakeaway(s(16), "Hold this prediction; test it after LINE-ROS / CV / PUB works on slide 20.", ORANGE);
  setNotes(s(16), notes("This is deliberately prediction-only. The runnable parameter sweep comes after students implement the three focused line labels on slide 20, so the commands do not precede the relevant code checkpoint.", [OPENCV_CANNY, ROS_PARAM_DOC, `${LAB}/publish_road.sh`, `${LAB_OUT}/line_result.png`]));

  contentSetup(s(17), 17, "Hough groups edge pixels that could lie on the same line", "Hough line detection", 31);
  addFlow(s(17), ["1  edge pixels\nCanny supplies points", "2  possible lines\neach point proposes", "3  vote\nshared lines win"], 205);
  addText(s(17), "OpenCV names each possible line with (ρ, θ)", { left: 145, top: 365, width: 670, height: 34 }, 22, { color: BLUE, bold: true, align: "center" });
  addText(s(17), "ρ = distance from the origin   •   θ = angle of the line's normal", { left: 130, top: 405, width: 700, height: 30 }, 18, { color: SLATE, align: "center" });
  addTakeaway(s(17), "Sobel and Canny find points; Hough asks which points agree on one line.");
  setNotes(s(17), notes("Start with the voting story. Then introduce rho and theta as a convenient name for each candidate line. If time permits, derive rho = x cos(theta) + y sin(theta) and compare it with y=mx+b; OpenCV uses rho in pixels and theta in radians.", [OPENCV_HOUGH]));

  contentSetup(s(18), 18, "A real line creates a pile of votes in one place", "Hough line detection", 31);
  addPolyline(s(18), [[100,380],[200,310],[300,250],[400,195]], BLUE, 4, "image-line");
  [[140,352],[220,295],[330,233]].forEach((pt, i) => addCircle(s(18), pt[0], pt[1], 13, ORANGE, `edge-point-${i}`));
  addText(s(18), "image space", { left: 110, top: 412, width: 270, height: 30 }, 20, { color: BLUE, bold: true, align: "center" });
  addPolyline(s(18), [[535,215],[590,285],[640,337],[700,300],[755,215]], CYAN, 3, "sinusoid-a");
  addPolyline(s(18), [[535,275],[590,330],[640,337],[700,245],[755,330]], ORANGE, 3, "sinusoid-b");
  addPolyline(s(18), [[535,330],[590,245],[640,337],[700,330],[755,250]], GREEN, 3, "sinusoid-c");
  addCircle(s(18), 631, 328, 18, RED, "hough-peak");
  addText(s(18), "vote table: possible line → supporting pixels", { left: 485, top: 412, width: 335, height: 30 }, 18, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(18), "The highest vote is the line shared by the most edge pixels.", RED);
  setNotes(s(18), notes("Walk from three edge pixels on one image line to the red vote pile. Each colored curve represents the candidate lines proposed by one pixel; their intersection names the shared line. The Hough threshold is the minimum number of supporting votes.", [OPENCV_HOUGH]));

  contentSetup(s(19), 19, "Use HoughLinesP when you want drawable line segments", "Hough line detection", 31);
  addCards(s(19), [["HoughLines", "angle + distance\ndescribes an unlimited line", PALE], ["HoughLinesP", "two endpoints\neasier to draw on an image", "#FFF7E8", ORANGE], ["Three controls", "votes needed\nshortest segment\ngap allowed", "#EEF7EA", GREEN]], 185, 410);
  addCode(s(19), "lines = cv2.HoughLinesP(edges, 1, np.pi/180,\n                        threshold=50,\n                        minLineLength=40,\n                        maxLineGap=20)", { left: 190, top: 365, width: 580, height: 85 }, { size: 16 });
  addTakeaway(s(19), "For lane markings, endpoints are usually easier to inspect than an unlimited line.");
  setNotes(s(19), notes("Map the plain-language controls back to the code: threshold means votes needed, minLineLength means shortest segment, and maxLineGap means the largest break that can be joined. HoughLinesP is geometric voting, not a learned object detector.", [OPENCV_HOUGH, `${ROS_PACKAGE}/cv_lab/classical_vision_node.py`]));

  await addExperiment(s(20), 20, "Try it: detect lane-like segments from a road image", `${LAB_OUT}/line_result.png`, "Road image with Canny edges and probabilistic Hough segments.", "# T1\nros2 run cv_lab classical_vision_node\n# T2\nros2 topic echo /perception/line_report --once\n# T3\n./publish_road.sh", "Default input: lines=18; view /tmp/cv_lab/line_result.png", [OPENCV_HOUGH, ROS_GUIDE, `${LAB}/publish_road.sh`, `${LAB}/inputs/road.png`, `${LAB_OUT}/line_result.png`], { todo: "OPEN classical_vision_node.py\nCOMPLETE TODOs: LINE-ROS • LINE-CV • LINE-PUB" });

  contentSetup(s(21), 21, "Three settings decide which line segments survive", "Hough line detection", 30);
  addText(s(21), "Prerequisite: LINE-ROS / CV / PUB completed and rebuilt on slide 20", { left: 140, top: 166, width: 680, height: 28 }, 18, { color: ORANGE, bold: true, align: "center" });
  addCode(s(21), "ros2 param set /classical_vision hough_threshold 80\nros2 param set /classical_vision min_line_length 60\nros2 param set /classical_vision max_line_gap 10\nros2 topic echo /perception/line_report --once\n./publish_road.sh", { left: 75, top: 198, width: 810, height: 160 }, { size: 18 });
  addCards(s(21), [["votes needed ↑", "fewer lines survive", PALE], ["minimum length ↑", "ignore short edges", "#FFF7E8", ORANGE], ["gap allowed ↓", "split broken markings", "#EEF7EA", GREEN]], 360, 445);
  setNotes(s(21), notes("Change one parameter at a time, republish the same image, and write a one-sentence cause for the observed change. This is a diagnosis exercise, not a submission.", [OPENCV_HOUGH, ROS_PARAM_DOC, `${LAB}/publish_road.sh`]));

  contentSetup(s(22), 22, "A region of interest makes the geometry match the task", "Hough line detection", 32);
  addCards(s(22), [["Mask", "keep the road trapezoid\nremove sky and dashboard", PALE], ["Filter", "retain plausible slopes and positions", "#FFF7E8", ORANGE], ["Fit", "combine segments into left/right lane hypotheses", "#EEF7EA", GREEN], ["Track", "smooth estimates across frames", "#FCEAEC", RED]], 185, 410);
  addTakeaway(s(22), "Classical accuracy often comes from explicit task constraints around a simple detector.");
  setNotes(s(22), notes("Use false lines in the road image to show why Hough alone is not a lane detector. ROI, geometric filtering, and temporal tracking supply the missing assumptions.", [OPENCV_HOUGH, LECTURE5]));

  contentSetup(s(23), 23, "Classical object detection repeats a classifier across location and scale", "Object detection", 31);
  addFlow(s(23), ["Image\npyramid", "Sliding\nwindows", "Feature\ndescriptor", "Binary\nclassifier", "NMS\nmerge"], 220);
  addTakeaway(s(23), "Detection = where? + what?; classification alone answers only what?");
  setNotes(s(23), notes("Build the detector pipeline before naming HOG. Each stage solves a separate problem: scale, location, representation, score, and duplicate removal.", [HOG]));

  contentSetup(s(24), 24, "HOG pools local gradient directions into a shape descriptor", "Object detection", 31);
  addCards(s(24), [["Cells", "accumulate orientation histograms in small regions", PALE], ["Blocks", "normalize neighboring cells against illumination", "#FFF7E8", ORANGE], ["Vector", "concatenate normalized bins for an SVM", "#EEF7EA", GREEN]], 188, 410);
  addText(s(24), "gradient → orientation bin → cell histogram → block normalization → descriptor", { left: 85, top: 397, width: 790, height: 42 }, 21, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(24), "HOG preserves local shape better than projection histograms, but the design is still handcrafted.");
  setNotes(s(24), notes("Relate HOG back to Sobel magnitude and direction. Magnitudes cast weighted votes into orientation bins; block normalization improves contrast robustness.", [HOG]));

  await addExperiment(s(25), 25, "Try it: inspect sliding-window scores on the example scene", `${LAB_OUT}/window_result.png`, "Sliding windows and accepted detections on the example scene.", "# T1\nros2 run cv_lab classical_vision_node\n# T2\nros2 topic echo /perception/window_report --once\n# T3\n./publish_road.sh", "Checkpoint: compare evaluated windows, accepted boxes, and window_result.png", [HOG, ROS_GUIDE, `${LAB}/publish_road.sh`, `${LAB_OUT}/window_result.png`], { todo: "OPEN classical_vision_node.py\nCOMPLETE TODOs: WINDOW-ROS • WINDOW-CV • WINDOW-PUB" });

  contentSetup(s(26), 26, "Overlapping windows create duplicate boxes", "Object detection", 34);
  addCards(s(26), [["Score threshold", "discard weak classifier responses", PALE], ["IoU", "intersection ÷ union measures box overlap", "#FFF7E8", ORANGE], ["NMS", "keep highest score; suppress strong overlaps", "#EEF7EA", GREEN]], 190, 408);
  addText(s(26), "IoU(A,B) = area(A∩B) / area(A∪B)", { left: 190, top: 390, width: 580, height: 48 }, 27, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(26), "NMS is post-processing; it does not improve the underlying classifier.");
  setNotes(s(26), notes("Work one IoU calculation and then the greedy NMS loop. Reuse this concept later because modern detectors also require duplicate handling.", [YOLO, FASTER_RCNN]));

  await addExperiment(s(27), 27, "Try it: send boxes, call NMS, and view what survives", `${LAB_OUT}/nms_result.png`, "Input candidate boxes and boxes retained after non-maximum suppression.", "# T1\nros2 run cv_lab nms_service_node\n# T2\nros2 topic echo /perception/nms_report --once\n# T3\n./publish_boxes.sh\nros2 service call /perception/run_nms \\\n  example_interfaces/srv/Trigger {}", "Expected: candidates=4; kept=[0,2]; view /tmp/cv_lab/nms_result.png", [ROS_SERVICE_DOC, ROS_GUIDE, `${LAB}/publish_boxes.sh`, `${LAB}/inputs/boxes.csv`, `${LAB_OUT}/nms_result.png`], { codeSize: 10.8, todo: "OPEN nms_service_node.py\nCOMPLETE TODOs: NMS-ROS • NMS-IOU • NMS-CV • NMS-PUB" });

  contentSetup(s(28), 28, "Launch only the three nodes completed in this classical deck", "System integration", 31);
  const graph = addFlow(s(28), ["supplied\ndata", "ROS 2\ninput topics", "completed\nnodes", "report\ntopics", "saved\nPNGs"], 220);
  addText(s(28), "parameters change behavior while the node runs", { left: 215, top: 345, width: 530, height: 35 }, 20, { color: ORANGE, bold: true, align: "center" });
  addCode(s(28), "ros2 launch cv_lab classical_perception.launch.py\nros2 node list\nros2 topic list\nros2 service list", { left: 220, top: 390, width: 520, height: 90 }, { size: 17 });
  setNotes(s(28), notes("Launch only digit_recognizer_node, classical_vision_node, and nms_service_node—the nodes completed in this deck. The full five-node launch belongs after the CNN/transformer deck.", [ROS_GUIDE, `${ROS_PACKAGE}/launch/classical_perception.launch.py`]));

  contentSetup(s(29), 29, "Diagnose failures from upstream evidence, not the final box", "System integration", 31);
  addCards(s(29), [["No mask", "check encoding, threshold, illumination", PALE], ["No edges", "check blur and Canny thresholds", "#FFF7E8", ORANGE], ["No lines", "check ROI, votes, length, gap", "#EEF7EA", GREEN], ["Wrong object", "check descriptor invariance and negatives", "#FCEAEC", RED]], 185, 410);
  addTakeaway(s(29), "Save intermediate images: visibility turns parameter tuning into engineering.");
  setNotes(s(29), notes("Model a debugging conversation. Start from the earliest incorrect intermediate representation, then adjust one assumption at a time.", [DATA_README, `${ROS_PACKAGE}/cv_lab/classical_vision_node.py`]));

  contentSetup(s(30), 30, "What classical vision teaches—and where it strains", "Synthesis", 33);
  addCards(s(30), [["Strength", "interpretable stages\nsmall data\nfast targeted methods", PALE], ["Cost", "many task-specific assumptions and thresholds", "#FFF7E8", ORANGE], ["Pressure", "appearance, scale, clutter, and context vary together", "#FCEAEC", RED]], 188, 405);
  setNotes(s(30), notes("Close by correcting the original misconception. Convolution prunes dense spatial connectivity through locality and weight sharing. ReLU adds nonlinearity; pruning and quantization are separate efficiency techniques.", [LENET, RELU, PRUNING]));

  await finishDeck(p, final, root);
  return { final, count: p.slides.items.length };
}

async function buildClassical() {
  const root = `${BUILD}/classical`;
  const final = process.env.FINAL_PPTX ?? `${ROOT}/2026/Presentations/Lecture 2 Perception - Classical Computer Vision.pptx`;
  const p = await prepareDeck(CLASSICAL_STARTER, root);
  const physical = (n) => p.slides.getItem(n - 1);
  // Keep stable references to the original template slides before inserting the
  // Hands-on 2 continuation slide. Later insertions must not change which
  // template slide each logical lesson step edits.
  const logicalSlides = new Map();
  for (let n = 1; n <= 30; n += 1) {
    logicalSlides.set(n, physical(n <= 2 ? n : n + 2));
  }
  const s = (n) => logicalSlides.get(n);
  p.slides.insert({
    after: s(9),
    layoutId: "/ppt/slideLayouts/slideLayout2.xml",
  });
  const handsOn2Continuation = p.slides.getItem(11);
  const code = `${ROS_PACKAGE}/cv_lab`;
  const answerCode = `${ANSWERS}/ws/src/cv_lab/cv_lab`;
  const digit = [
    [0,0,1,1,1,1,1,1,0,0], [0,0,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,1,1,0], [0,0,0,0,0,0,0,1,1,0],
    [0,0,1,1,1,1,1,1,1,0], [0,0,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,1,1,0], [0,0,0,0,0,0,0,1,1,0],
    [0,0,1,1,1,1,1,1,1,0], [0,0,1,1,1,1,1,1,0,0],
  ];
  const digit2 = [
    [0,0,1,1,1,1,1,1,0,0], [0,0,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,1,1,0], [0,0,0,0,0,0,0,1,1,0],
    [0,0,1,1,1,1,1,1,1,0], [0,1,1,1,1,1,1,1,0,0],
    [0,1,1,0,0,0,0,0,0,0], [0,1,1,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,0,0], [0,0,1,1,1,1,1,1,0,0],
  ];
  const digit5 = [
    [0,0,1,1,1,1,1,1,0,0], [0,1,1,1,1,1,1,1,0,0],
    [0,1,1,0,0,0,0,0,0,0], [0,1,1,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,0,0], [0,0,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,1,1,0], [0,0,0,0,0,0,0,1,1,0],
    [0,0,1,1,1,1,1,1,1,0], [0,0,1,1,1,1,1,1,0,0],
  ];

  await setCover(
    s(1), "Perception:\nClassical Computer\nVision",
    "Digits → morphology → edges → lanes",
    "Today is one causal story. We begin with the simplest feature that can recognize a clean digit. Every failure motivates the next operation, and every operation has a ROS 2 experiment immediately after it.",
    [TEMPLATE, LECTURE2, "OpenAI ImageGen: autonomous-driving perception hero illustration"]);

  contentSetup(s(2), 2, "One question carries us from digits to roads", "Learning path", 34);
  addFlow(s(2), ["Projection\ncounts", "Local mask\nrepair", "Local edge\nmaps", "Sobel +\nCanny", "Lines +\ncurves"], 212);
  addTakeaway(s(2), "Each limitation motivates the next tool; each tool is tested before we move on.");
  setNotes(s(2), notes("Preview the entire causal chain. Do not teach these as an API list. Ask students what information the current representation loses before revealing the next method.", [LECTURE2, ROS_GUIDE, DATA_README]));

  contentSetup(physical(3), 3, "Setup 1: download and unpack the student files", "ROS 2 + OpenCV setup", 31);
  addCode(physical(3), "# 1) Download ClassicalCV_student.zip to ~/Downloads\n# 2) Open a terminal and unpack it\nmkdir -p ~/cisc647\nunzip ~/Downloads/ClassicalCV_student.zip -d ~/cisc647\n# 3) Enter the lab root and check its folders\ncd ~/cisc647/cv_lab\nls", { left: 65, top: 170, width: 500, height: 205 }, { size: 13.5 });
  addText(physical(3), "Expected short folder", { left: 610, top: 172, width: 270, height: 30 }, 19, { color: ORANGE, bold: true, align: "center" });
  addCode(physical(3), "~/cisc647/\n└── cv_lab/\n    ├── inputs/\n    ├── msg/\n    ├── outputs/\n    └── ws/src/cv_lab/", { left: 615, top: 210, width: 260, height: 132 }, { size: 13.5 });
  addBox(physical(3), "Windows + WSL", { left: 610, top: 355, width: 270, height: 38 }, { fill: "#FFF7E8", border: ORANGE, size: 18, color: ORANGE });
  addText(physical(3), "Copy the ZIP into the Linux filesystem first. Avoid long OneDrive or /mnt/c paths.", { left: 610, top: 398, width: 270, height: 45 }, 15, { color: NAVY, align: "center", valign: "middle" });
  const downloadLabel = "Open ClassicalCV_student.zip in Google Drive";
  const download = addBox(physical(3), downloadLabel, { left: 165, top: 453, width: 630, height: 42 }, { fill: PALE, border: CYAN, size: 19, color: BLUE, name: "Student files Drive link" });
  download.text.get(downloadLabel).link = { uri: HANDS_ON_DRIVE, isExternal: true };
  download.text.get(downloadLabel).underline = "sng";
  setNotes(physical(3), notes("Have students download the archive through the clickable button, unpack it under a short Linux path, and inspect the top-level folders. The archive opens as cv_lab and already contains the starter package under ws/src/cv_lab. Nothing is submitted. On WSL, building inside the Linux filesystem avoids long-path and permission problems.", [HANDS_ON_DRIVE, `${LAB}/README.md`]));

  contentSetup(physical(4), 4, "Setup 2: let rosdep install OpenCV and NumPy", "ROS 2 + OpenCV setup", 31);
  addCode(physical(4), "# 1) Source ROS 2\nsource /opt/ros/humble/setup.bash\n# 2) Install rosdep, colcon, and unzip\nsudo apt update\nsudo apt install -y python3-rosdep \\\n  python3-colcon-common-extensions unzip\n# 3) Initialize rosdep once; continue if already initialized\nsudo rosdep init\nrosdep update\n# 4) Install dependencies declared by cv_lab\ncd ~/cisc647/cv_lab/ws\nrosdep install --from-paths src --ignore-src -r -y", { left: 55, top: 165, width: 535, height: 260 }, { size: 10.9 });
  addBox(physical(4), "Key lab dependencies", { left: 625, top: 170, width: 245, height: 42 }, { fill: PALE, border: CYAN, size: 18, color: BLUE });
  addText(physical(4), "python3-opencv • python3-numpy\nrclpy • std_msgs\nament_index_python\nlaunch • launch_ros", { left: 605, top: 220, width: 285, height: 112 }, 14.5, { color: NAVY, typeface: "Courier New", align: "center", valign: "middle" });
  addBox(physical(4), "5) Verify before building", { left: 625, top: 345, width: 245, height: 40 }, { fill: "#EEF7EA", border: GREEN, size: 18, color: GREEN });
  addCode(physical(4), "which python3\npython3 -c \"import cv2,numpy,rclpy; \\\n print(cv2.__version__)\"", { left: 605, top: 392, width: 285, height: 54 }, { size: 10.5 });
  addTakeaway(physical(4), "If Python points to Anaconda/Miniconda: conda deactivate, then source ROS 2 again.", RED);
  setNotes(physical(4), notes("OpenCV's Python import name is cv2; the Ubuntu dependency that provides it is python3-opencv. rosdep reads package.xml and installs missing system dependencies. sudo rosdep init is a one-time machine step: skip it if rosdep reports that initialization already exists. If the verification imports fail and which python3 points to Conda, deactivate Conda before sourcing Humble because the ROS binary was built for Ubuntu's system Python.", [ROS_INSTALL_DOC, ROSDEP_DOC, `${ROS_PACKAGE}/package.xml`, `${LAB}/README.md`]));

  contentSetup(physical(5), 5, "Setup 3: create a practice node, then build cv_lab", "ROS 2 package practice", 28);
  addText(physical(5), "A. Create cv_practice separately", { left: 55, top: 155, width: 400, height: 32 }, 19, { color: ORANGE, bold: true, align: "center" });
  addCode(physical(5), "# 1) Make a separate scratch workspace\nsource /opt/ros/humble/setup.bash\nmkdir -p ~/pkg_practice/src\ncd ~/pkg_practice/src\n# 2) Create a Python package and starter node\nros2 pkg create cv_practice \\\n --build-type ament_python --license Apache-2.0 \\\n --node-name practice_node \\\n --dependencies rclpy std_msgs ament_index_python\n# 3) Inspect what ROS created\nfind cv_practice -maxdepth 2 -type f", { left: 50, top: 192, width: 420, height: 224 }, { size: 9.9 });
  addText(physical(5), "B. Use this block after every TODO edit", { left: 505, top: 155, width: 400, height: 32 }, 18.5, { color: BLUE, bold: true, align: "center" });
  addCode(physical(5), "# 4) Build and source the downloaded package\nsource /opt/ros/humble/setup.bash\ncd ~/cisc647/cv_lab/ws\ncolcon build --symlink-install \\\n --packages-select cv_lab\nsource install/setup.bash\ncd ..\n# 5) Confirm all executables\nros2 pkg executables cv_lab", { left: 500, top: 192, width: 410, height: 154 }, { size: 10.4 });
  addBox(physical(5), "Expected: 5 executables", { left: 555, top: 350, width: 300, height: 38 }, { fill: "#EEF7EA", border: GREEN, size: 18, color: GREEN });
  addText(physical(5), "digit_recognizer_node  •  digit_recognizer_morphology\ndigit_kernel_node  •  digit_edge_node  •  lane_detector_node", { left: 495, top: 395, width: 420, height: 44 }, 12.5, { color: NAVY, typeface: "Courier New", align: "center", valign: "middle" });
  addBox(physical(5), "For every hands-on: open 3 terminals in ~/cisc647/cv_lab. In EACH terminal, source ROS 2 and ws/install/setup.bash.", { left: 105, top: 454, width: 750, height: 40 }, { fill: PALE, border: BLUE, size: 14.5, color: BLUE });
  setNotes(physical(5), notes("Students create cv_practice and its generated practice_node in a separate scratch workspace to learn what ros2 pkg create produces. Then they build the downloaded cv_lab package rather than overwriting it. Explain package.xml as dependency metadata, setup.py as Python packaging plus console entry points, and cv_lab/ as the importable module. The blue block returns to the lab root. Before each checkpoint, every new terminal must be in that root and source both the ROS underlay and ws/install/setup.bash.", [ROS_PACKAGE_DOC, ROS_PUBSUB_DOC, `${ROS_PACKAGE}/package.xml`, `${ROS_PACKAGE}/setup.py`, `${LAB}/README.md`]));

  pageNumberForContent = (number) => number <= 2 ? number : number <= 9 ? number + 2 : number + 3;

  contentSetup(s(4), 4, "Our first image is a 10×10 binary matrix", "Pixels as data", 35);
  addGrid(s(4), 78, 176, 10, 10, 26, digit, { name: "matrix-digit-three", on: NAVY });
  addBox(s(4), "INPUT", { left: 455, top: 180, width: 150, height: 46 }, { fill: PALE, border: CYAN, size: 20, color: BLUE });
  addText(s(4), "100 integers in row order", { left: 625, top: 180, width: 245, height: 46 }, 19, { color: NAVY, valign: "middle" });
  addBox(s(4), "ROS TOPIC", { left: 455, top: 250, width: 150, height: 52 }, { fill: "#FFF7E8", border: ORANGE, size: 19, color: ORANGE });
  addText(s(4), "/perception/digit_matrix", { left: 615, top: 242, width: 275, height: 34 }, 16, { color: NAVY, typeface: "Courier New", valign: "middle" });
  addText(s(4), "Int32MultiArray", { left: 615, top: 278, width: 275, height: 30 }, 16, { color: NAVY, typeface: "Courier New", valign: "middle" });
  addBox(s(4), "GOAL", { left: 455, top: 330, width: 150, height: 46 }, { fill: "#EEF7EA", border: GREEN, size: 20, color: GREEN });
  addText(s(4), "publish a digit; echo the predicted number", { left: 625, top: 322, width: 245, height: 68 }, 18, { color: NAVY, valign: "middle" });
  addText(s(4), "index = row × 10 + column", { left: 445, top: 407, width: 425, height: 38 }, 23, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(4), "Before recognizing a digit, decide what information to keep from its pixels.");
  setNotes(s(4), notes("Read a few cells, flatten by rows, and connect the concrete matrix to the ROS message. The input is deliberately small enough to inspect by eye.", [`${LAB}/inputs/digit_3.csv`, DATA_README, `${code}/digit_recognizer_node.py`]));

  contentSetup(s(5), 5, "Naive feature: count foreground pixels along x and y", "Projection histograms", 31);
  addGrid(s(5), 55, 175, 10, 10, 23, digit, { name: "histogram-digit", on: NAVY });
  const yCounts = [6,7,2,2,7,7,2,2,7,6];
  yCounts.forEach((v, i) => addLine(s(5), 305, 186 + i * 23, 305 + v * 19, 186 + i * 23, CYAN, 8, `y-count-${i}`));
  addHistogram(s(5), [0,0,6,6,6,6,6,10,8,0], 625, 230, 250, 155, ORANGE, "x-histogram");
  addCaption(s(5), "y histogram: count each row", 292, 420, 250, BLUE);
  addCaption(s(5), "x histogram: count each column", 615, 405, 280, ORANGE);
  addTakeaway(s(5), "100 pixels become 20 counts: compact and explainable, but much shape is discarded.");
  setNotes(s(5), notes("Use x histogram to mean counts at each x coordinate, so sum down each column. Use y histogram to mean counts at each y coordinate, so sum across each row. State this convention explicitly because row/column naming often causes confusion.", [`${LAB}/inputs/digit_3.csv`, `${answerCode}/digit_recognizer_node.py`]));

  contentSetup(s(6), 6, "Recognition means: compare 20 counts with ten templates", "Nearest template", 33);
  addFlow(s(6), ["received\n10×10", "x + y\ncounts", "L1 distance\nto 0…9", "best match\nor tie", "publish digit\nor −1"], 210);
  addText(s(6), "distance = Σ |received count − template count|", { left: 150, top: 350, width: 660, height: 48 }, 28, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(6), "Equal best distances are ambiguous: publish −1 instead of silently choosing one digit.");
  setNotes(s(6), notes("This is a nearest-template classifier, not machine learning. Work one count difference and sum absolute values. A unique distance-zero match is clean success; equal minima must be reported as ambiguity. The limitation comes from the descriptor, not from ROS.", [`${answerCode}/digit_recognizer_node.py`, DATA_README]));

  await addExperiment(s(7), 7, "Hands-on 1: run and inspect the ROS graph yourself", `${LAB_OUT}/histogram_digit_3.png`, "Digit three beside its x and y projection histograms.", "# 1) TERMINAL 1 — start node; leave running\nros2 run cv_lab digit_recognizer_node --ros-args \\\n -p output_dir:=\"$PWD/outputs\"\n# 2) TERMINAL 2 — inspect; then wait for one report\nros2 node list\nros2 topic list -t\nros2 topic info /perception/digit_matrix --verbose\nros2 topic echo --once /perception/digit_report\n# 3) TERMINAL 3 — publish digit 3\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3.yaml)\"", "Echo contains prediction=3, ambiguous=false, distance=0 • Open outputs/histogram_digit.png", [ROS_GUIDE, `${LAB}/msg/d3.yaml`, `${LAB}/inputs/digit_3.csv`, `${code}/digit_recognizer_node.py`, `${LAB_OUT}/histogram_digit_3.png`], { todo: "EDIT: ws/src/cv_lab/cv_lab/\ndigit_recognizer_node.py\nTODOs: HIST-ROS • HIST-CV • HIST-PUB", todoSize: 12.5, actionText: "Run Setup 3B, then do steps 1–3.", codeSize: 7.5, titleSize: 28, expectedSize: 15.5, cue: "Students edit the exact path shown, complete the three labeled TODO sections, rebuild with the blue Setup 3B block, and then use three sourced terminals in the numbered order. Step 1 stays running. Step 2 inspects the graph and waits on echo --once. Step 3 publishes msg/d3.yaml, triggering both the node callback and the waiting echo. The node callback already contains the visualization code." });

  contentSetup(s(8), 8, "Projection counts can collide—or change under harmless variation", "Failure cases", 29);
  addGrid(s(8), 55, 183, 10, 10, 12, digit2, { name: "collision-two", on: NAVY });
  addGrid(s(8), 215, 183, 10, 10, 12, digit5, { name: "collision-five", on: NAVY });
  addCaption(s(8), "digit 2", 55, 310, 120, BLUE);
  addCaption(s(8), "digit 5", 215, 310, 120, ORANGE);
  addBox(s(8), "Different shapes, identical x/y counts\nbest_matches=[2,5] → prediction=−1", { left: 385, top: 183, width: 505, height: 92 }, { fill: "#FCEAEC", border: RED, size: 20, color: RED });
  const failures = [
    ["shifted", "−1"], ["thick", "9"],
    ["thin", "7"], ["holes", "7"], ["dots", "9"],
  ];
  for (let i = 0; i < failures.length; i += 1) {
    const [name, prediction] = failures[i];
    const x = 385 + i * 101;
    await addImage(s(8), `${LAB_OUT}/hist_fail_3_${name}.png`, `${name} digit three tested by projection histograms.`, { left: x, top: 300, width: 92, height: 62 }, "contain");
    addText(s(8), `${name} → ${prediction}`, { left: x - 3, top: 367, width: 98, height: 30 }, 13.5, { color: RED, bold: true, align: "center" });
  }
  addTakeaway(s(8), "Projection histograms lose arrangement and are sensitive to shift, width, gaps, and noise.", RED);
  setNotes(s(8), notes("First compare the clean 2 and 5: they have different pixel arrangements but the same 20 projection counts, so the node reports best_matches=[2,5] and prediction=-1. Then inspect five recognizable 3s. Shift is an alignment problem; thickness, gaps, and isolated dots are local binary-mask defects.", [`${LAB}/inputs/digit_2.csv`, `${LAB}/inputs/digit_5.csv`].concat(failures.map(([name]) => `${LAB}/inputs/digit_variants/digit_3_${name}.csv`)).concat([`${answerCode}/digit_recognizer_node.py`])));

  addCommandExperiment(s(9), 9, "Hands-on 2A: test collision, shift, and thickness",
    "NO CODE CHANGE • KEEP the Hands-on 1 node running • USE one input at a time",
    "Use Terminals 1 and 2 once. In Terminal 3, run step 3, inspect it, then run 4, then 5.",
    "# 1) TERMINAL 1 — confirm one /digit_recognizer is running\nros2 node list\n# 2) TERMINAL 2 — show every report; leave running\nros2 topic echo /perception/digit_report\n# 3) TERMINAL 3 — clean 5: histogram collision\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d5.yaml)\"\n# 4) TERMINAL 3 — shifted 3\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3_shift.yaml)\"\n# 5) TERMINAL 3 — thick 3\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3_thick.yaml)\"",
    "Steps 3–5 predict −1, −1, 9 • Inspect outputs/histogram_digit.png after EACH step • Continue to 2B",
    [ROS_GUIDE, `${LAB}/msg/d5.yaml`, `${LAB}/msg/d3_shift.yaml`, `${LAB}/msg/d3_thick.yaml`, `${LAB_OUT}/hist_collision_5.png`],
    { titleSize: 28, taskSize: 14, codeSize: 8.35, expectedSize: 13.8, cue: "Students keep the single digit_recognizer process from Hands-on 1; starting another copy would duplicate reports. Terminal 2 displays every report. In Terminal 3, students execute one numbered publish command, inspect that report and outputs/histogram_digit.png, and only then continue. The fixed filename is overwritten by the next input. They leave Terminals 1 and 2 running for Hands-on 2B." });

  addCommandExperiment(handsOn2Continuation, 9, "Hands-on 2B: test thin strokes, holes, and dots",
    "KEEP the same node and echo running • USE Terminal 3 • TEST one input at a time",
    "Run step 6, inspect the report and PNG, then run 7, then 8. Stop both running processes at step 9.",
    "# 6) TERMINAL 3 — thin 3\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3_thin.yaml)\"\n# 7) TERMINAL 3 — 3 with holes\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3_holes.yaml)\"\n# 8) TERMINAL 3 — 3 with dots\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3_dots.yaml)\"\n# 9) FINISH — press Ctrl+C in Terminal 2, then Terminal 1",
    "Steps 6–8 predict 7, 7, 9 • Inspect outputs/histogram_digit.png after EACH step • Then stop",
    [ROS_GUIDE, `${LAB}/msg/d3_thin.yaml`, `${LAB}/msg/d3_holes.yaml`, `${LAB}/msg/d3_dots.yaml`],
    { titleSize: 28, taskSize: 14, codeSize: 9.05, expectedSize: 14.2, cue: "Students continue with the same node and echo processes from Hands-on 2A. In Terminal 3, they publish one input at a time and inspect the report and overwritten PNG before moving to the next step. Step 9 stops Terminal 2 first and then Terminal 1." });
  setPage(handsOn2Continuation, 12);

  contentSetup(s(10), 10, "Which failures can preprocessing repair?", "From failure to morphology", 33);
  addCards(s(10), [["Too thick", "shrink the foreground", "#FCEAEC", RED], ["Too thin", "grow the foreground", PALE], ["Small dots", "remove isolated foreground", "#FFF7E8", ORANGE], ["Small holes", "bridge short background gaps", "#EEF7EA", GREEN]], 182, 410);
  addTakeaway(s(10), "These are local binary-shape defects, so they motivate morphology—not a new classifier.");
  setNotes(s(10), notes("Classify the observed failures by what should change in the binary mask. Keep the shifted 3 separate: local growing or shrinking does not know where the digit should be centered.", [OPENCV_MORPHOLOGY, `${LAB}/inputs/digit_variants`]));

  contentSetup(s(11), 11, "Erode shrinks; dilate grows", "Morphology", 36);
  addCards(s(11), [["Kernel", "a small neighborhood that slides over the mask", PALE], ["Erode", "keep a 1 only when the kernel fits foreground", "#FCEAEC", RED], ["Dilate", "write a 1 when the kernel touches foreground", "#EEF7EA", GREEN]], 190, 410);
  addTakeaway(s(11), "Kernel shape states which neighboring pixels should count as connected.");
  setNotes(s(11), notes("Use plain language first: erosion trims boundaries and dilation expands them. Then show that a horizontal kernel connects horizontally while a vertical kernel connects vertically.", [OPENCV_MORPHOLOGY]));

  contentSetup(s(12), 12, "Opening and closing are two-operation repairs", "Morphology", 33);
  addFlow(s(12), ["Opening", "erode\nremove small dots", "dilate\nrestore main stroke"], 190);
  addFlow(s(12), ["Closing", "dilate\nbridge small gaps", "erode\nrestore thickness"], 330);
  addText(s(12), "opening = erode → dilate", { left: 80, top: 170, width: 300, height: 30 }, 20, { color: GREEN, bold: true });
  addText(s(12), "closing = dilate → erode", { left: 80, top: 310, width: 300, height: 30 }, 20, { color: ORANGE, bold: true });
  addTakeaway(s(12), "Choose the operation from the defect; do not apply all four blindly.");
  setNotes(s(12), notes("Opening removes foreground specks smaller than the kernel. Closing fills or bridges small background gaps. The order is the meaning; neither is a universal cleanup button.", [OPENCV_MORPHOLOGY]));

  contentSetup(s(13), 13, "Morphology changes the nearest match for 0, 8, and 3", "Results", 29);
  const repairs = [["0_thick", "erode → 0"], ["8_thin", "dilate → 8"], ["3_dots", "opening → 3"], ["3_holes", "closing → 3"]];
  for (let i = 0; i < repairs.length; i += 1) {
    const [name, label] = repairs[i];
    const x = 70 + (i % 2) * 440;
    const y = 175 + Math.floor(i / 2) * 145;
    await addImage(s(13), `${LAB_OUT}/morph_${name}.png`, `${name} before and after morphology.`, { left: x, top: y, width: 380, height: 95 }, "contain");
    addText(s(13), label, { left: x, top: y + 96, width: 380, height: 24 }, 16, { color: i < 2 ? BLUE : GREEN, bold: true, align: "center" });
  }
  addTakeaway(s(13), "Same histogram classifier; only the input mask changes before counting.");
  setNotes(s(13), notes("Read each verified before/after prediction. The examples include three digit classes so students see morphology as a general mask operation, not a special trick for the digit 3.", repairs.map(([name]) => `${LAB_OUT}/morph_${name}.png`).concat([`${answerCode}/digit_recognizer_morphology.py`])));

  await addExperiment(s(14), 14, "Hands-on 3: set parameters, publish, and compare", `${LAB_OUT}/morph_3_holes.png`, "Gapped digit three after closing, with its nearest-template result.", "# 1) TERMINAL 1 — start node; leave running\nros2 run cv_lab digit_recognizer_morphology \\\n --ros-args -p output_dir:=\"$PWD/outputs\"\n# 2) TERMINAL 2 — wait for one 3-holes report\nros2 topic echo --once /perception/morph_digit_report\n# 3) TERMINAL 3 — set all four parameters first\nros2 param set /digit_recognizer_morphology operation closing\nros2 param set /digit_recognizer_morphology kernel horizontal2\nros2 param set /digit_recognizer_morphology case_name 3_holes\nros2 param set /digit_recognizer_morphology expected_digit 3\n# 4) TERMINAL 3 — publish the 3-holes matrix\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3_holes.yaml)\"\n# 5) FINISH — view PNG; Ctrl+C in Terminal 1", "Echo contains before_prediction=7, prediction=3, status=PASS • Open outputs/morph_3_holes.png", [OPENCV_MORPHOLOGY, ROS_GUIDE, `${LAB}/msg/d3_holes.yaml`, `${code}/digit_recognizer_morphology.py`, `${LAB_OUT}/morph_3_holes.png`], { todo: "EDIT: ws/src/cv_lab/cv_lab/\ndigit_recognizer_morphology.py\nTODOs: MORPH-ROS • MORPH-CV • MORPH-PUB", todoSize: 11.8, actionText: "Run Setup 3B, then do steps 1–5.", codeSize: 7.35, titleSize: 28, expectedSize: 14.5, cue: "Students edit the exact path shown, complete the three labeled TODO sections, rebuild with Setup 3B, and then use three sourced terminals in numbered order. They start the node, wait for one report, set all four parameters, and finally publish msg/d3_holes.yaml. The verified report fields are before_prediction=7, prediction=3, expected=3, and status=PASS. Figure writing already occurs inside the node callback. Step 5 stops Terminal 1 after viewing the result." });

  contentSetup(s(15), 15, "Morphology repairs masks; edge maps preserve boundary arrangement", "Why move to edges?", 29);
  addCards(s(15), [["Morphology", "repairs selected local thickness, speck, and gap defects", PALE], ["Projection counts", "still discard where boundary pieces occur", "#FCEAEC", RED], ["Local edge maps", "retain where horizontal and vertical changes occur", "#FFF7E8", ORANGE]], 190, 405);
  addTakeaway(s(15), "Alignment is separate: the later edge node supplies simple centering for translation.");
  setNotes(s(15), notes("Do not imply that morphology solves translation or that basic edge matching is automatically translation invariant. Morphology handles selected local mask defects. Projection counts still lose boundary arrangement, so local edge maps are the next representation. The later edge node recenters the foreground box as a separate classical alignment step.", [OPENCV_MORPHOLOGY, `${LAB}/inputs/digit_variants/digit_3_shifted.csv`, `${answerCode}/digit_edge_node.py`]));

  contentSetup(s(16), 16, "A kernel asks one local question by multiply-and-sum", "Basic edge kernels", 33);
  addFlow(s(16), ["place 3×3\non a patch", "multiply\nmatching cells", "add all\nproducts", "large value =\npattern found"], 220);
  addCode(s(16), "response[y,x] = Σ kernel[i,j] × image[y+i,x+j]", { left: 150, top: 350, width: 660, height: 62 }, { size: 20 });
  addTakeaway(s(16), "Unlike a histogram, a kernel preserves where a local brightness change occurs.");
  setNotes(s(16), notes("Work a small multiply-and-add example. A negative response means the opposite brightness direction; taking absolute value keeps edge strength when direction is not needed.", [OPENCV_SOBEL, `${answerCode}/digit_kernel_node.py`]));

  contentSetup(s(17), 17, "Two simple kernels reveal vertical and horizontal boundaries", "Basic edge kernels", 30);
  addKernel(s(17), [[-1,0,1],[-1,0,1],[-1,0,1]], 135, 235, 57, "left-right change → vertical edge");
  addKernel(s(17), [[-1,-1,-1],[0,0,0],[1,1,1]], 645, 235, 57, "top-bottom change → horizontal edge");
  addText(s(17), "The direction we compare is perpendicular to the visible edge.", { left: 250, top: 410, width: 460, height: 34 }, 21, { color: ORANGE, bold: true, align: "center" });
  addTakeaway(s(17), "Store both response maps and compare them with edge templates for digits 0–9.");
  setNotes(s(17), notes("Name the common orientation ambiguity carefully. A left-right derivative responds to a vertical boundary; a top-bottom derivative responds to a horizontal boundary.", [OPENCV_SOBEL, `${code}/digit_kernel_node.py`]));

  await addExperiment(s(18), 18, "Hands-on 4: publish slanted and curved digits", `${LAB_OUT}/kernel_shape_7_slanted.png`, "Slanted digit seven with vertical and horizontal kernel response maps.", "# 1) TERMINAL 1 — start node; leave running\nros2 run cv_lab digit_kernel_node --ros-args \\\n -p output_dir:=\"$PWD/outputs\"\n# 2) TERMINAL 2 — show both reports; leave running\nros2 topic echo /perception/kernel_digit_report\n# 3) TERMINAL 3 — publish the slanted 7; view PNG\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d7_slant.yaml)\"\n# 4) TERMINAL 3 — publish the curved 3; refresh PNG\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3_curve.yaml)\"\n# 5) FINISH — Ctrl+C in Terminals 2 and 1", "Reports: slanted 7→1, then curved 3→3 • Each run replaces outputs/kernel_digit.png", [ROS_GUIDE, `${LAB}/msg/d7_slant.yaml`, `${LAB}/msg/d3_curve.yaml`, `${code}/digit_kernel_node.py`, `${LAB_OUT}/kernel_shape_7_slanted.png`], { todo: "EDIT: ws/src/cv_lab/cv_lab/\ndigit_kernel_node.py\nTODOs: KERNEL-ROS • KERNEL-CV • KERNEL-PUB", todoSize: 12.5, actionText: "Run Setup 3B, then do steps 1–5.", codeSize: 7.5, titleSize: 28, expectedSize: 14.5, cue: "Students edit the exact path shown, complete the labeled TODO sections, rebuild with Setup 3B, and use three sourced terminals. Terminal 2 displays both reports. After step 3, students open outputs/kernel_digit.png before step 4 replaces it; after step 4, they refresh the file. Step 5 stops the two persistent processes." });

  contentSetup(s(19), 19, "But handwriting contains diagonal and curved strokes", "Why basic kernels are not enough", 32);
  addPolyline(s(19), [[105,390],[175,315],[245,250],[320,190]], BLUE, 10, "diagonal-stroke");
  addPolyline(s(19), [[560,195],[620,205],[685,250],[710,320],[680,390],[615,415],[555,392]], ORANGE, 10, "curved-stroke");
  addBox(s(19), "Only two directions", { left: 75, top: 175, width: 280, height: 55 }, { fill: PALE, border: CYAN, size: 23, color: BLUE });
  addBox(s(19), "Many possible directions", { left: 530, top: 175, width: 290, height: 55 }, { fill: "#FFF7E8", border: ORANGE, size: 23, color: ORANGE });
  addTakeaway(s(19), "Sobel measures any direction; Canny thins supported edges; Hough groups straight pieces.", RED);
  setNotes(s(19), notes("Connect directly to the previous result: the same slanted 7 was predicted as 1 by the basic-kernel descriptor. Sobel magnitude combines horizontal and vertical change, Canny selects thin connected edge pixels, and Hough groups only locally straight pieces. Curves still require another model.", [OPENCV_SOBEL, OPENCV_CANNY, OPENCV_HOUGH, `${LAB}/inputs/digit_variants/digit_7_slanted.csv`]));

  contentSetup(s(20), 20, "Sobel combines left-right and top-bottom change", "Sobel", 33);
  addCards(s(20), [["Gx", "left-right brightness change", PALE], ["Gy", "top-bottom brightness change", "#FFF7E8", ORANGE], ["Magnitude", "sqrt(Gx² + Gy²)\nedge strength", "#EEF7EA", GREEN], ["Direction", "atan2(Gy,Gx)\nchange direction", "#FCEAEC", RED]], 188, 410);
  addTakeaway(s(20), "A diagonal edge activates both Gx and Gy; magnitude keeps the combined strength.");
  setNotes(s(20), notes("Explain Sobel as a weighted version of the two basic directional kernels. Introduce the equations only after the left-right/top-bottom intuition.", [OPENCV_SOBEL]));

  contentSetup(s(21), 21, "Canny turns many noisy responses into thin connected edges", "Canny", 31);
  addFlow(s(21), ["blur\nreduce noise", "Sobel\nfind change", "thin\nkeep local peaks", "two thresholds\nstrong + weak", "connect\nkeep supported weak"], 215);
  addTakeaway(s(21), "Low thresholds keep clutter; high thresholds lose strokes. Inspect the edge image before tuning Hough.");
  setNotes(s(21), notes("Canny is a pipeline built on gradients. Explain hysteresis in plain terms: a weak edge survives when connected to a strong edge.", [OPENCV_CANNY]));

  contentSetup(s(22), 22, "Hough groups straight edge pixels—not curves", "Hough line detection", 31);
  addFlow(s(22), ["Canny\nedge pixels", "each pixel\nproposes lines", "shared lines\ncollect votes", "high votes\nbecome segments"], 215);
  addCode(s(22), "cv2.HoughLinesP(edges, rho=1, theta=np.pi/180,\n                    threshold=22, minLineLength=22,\n                    maxLineGap=12)", { left: 145, top: 345, width: 670, height: 86 }, { size: 16 });
  addTakeaway(s(22), "Sobel measures local change; Canny selects edge pixels; Hough groups straight evidence.");
  setNotes(s(22), notes("Use the voting story before rho and theta. HoughLinesP returns endpoints, which are easier to draw and count. Emphasize that standard HoughLinesP groups straight segments, not arbitrary curves.", [OPENCV_HOUGH]));

  await addExperiment(s(23), 23, "Hands-on 5: publish the same difficult shapes to a richer node", `${LAB_OUT}/edge_shape_7_slanted.png`, "Slanted digit seven after centering, with Sobel magnitude, Canny edges, and Hough segments.", "# 1) TERMINAL 1 — start node; leave running\nros2 run cv_lab digit_edge_node --ros-args \\\n -p output_dir:=\"$PWD/outputs\"\n# 2) TERMINAL 2 — show both reports; leave running\nros2 topic echo /perception/edge_digit_report\n# 3) TERMINAL 3 — publish the slanted 7; view PNG\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d7_slant.yaml)\"\n# 4) TERMINAL 3 — publish the curved 3; refresh PNG\nros2 topic pub --once /perception/digit_matrix \\\n std_msgs/msg/Int32MultiArray \"$(cat msg/d3_curve.yaml)\"\n# 5) FINISH — Ctrl+C in Terminals 2 and 1", "Reports: 7 with 525/6, then 3 with 1048/9 Canny pixels/Hough segments • PNG is replaced", [OPENCV_SOBEL, OPENCV_CANNY, OPENCV_HOUGH, ROS_GUIDE, `${LAB}/msg/d7_slant.yaml`, `${LAB}/msg/d3_curve.yaml`, `${code}/digit_edge_node.py`, `${LAB_OUT}/edge_shape_7_slanted.png`], { todo: "EDIT: ws/src/cv_lab/cv_lab/\ndigit_edge_node.py\nTODOs: EDGE-ROS • EDGE-CV • EDGE-PUB", todoSize: 12.5, actionText: "Run Setup 3B, then do steps 1–5.", codeSize: 7.5, titleSize: 27, expectedSize: 13.5, cue: "Students edit the exact path shown, complete the labeled TODO sections, rebuild with Setup 3B, and use three sourced terminals. Terminal 2 displays both reports. After step 3, students open outputs/edge_digit.png before step 4 replaces it; after step 4, they refresh the file. The verified reports are prediction=7, canny_pixels=525, hough_segments=6 and prediction=3, canny_pixels=1048, hough_segments=9. Step 5 stops the two persistent processes." });

  contentSetup(s(24), 24, "The same edge pipeline transfers from digits to roads", "Road transfer", 32);
  addFlow(s(24), ["road image", "grayscale\n+ blur", "Canny\nedges", "road ROI", "lines or\ncurves"], 210);
  addCards(s(24), [["Same", "local brightness boundaries", PALE], ["New", "perspective and road region", "#FFF7E8", ORANGE], ["Output", "lane boundary overlay + ROS report", "#EEF7EA", GREEN]], 340, 435);
  addTakeaway(s(24), "Classical perception succeeds by adding explicit task assumptions around general edge evidence.");
  setNotes(s(24), notes("Connect the digit and road pipelines directly. Canny still produces edge pixels; the road task adds a trapezoidal ROI and geometric lane constraints.", [OPENCV_CANNY, OPENCV_HOUGH, `${answerCode}/lane_detector_node.py`]));

  contentSetup(s(25), 25, "Straight lanes: ROI removes clutter; Hough returns segments", "Straight lanes", 30);
  await addImage(s(25), `${LAB}/inputs/road_straight.png`, "Straight highway with visible lane markings.", { left: 55, top: 175, width: 430, height: 250 }, "cover");
  addBox(s(25), "Canny", { left: 520, top: 188, width: 150, height: 64 }, { fill: PALE, border: CYAN, size: 20, color: BLUE });
  addBox(s(25), "trapezoid ROI", { left: 715, top: 188, width: 160, height: 64 }, { fill: "#FFF7E8", border: ORANGE, size: 19, color: NAVY });
  addBox(s(25), "HoughLinesP", { left: 520, top: 276, width: 150, height: 64 }, { fill: "#EEF7EA", border: GREEN, size: 18, color: NAVY });
  addBox(s(25), "slope filter", { left: 715, top: 276, width: 160, height: 64 }, { fill: "#FCEAEC", border: RED, size: 19, color: NAVY });
  addText(s(25), "Ignore sky, trees, and nearly horizontal texture", { left: 515, top: 360, width: 370, height: 48 }, 21, { color: ORANGE, bold: true, align: "center" });
  addTakeaway(s(25), "Hough detects line evidence; ROI and slope rules turn that evidence into lane hypotheses.");
  setNotes(s(25), notes("Point out false Canny edges in trees and barriers. The ROI removes most irrelevant geometry, and slope filtering rejects implausible lane directions.", [OPENCV_HOUGH, `${LAB}/inputs/road_straight.png`, `${answerCode}/lane_detector_node.py`]));

  await addExperiment(s(26), 26, "Hands-on 6: publish an image path and detect straight lanes", `${LAB_OUT}/lane_straight.png`, "Straight road input, Canny edges, ROI evidence, and Hough lane result.", "# 1) TERMINAL 1 — start node; leave running\nros2 run cv_lab lane_detector_node --ros-args \\\n -p output_dir:=\"$PWD/outputs\"\n# 2) TERMINAL 2 — inspect; then wait for one report\nros2 topic info /perception/road_image_path --verbose\nros2 topic echo --once /perception/lane_report\n# 3) TERMINAL 3 — publish road_straight.png\nros2 topic pub --once /perception/road_image_path \\\n std_msgs/msg/String \"{data: '$PWD/inputs/road_straight.png'}\"\n# 4) FINISH — view PNG; Ctrl+C in Terminal 1", "Echo contains mode=straight and hough_segments=11 • Open outputs/lane_straight.png", [OPENCV_CANNY, OPENCV_HOUGH, ROS_GUIDE, `${LAB}/inputs/road_straight.png`, `${code}/lane_detector_node.py`, `${LAB_OUT}/lane_straight.png`], { todo: "EDIT: ws/src/cv_lab/cv_lab/\nlane_detector_node.py\nTODOs: LANE-ROS • STRAIGHT-CV • LANE-PUB", todoSize: 12.2, actionText: "Run Setup 3B, then do steps 1–4.", codeSize: 7.4, titleSize: 27, expectedSize: 14.5, cue: "Students edit the exact path shown, complete the labeled TODO sections, rebuild with Setup 3B, and then use three sourced terminals. Terminal 2 inspects the input topic and waits for one report. Terminal 3 publishes the absolute path to inputs/road_straight.png. The verified report contains mode=straight and hough_segments=11. Step 4 stops Terminal 1 before students edit CURVE-CV." });

  contentSetup(s(27), 27, "A curve is not one straight Hough line", "Curved-lane limitation", 34);
  addPolyline(s(27), [[95,410],[135,350],[190,300],[260,260],[340,235]], BLUE, 9, "lane-curve");
  addPolyline(s(27), [[95,410],[185,325],[275,275],[340,235]], RED, 3, "single-chord");
  addBox(s(27), "ONE LINE", { left: 430, top: 180, width: 175, height: 50 }, { fill: "#FCEAEC", border: RED, size: 19, color: RED });
  addText(s(27), "cannot follow changing direction", { left: 620, top: 180, width: 250, height: 50 }, 18, { color: NAVY, valign: "middle" });
  addBox(s(27), "SHORT LINES", { left: 430, top: 260, width: 175, height: 50 }, { fill: "#FFF7E8", border: ORANGE, size: 18, color: ORANGE });
  addText(s(27), "approximate a curve but jitter", { left: 620, top: 260, width: 250, height: 50 }, 18, { color: NAVY, valign: "middle" });
  addBox(s(27), "CURVE FIT", { left: 430, top: 340, width: 175, height: 50 }, { fill: "#EEF7EA", border: GREEN, size: 19, color: GREEN });
  addText(s(27), "fit x as a smooth function of y", { left: 620, top: 340, width: 250, height: 50 }, 18, { color: NAVY, valign: "middle" });
  addTakeaway(s(27), "Keep Canny evidence; replace straight grouping with a curve fit.");
  setNotes(s(27), notes("Standard HoughLinesP is a straight-segment detector. A curved lane changes tangent direction. Many segments can approximate it, but a low-order polynomial gives a smoother introductory result.", [OPENCV_HOUGH, `${answerCode}/lane_detector_node.py`]));

  contentSetup(s(28), 28, "Curved lanes: collect pixels, then fit x(y)", "Curved lanes", 29);
  await addImage(s(28), `${LAB}/inputs/road_curved.png`, "Right-curving highway with yellow and white lane boundaries.", { left: 55, top: 175, width: 420, height: 250 }, "cover");
  addBox(s(28), "Canny + color", { left: 510, top: 185, width: 160, height: 62 }, { fill: PALE, border: CYAN, size: 18, color: BLUE });
  addBox(s(28), "road ROI", { left: 710, top: 185, width: 160, height: 62 }, { fill: "#FFF7E8", border: ORANGE, size: 19, color: NAVY });
  addBox(s(28), "split left/right", { left: 510, top: 268, width: 160, height: 62 }, { fill: "#EEF7EA", border: GREEN, size: 18, color: NAVY });
  addBox(s(28), "polyfit\nx=ay²+by+c", { left: 710, top: 268, width: 160, height: 62 }, { fill: "#FCEAEC", border: RED, size: 17, color: NAVY });
  addText(s(28), "Sample y values → evaluate x(y) → draw two smooth polylines", { left: 500, top: 360, width: 390, height: 48 }, 20, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(28), "The curve fit is still classical: every assumption and parameter is chosen by us.");
  setNotes(s(28), notes("The color mask stabilizes white and yellow lane evidence in this controlled input. Fit x as a function of y because each image row should intersect each boundary once in the ROI.", [`${LAB}/inputs/road_curved.png`, `${answerCode}/lane_detector_node.py`]));

  await addExperiment(s(29), 29, "Hands-on 7: change a ROS parameter and publish the curved road", `${LAB_OUT}/lane_curved.png`, "Curved road input, Canny/color evidence, ROI evidence, and two fitted lane curves.", "# 1) TERMINAL 1 — start the rebuilt node; leave running\nros2 run cv_lab lane_detector_node --ros-args \\\n -p output_dir:=\"$PWD/outputs\"\n# 2) TERMINAL 2 — select curved mode; verify it\nros2 param set /lane_detector mode curved\nros2 param get /lane_detector mode\n# 3) TERMINAL 2 — wait for one curved-lane report\nros2 topic echo --once /perception/lane_report\n# 4) TERMINAL 3 — publish road_curved.png\nros2 topic pub --once /perception/road_image_path \\\n std_msgs/msg/String \"{data: '$PWD/inputs/road_curved.png'}\"\n# 5) FINISH — view PNG; Ctrl+C in Terminal 1", "Parameter value: curved • Echo contains fitted_curves=2 • Open outputs/lane_curved.png", [OPENCV_CANNY, ROS_GUIDE, `${LAB}/inputs/road_curved.png`, `${code}/lane_detector_node.py`, `${LAB_OUT}/lane_curved.png`], { todo: "CONFIRM: the Hands-on 6 node is stopped\nEDIT: ws/src/cv_lab/cv_lab/lane_detector_node.py\nTODO: CURVE-CV", todoSize: 11.2, actionText: "Run Setup 3B, then do steps 1–5.", codeSize: 7.5, titleSize: 27, expectedSize: 14.5, cue: "Students confirm that the straight-lane process from Hands-on 6 is stopped so they do not run two lane_detector nodes. They edit CURVE-CV at the exact path shown, rebuild with Setup 3B, and start the rebuilt node. Terminal 2 selects and verifies curved mode before waiting for one report. Terminal 3 publishes inputs/road_curved.png. The verified report contains fitted_curves=2. Step 5 stops Terminal 1 after viewing the visualization." });

  contentSetup(s(30), 30, "Classical perception ends with an interpretable chain", "Synthesis", 32);
  addFlow(s(30), ["pixels", "x/y\ncounts", "mask\nrepair", "edge\nmaps", "Canny +\nHough", "line / curve\nmodels"], 205);
  addCards(s(30), [["Strength", "every stage is visible and debuggable", PALE], ["Cost", "each variation needs another assumption", "#FFF7E8", ORANGE], ["Next lecture", "learn features with CNNs; model wider context with transformers", "#EEF7EA", GREEN]], 340, 435);
  addTakeaway(s(30), "We did not eliminate failure—we made each failure explainable enough to motivate the next model.");
  setNotes(s(30), notes("End the classical section here. Review the precise chain: projection collisions expose lost arrangement; selected local defects motivate morphology; remaining lost boundary arrangement motivates local edge maps; a slanted-digit failure motivates Sobel/Canny; Hough groups straight pieces only; straight-lane limits motivate curve fitting. Translation is handled separately by alignment. CNNs and transformers begin in the separate deck.", [OPENCV_MORPHOLOGY, OPENCV_SOBEL, OPENCV_CANNY, OPENCV_HOUGH, `${LAB}/README.md`]));

  await finishDeck(p, final, root);
  return { final, count: p.slides.items.length };
}

async function buildNeural() {
  const root = `${BUILD}/neural`;
  const final = `${ROOT}/2026/Presentations/Lecture 3 Perception - CNNs and Transformers.pptx`;
  const p = await prepareDeck(NEURAL_STARTER, root);
  const s = (n) => p.slides.getItem(n - 1);
  await setCover(s(1), "Perception:\nCNNs and\nTransformers", "Dense layers → convolution → attention", "This companion deck begins at the cut point. It is deliberately separate from today's classical lecture.", [TEMPLATE, "OpenAI ImageGen: autonomous-driving perception hero illustration"]);

  contentSetup(s(2), 2, "One design question drives the neural progression", "Learning path", 34);
  addFlow(s(2), ["Dense\npixels", "Local shared\nfilters", "Deep feature\nhierarchy", "Efficient\noperators", "Global\nattention"], 215);
  addTakeaway(s(2), "Each step changes connectivity or computation; it does not merely rename a layer.");
  setNotes(s(2), notes("Use this logical sequence to distinguish representational changes from deployment optimizations.", [LENET, ALEXNET, VIT]));

  contentSetup(s(3), 3, "Reuse the same ROS 2 package and observable workflow", "ROS 2 setup", 33);
  addCode(s(3), "cd '2026/Labs/ClassicalCV/student/ws'\nsource /opt/ros/humble/setup.bash\ncolcon build --symlink-install --packages-select cv_lab\nsource install/setup.bash\nros2 launch cv_lab perception_lab.launch.py", { left: 80, top: 190, width: 800, height: 175 }, { size: 16.5 });
  addTakeaway(s(3), "Build in ws; run publish_*.sh from the student folder.");
  setNotes(s(3), notes("The package is shared so students can compare classical and neural operations without learning a second workflow.", [ROS_GUIDE, ROS_PACKAGE_DOC, `${ROS_PACKAGE}/launch/perception_lab.launch.py`]));

  contentSetup(s(4), 4, "A dense image classifier connects every pixel to every hidden unit", "Dense baseline", 32);
  addCards(s(4), [["Flatten", "H×W×C pixels become one vector", PALE], ["Affine", "z = Wx + b\nevery output sees every input", "#FFF7E8", ORANGE], ["Class scores", "softmax converts logits to probabilities", "#EEF7EA", GREEN]], 190, 408);
  addTakeaway(s(4), "The baseline ignores that nearby pixels are related and that features repeat across location.", RED);
  setNotes(s(4), notes("Call this a fully connected image classifier, not a fully connected CNN. A network becomes convolutional when it contains convolution operations.", [LENET]));

  contentSetup(s(5), 5, "Dense layers need nonlinear activations to compose decisions", "Dense baseline", 32);
  addCards(s(5), [["Linear stack", "W₂(W₁x) collapses into one matrix", "#FCEAEC", RED], ["ReLU", "max(0,z) creates piecewise-linear regions", PALE], ["Leaky ReLU", "max(αz,z) retains a small negative slope", "#FFF7E8", ORANGE]], 190, 410);
  addTakeaway(s(5), "ReLU changes the function class; it does not remove dense connections.");
  setNotes(s(5), notes("Explicitly correct the link-pruning misconception. ReLU zeros negative activations for a particular input, while structural pruning permanently removes parameters.", [RELU, PRUNING]));

  contentSetup(s(6), 6, "Dense parameter count grows with image area", "Dense baseline", 34);
  addText(s(6), "parameters = Nᵢₙ × Nₒᵤₜ + Nₒᵤₜ", { left: 120, top: 195, width: 720, height: 65 }, 34, { color: BLUE, bold: true, align: "center" });
  addCards(s(6), [["28×28 → 128", "100,480 parameters", PALE], ["224×224×3 → 1,000", "150,529,000 parameters", "#FCEAEC", RED], ["Problem", "cost scales with resolution", "#FFF7E8", ORANGE]], 300, 420);
  addTakeaway(s(6), "The next step changes the connectivity pattern: local receptive fields plus shared weights.");
  setNotes(s(6), notes("Calculate both examples. This motivates convolution through spatial structure rather than through activation choice.", [LENET, `${LAB_OUT}/cnn_cost_result.png`]));

  await addExperiment(s(7), 7, "Try it: publish a dense-layer configuration and inspect cost", `${LAB_OUT}/cnn_cost_result.png`, "Parameter and operation cost for supplied dense versus convolution configurations.", "# T1\nros2 run cv_lab cnn_config_node\n# T2\nros2 topic echo /perception/cnn_config_report --once\n# T3\n./publish_cnn_config.sh", "Checkpoint: identify which dimension dominates dense parameters; view cnn_cost_result.png", [ROS_GUIDE, `${LAB}/publish_cnn_config.sh`, `${LAB}/inputs/cnn_config.csv`, `${LAB_OUT}/cnn_cost_result.png`]);

  contentSetup(s(8), 8, "Local connectivity uses the fact that visual evidence is spatial", "Convolution", 34);
  addCards(s(8), [["Receptive field", "a unit reads a small neighborhood", PALE], ["Sparse connections", "most pixel-to-unit links never exist", "#EEF7EA", GREEN], ["Stacking", "deeper layers see larger effective regions", "#FFF7E8", ORANGE]], 190, 410);
  addTakeaway(s(8), "This is the first real answer to the expensive dense connectivity problem.");
  setNotes(s(8), notes("Separate structural sparsity from pruning: locality is designed into convolution before training.", [LENET]));

  contentSetup(s(9), 9, "Weight sharing searches for the same pattern everywhere", "Convolution", 33);
  addKernel(s(9), [[-1,0,1],[-2,0,2],[-1,0,1]], 140, 235, 58, "one learned filter");
  addFlow(s(9), ["same weights\nat every x,y", "one output\nfeature map", "translation\nequivariance"], 250);
  addTakeaway(s(9), "A k×k filter uses k²Cᵢₙ weights per output channel, independent of image width and height.");
  setNotes(s(9), notes("Relate learned kernels to Sobel: the operation is similar, but the values are learned from data and many channels are trained together.", [LENET, OPENCV_SOBEL]));

  contentSetup(s(10), 10, "A convolutional layer produces a stack of feature maps", "Convolution", 34);
  addCards(s(10), [["Input", "H×W×Cᵢₙ", PALE], ["Kernel bank", "k×k×Cᵢₙ×Cₒᵤₜ", "#FFF7E8", ORANGE], ["Output", "H′×W′×Cₒᵤₜ", "#EEF7EA", GREEN]], 190, 405);
  addText(s(10), "stride controls sampling • padding controls borders • channels count learned patterns", { left: 100, top: 394, width: 760, height: 50 }, 22, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(10), "Always track tensor shape; many CNN bugs are dimension mistakes.");
  setNotes(s(10), notes("Work one output-shape calculation, then connect each output channel to one learned filter bank.", [LENET]));

  contentSetup(s(11), 11, "ReLU gates responses; leaky ReLU preserves a small negative path", "Nonlinearity", 31);
  addText(s(11), "ReLU(z)=max(0,z)", { left: 100, top: 205, width: 340, height: 52 }, 31, { color: BLUE, bold: true, align: "center" });
  addText(s(11), "Leaky(z)=max(αz,z)", { left: 520, top: 205, width: 340, height: 52 }, 31, { color: ORANGE, bold: true, align: "center" });
  addCards(s(11), [["Benefit", "cheap nonlinearity; positive gradients do not saturate", PALE], ["Risk", "units can remain inactive for all training inputs", "#FCEAEC", RED], ["Not pruning", "zero activation ≠ deleted parameter", "#FFF7E8", ORANGE]], 300, 420);
  addTakeaway(s(11), "Activation sparsity, structural pruning, and sparse convolution are different ideas.");
  setNotes(s(11), notes("Use precise terms. Leaky ReLU addresses zero negative slope; it is not called non-zero ReLU in the literature.", [RELU]));

  contentSetup(s(12), 12, "Pooling or stride trades spatial precision for larger context", "Convolution", 31);
  addCards(s(12), [["Max pool", "retain the strongest local response", PALE], ["Average pool", "retain the local mean response", "#FFF7E8", ORANGE], ["Strided conv", "learn the downsampling operator", "#EEF7EA", GREEN]], 190, 410);
  addTakeaway(s(12), "Downsampling reduces computation, but aggressive reduction can erase small objects.", RED);
  setNotes(s(12), notes("Compare pooling with strided convolution and ask which preserves small pedestrian evidence.", [ALEXNET, VGG]));

  await addExperiment(s(13), 13, "Try it: convolve, activate, and pool a supplied patch", `${LAB_OUT}/cnn_ops_result.png`, "Input patch, filter response, ReLU output, and pooled result.", "# T1\nros2 run cv_lab cnn_ops_node\n# T2\nros2 topic echo /perception/cnn_ops_report --once\n# T3\n./publish_cnn_patch.sh", "Checkpoint: trace one output cell back to its 3×3 input neighborhood", [ROS_GUIDE, `${LAB}/publish_cnn_patch.sh`, `${LAB}/inputs/cnn_patch.csv`, `${LAB_OUT}/cnn_ops_result.png`]);

  contentSetup(s(14), 14, "Repeated blocks build a hierarchy of receptive fields", "CNN architectures", 33);
  addFlow(s(14), ["edges +\ncolors", "textures +\ncorners", "parts +\nshapes", "objects +\ncontext"], 220);
  addText(s(14), "conv → activation → normalization → downsample", { left: 185, top: 350, width: 590, height: 44 }, 25, { color: BLUE, bold: true, align: "center" });
  addTakeaway(s(14), "Depth expands effective receptive field and composes simpler features into richer ones.");
  setNotes(s(14), notes("Present feature hierarchy as a useful interpretation, not a guarantee that every channel has one human-readable meaning.", [ALEXNET, VGG]));

  contentSetup(s(15), 15, "CNN history follows recurring design pressures", "CNN architectures", 33);
  addCards(s(15), [["LeNet", "local shared filters for digits", PALE], ["AlexNet / VGG", "deeper stacks + ReLU + GPUs", "#FFF7E8", ORANGE], ["Inception / ResNet", "multi-scale paths and residual learning", "#EEF7EA", GREEN], ["MobileNet", "factorize convolution for efficiency", "#FCEAEC", RED]], 180, 410);
  addTakeaway(s(15), "Study the pressure each architecture addresses—not a disconnected chronology.");
  setNotes(s(15), notes("Organize the works by pressure: scale training, depth, optimization, and deployment efficiency.", [LENET, ALEXNET, VGG, INCEPTION, RESNET, MOBILENET]));

  contentSetup(s(16), 16, "Efficiency changes can target weights, arithmetic, or feature maps", "Deployment", 31);
  addCards(s(16), [["Pruning", "remove low-importance weights or channels", PALE], ["Quantization", "represent values with fewer bits", "#FFF7E8", ORANGE], ["Factorization", "replace full conv with cheaper operators", "#EEF7EA", GREEN], ["Downsampling", "shrink activation maps earlier", "#FCEAEC", RED]], 180, 410);
  addTakeaway(s(16), "These are distinct levers with different accuracy, hardware, and retraining effects.");
  setNotes(s(16), notes("Avoid presenting a false sequence from dense layers to ReLU to pruning. ReLU is an activation; pruning and quantization are deployment techniques.", [PRUNING, MOBILENET]));

  contentSetup(s(17), 17, "Quantization maps a continuous range onto discrete levels", "Deployment", 32);
  addText(s(17), "q = clip(round(x / scale) + zero_point)", { left: 100, top: 195, width: 760, height: 65 }, 31, { color: BLUE, bold: true, align: "center" });
  addCards(s(17), [["8-bit", "256 representable codes", PALE], ["4-bit", "16 codes; larger rounding error", "#FFF7E8", ORANGE], ["Trade-off", "less memory and bandwidth\npossible accuracy loss", "#FCEAEC", RED]], 300, 420);
  addTakeaway(s(17), "Quantization changes numerical precision; it does not change network connectivity.");
  setNotes(s(17), notes("Connect scale and zero point to the observed quantization error. Mention calibration and quantization-aware training as later topics.", [`${LAB_OUT}/quantization_result_4.png`]));

  await addExperiment(s(18), 18, "Try it: change activation precision and inspect error", `${LAB_OUT}/quantization_result_4.png`, "Original versus 4-bit quantized activation values and error.", "# T1\nros2 run cv_lab cnn_config_node\n# T2\nros2 topic echo /perception/quantization_report --once\n# T3\n./publish_cnn_config.sh 4", "Checkpoint: compare mean error at 8 bits and 4 bits; view quantization_result_4.png", [ROS_GUIDE, `${LAB}/publish_cnn_config.sh`, `${LAB_OUT}/quantization_result_4.png`]);

  contentSetup(s(19), 19, "Convolution has a strong local prior; attention can mix distant content", "Transformers", 30);
  addCards(s(19), [["CNN", "fixed local neighborhood\nshared weights", PALE], ["Need", "relate distant regions whose connection depends on content", "#FFF7E8", ORANGE], ["Attention", "each token computes data-dependent weights over other tokens", "#EEF7EA", GREEN]], 190, 410);
  addTakeaway(s(19), "Attention changes the mixing rule from position-defined to content-dependent.");
  setNotes(s(19), notes("Do not claim transformers simply replace CNNs. Compare inductive biases, data needs, and computational scaling.", [ATTENTION, VIT]));

  contentSetup(s(20), 20, "Scaled dot-product attention is similarity, normalization, and mixing", "Transformers", 29);
  addText(s(20), "Attention(Q,K,V) = softmax(QKᵀ / √d) V", { left: 75, top: 190, width: 810, height: 65 }, 31, { color: BLUE, bold: true, align: "center" });
  addFlow(s(20), ["queries\nwhat I seek", "keys\nwhat I offer", "softmax\nrow weights", "values\nwhat I send"], 300);
  addTakeaway(s(20), "Every softmax row sums to 1; the output is a weighted mixture of value vectors.");
  setNotes(s(20), notes("Compute one query-key dot product and explain division by sqrt(d) as score stabilization before softmax.", [ATTENTION]));

  contentSetup(s(21), 21, "A vision transformer turns image patches into a token sequence", "Transformers", 31);
  addFlow(s(21), ["split into\npatches", "flatten +\nproject", "add position\nembeddings", "transformer\nencoder", "class or\ndetection head"], 220);
  addTakeaway(s(21), "Patch size controls sequence length: smaller patches preserve detail but make attention costlier.");
  setNotes(s(21), notes("Track the tensor from H×W×C to N patch tokens. Explain why position information must be supplied when the mixing operation itself is permutation-equivariant.", [VIT]));

  contentSetup(s(22), 22, "CNNs and transformers encode different assumptions", "Transformers", 31);
  addCards(s(22), [["CNN prior", "locality + translation equivariance\nefficient on image grids", PALE], ["Transformer prior", "content-adaptive token interaction\nflexible global context", "#FFF7E8", ORANGE], ["Hybrid reality", "conv stems, windowed attention, pyramids, multi-scale heads", "#EEF7EA", GREEN]], 185, 410);
  addTakeaway(s(22), "Choose an architecture from data, latency, resolution, and deployment constraints—not fashion.");
  setNotes(s(22), notes("Use a small-data edge device versus large-scale pretraining example to make the trade-off concrete.", [VIT, MOBILENET]));

  await addExperiment(s(23), 23, "Try it: publish four tokens and visualize attention", `${LAB_OUT}/attention_result.png`, "Four input tokens and the resulting four-by-four attention matrix.", "# T1\nros2 run cv_lab transformer_ops_node\n# T2\nros2 topic echo /perception/attention_report --once\n# T3\n./publish_attention.sh", "Expected strongest keys=[0,0,2,2]; every attention row sums to 1.0", [ATTENTION, ROS_GUIDE, `${LAB}/publish_attention.sh`, `${LAB}/inputs/attention_tokens.csv`, `${ROS_PACKAGE}/cv_lab/transformer_ops_node.py`, `${LAB_OUT}/attention_result.png`]);

  contentSetup(s(24), 24, "Modern detectors still need heads, boxes, scores, and duplicate handling", "Detection", 30);
  addFlow(s(24), ["backbone\nCNN / ViT", "multi-scale\nfeatures", "class + box\nhead", "confidence\nfilter", "NMS or\nset prediction"], 220);
  addTakeaway(s(24), "Learned features replace handcrafted descriptors; the detection questions remain where, what, and confidence.");
  setNotes(s(24), notes("Connect back to the classical sliding-window and NMS pipeline. Contrast proposal-based, one-stage, and set-prediction families without overloading this introductory deck.", [YOLO, FASTER_RCNN]));

  contentSetup(s(25), 25, "The full logic: change connectivity only when the problem demands it", "Synthesis", 31);
  addCards(s(25), [["Dense", "unstructured global connections\nexpensive for images", PALE], ["CNN", "local shared filters\nstrong image prior", "#FFF7E8", ORANGE], ["Transformer", "content-dependent token mixing\nglobal context", "#EEF7EA", GREEN]], 185, 405);
  addText(s(25), "ReLU adds nonlinearity • pruning removes parameters • quantization reduces precision", { left: 100, top: 394, width: 760, height: 45 }, 21, { color: RED, bold: true, align: "center" });
  addTakeaway(s(25), "Explain every architectural step by the limitation it addresses.");
  setNotes(s(25), notes("Close with a verbal check: ask students to classify locality, ReLU, pruning, quantization, and attention as connectivity, activation, compression, numerical precision, or content-dependent mixing.", [LENET, RELU, PRUNING, ATTENTION, VIT]));

  await finishDeck(p, final, root);
  return { final, count: p.slides.items.length };
}

async function buildSplit() {
  const requested = process.argv[2] ?? "all";
  if (!["all", "classical", "neural"].includes(requested)) {
    throw new Error(`Unknown deck target: ${requested}. Use all, classical, or neural.`);
  }
  const result = {};
  if (requested === "all" || requested === "classical") result.classical = await buildClassical();
  if (requested === "all" || requested === "neural") result.neural = await buildNeural();
  console.log(JSON.stringify(result, null, 2));
}

buildSplit().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
