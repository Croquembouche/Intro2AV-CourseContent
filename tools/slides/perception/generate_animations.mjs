import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOL_DIR, "../../..");
const LAB = path.join(ROOT, "2026/Labs/ClassicalCV/student");
const OUT = path.join(LAB, "animations");
const FRAME_ROOT = path.join(ROOT, ".build/slides/perception/animation-frames");

const W = 720;
const H = 420;
const C = {
  blue: "#00539F",
  cyan: "#00A0DF",
  orange: "#EF8200",
  navy: "#17324D",
  slate: "#4B6072",
  pale: "#EAF4FA",
  light: "#F6F9FB",
  border: "#C8D7E1",
  red: "#AF1E2D",
  green: "#5A8E22",
  white: "#FFFFFF",
  black: "#101820",
};

function esc(text) {
  return String(text);
}

async function readMatrix(relativePath) {
  const text = await fs.readFile(path.join(LAB, relativePath), "utf8");
  return text.trim().split(/\r?\n/).map((line) =>
    line.split(",").map((value) => Number(value.trim()) > 0 ? 1 : 0));
}

function sumColumns(matrix) {
  return matrix[0].map((_, c) => matrix.reduce((sum, row) => sum + row[c], 0));
}

function sumRows(matrix) {
  return matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
}

function base(title, subtitle = "") {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.cyan;
  ctx.font = "bold 25px Arial";
  ctx.fillText(esc(title), 28, 36);
  if (subtitle) {
    ctx.fillStyle = C.slate;
    ctx.font = "16px Arial";
    ctx.fillText(esc(subtitle), 29, 61);
  }
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 73);
  ctx.lineTo(W - 28, 73);
  ctx.stroke();
  return { canvas, ctx };
}

function label(ctx, text, x, y, color = C.navy, font = "bold 16px Arial", align = "left") {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.fillText(esc(text), x, y);
  ctx.textAlign = "left";
}

function badge(ctx, text, x, y, width, color = C.blue) {
  ctx.fillStyle = C.white;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 38, 9);
  ctx.fill();
  ctx.stroke();
  label(ctx, text, x + width / 2, y + 25, color, "bold 17px Arial", "center");
}

function drawMatrix(ctx, matrix, x, y, cell, options = {}) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const max = options.maxValue ?? 1;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const value = matrix[r][c] ?? 0;
      if (options.visible && !options.visible(r, c)) {
        ctx.fillStyle = C.white;
      } else if (max > 1) {
        const t = Math.max(0, Math.min(1, Math.abs(value) / max));
        const shade = Math.round(255 - 205 * t);
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      } else {
        ctx.fillStyle = value ? C.black : C.white;
      }
      ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x + c * cell, y + r * cell, cell, cell);
    }
  }
  if (Number.isInteger(options.highlightColumn)) {
    ctx.fillStyle = "rgba(239,130,0,0.25)";
    ctx.fillRect(x + options.highlightColumn * cell, y, cell, rows * cell);
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + options.highlightColumn * cell, y, cell, rows * cell);
  }
  if (Number.isInteger(options.highlightRow)) {
    ctx.fillStyle = "rgba(0,160,223,0.22)";
    ctx.fillRect(x, y + options.highlightRow * cell, cols * cell, cell);
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y + options.highlightRow * cell, cols * cell, cell);
  }
  if (options.window) {
    const { row, col, size = 3 } = options.window;
    ctx.strokeStyle = options.windowColor ?? C.orange;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + (col - 1) * cell, y + (row - 1) * cell,
      size * cell, size * cell);
  }
}

function drawVerticalBars(ctx, values, x, y, width, height, visibleCount, color = C.orange) {
  const gap = 4;
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  const max = Math.max(1, ...values);
  ctx.strokeStyle = C.border;
  ctx.strokeRect(x, y, width, height);
  for (let i = 0; i < values.length; i += 1) {
    if (i >= visibleCount) continue;
    const h = values[i] / max * (height - 24);
    ctx.fillStyle = color;
    ctx.fillRect(x + i * (barWidth + gap), y + height - h - 18, barWidth, h);
    label(ctx, values[i], x + i * (barWidth + gap) + barWidth / 2,
      y + height - 4, C.slate, "11px Arial", "center");
  }
}

function drawHorizontalBars(ctx, values, x, y, width, height, visibleCount, color = C.cyan) {
  const gap = 3;
  const barHeight = (height - gap * (values.length - 1)) / values.length;
  const max = Math.max(1, ...values);
  ctx.strokeStyle = C.border;
  ctx.strokeRect(x, y, width, height);
  for (let i = 0; i < values.length; i += 1) {
    if (i >= visibleCount) continue;
    const w = values[i] / max * (width - 34);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + i * (barHeight + gap), w, barHeight);
    label(ctx, values[i], x + width - 8,
      y + i * (barHeight + gap) + barHeight - 2, C.slate, "11px Arial", "right");
  }
}

async function writeFrames(name, frameBuilders, fps = 3) {
  const dir = path.join(FRAME_ROOT, name);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  for (let i = 0; i < frameBuilders.length; i += 1) {
    const canvas = await frameBuilders[i]();
    const file = path.join(dir, `frame-${String(i).padStart(3, "0")}.png`);
    await fs.writeFile(file, canvas.toBuffer("image/png"));
  }
  const output = path.join(OUT, `${name}.gif`);
  const filter = "split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=full[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3";
  const result = spawnSync("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(fps),
    "-i", path.join(dir, "frame-%03d.png"),
    "-filter_complex", filter, "-loop", "0", output,
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${name}: ${result.stderr}`);
  return { name, output, frames: frameBuilders.length, fps };
}

async function histogramCounting() {
  const matrix = await readMatrix("inputs/digit_3.csv");
  const xHist = sumColumns(matrix);
  const yHist = sumRows(matrix);
  const frames = [];
  for (let i = 0; i < 10; i += 1) {
    frames.push(async () => {
      const { canvas, ctx } = base("Projection histogram", "Count each column first, then each row");
      drawMatrix(ctx, matrix, 34, 100, 27, { highlightColumn: i });
      label(ctx, `Column ${i}: ${xHist[i]} foreground pixels`, 34, 392, C.orange);
      label(ctx, "x histogram: column counts", 360, 102, C.orange);
      drawVerticalBars(ctx, xHist, 360, 115, 325, 120, i + 1, C.orange);
      label(ctx, "y histogram: row counts", 360, 265, C.cyan);
      drawHorizontalBars(ctx, yHist, 360, 278, 325, 105, 0, C.cyan);
      return canvas;
    });
  }
  for (let i = 0; i < 10; i += 1) {
    frames.push(async () => {
      const { canvas, ctx } = base("Projection histogram", "Count each column first, then each row");
      drawMatrix(ctx, matrix, 34, 100, 27, { highlightRow: i });
      label(ctx, `Row ${i}: ${yHist[i]} foreground pixels`, 34, 392, C.cyan);
      label(ctx, "x histogram: column counts", 360, 102, C.orange);
      drawVerticalBars(ctx, xHist, 360, 115, 325, 120, 10, C.orange);
      label(ctx, "y histogram: row counts", 360, 265, C.cyan);
      drawHorizontalBars(ctx, yHist, 360, 278, 325, 105, i + 1, C.cyan);
      return canvas;
    });
  }
  for (let repeat = 0; repeat < 5; repeat += 1) {
    frames.push(async () => {
      const { canvas, ctx } = base("Projection histogram", "The 10 column counts and 10 row counts form one descriptor");
      drawMatrix(ctx, matrix, 34, 100, 27);
      label(ctx, "x histogram: column counts", 360, 102, C.orange);
      drawVerticalBars(ctx, xHist, 360, 115, 325, 120, 10, C.orange);
      label(ctx, "y histogram: row counts", 360, 265, C.cyan);
      drawHorizontalBars(ctx, yHist, 360, 278, 325, 105, 10, C.cyan);
      badge(ctx, "Nearest template: digit 3", 34, 378, 270, C.green);
      return canvas;
    });
  }
  return writeFrames("01_histogram_count", frames, 4);
}

async function histogramFailures(name, cases) {
  const frames = [];
  for (const item of cases) {
    const matrix = await readMatrix(item.path);
    const xHist = sumColumns(matrix);
    const yHist = sumRows(matrix);
    for (let repeat = 0; repeat < 5; repeat += 1) {
      frames.push(async () => {
        const { canvas, ctx } = base("Same classifier, different input", "The projection counts change even when the intended digit does not");
        label(ctx, item.label, 37, 102, C.blue, "bold 19px Arial");
        drawMatrix(ctx, matrix, 38, 118, 24);
        label(ctx, "column counts", 345, 107, C.orange);
        drawVerticalBars(ctx, xHist, 345, 119, 335, 110, 10, C.orange);
        label(ctx, "row counts", 345, 260, C.cyan);
        drawHorizontalBars(ctx, yHist, 345, 273, 335, 96, 10, C.cyan);
        badge(ctx, `Published prediction: ${item.prediction}`, 38, 373, 242,
          item.prediction === "3" ? C.green : C.red);
        return canvas;
      });
    }
  }
  return writeFrames(name, frames, 3);
}

function morph1x2(matrix, kind) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  return matrix.map((row, r) => row.map((_, c) => {
    const a = c - 1 >= 0 ? matrix[r][c - 1] : (kind === "erode" ? 1 : 0);
    const b = matrix[r][c];
    return kind === "dilate" ? Math.max(a, b) : Math.min(a, b);
  }));
}

async function morphologyClosing() {
  const before = await readMatrix("inputs/digit_variants/digit_3_holes.csv");
  const dilated = morph1x2(before, "dilate");
  const closed = morph1x2(dilated, "erode");
  const frames = [];
  const checkpoints = [0, 2, 4, 6, 8, 10];
  for (const rowsVisible of checkpoints) {
    frames.push(async () => {
      const { canvas, ctx } = base("Closing bridges short gaps", "Closing applies dilation first, then erosion");
      label(ctx, "Input", 115, 104, C.navy, "bold 18px Arial", "center");
      drawMatrix(ctx, before, 25, 120, 18);
      label(ctx, "1. Dilate", 360, 104, C.orange, "bold 18px Arial", "center");
      drawMatrix(ctx, dilated, 270, 120, 18, { visible: (r) => r < rowsVisible, highlightRow: rowsVisible < 10 ? rowsVisible : undefined });
      label(ctx, "2. Erode", 605, 104, C.green, "bold 18px Arial", "center");
      drawMatrix(ctx, closed, 515, 120, 18, { visible: () => false });
      badge(ctx, "Dilation grows the stroke", 250, 336, 220, C.orange);
      return canvas;
    });
  }
  for (const rowsVisible of checkpoints) {
    frames.push(async () => {
      const { canvas, ctx } = base("Closing bridges short gaps", "Closing applies dilation first, then erosion");
      label(ctx, "Input", 115, 104, C.navy, "bold 18px Arial", "center");
      drawMatrix(ctx, before, 25, 120, 18);
      label(ctx, "1. Dilate", 360, 104, C.orange, "bold 18px Arial", "center");
      drawMatrix(ctx, dilated, 270, 120, 18);
      label(ctx, "2. Erode", 605, 104, C.green, "bold 18px Arial", "center");
      drawMatrix(ctx, closed, 515, 120, 18, { visible: (r) => r < rowsVisible, highlightRow: rowsVisible < 10 ? rowsVisible : undefined });
      badge(ctx, rowsVisible < 10 ? "Erosion restores the width" : "Prediction changes from 7 to 3", 230, 336, 270, rowsVisible < 10 ? C.green : C.blue);
      return canvas;
    });
  }
  for (let repeat = 0; repeat < 4; repeat += 1) {
    frames.push(async () => {
      const { canvas, ctx } = base("Closing bridges short gaps", "The repaired mask reaches the correct nearest template");
      label(ctx, "Input", 115, 104, C.navy, "bold 18px Arial", "center");
      drawMatrix(ctx, before, 25, 120, 18);
      label(ctx, "Dilated", 360, 104, C.orange, "bold 18px Arial", "center");
      drawMatrix(ctx, dilated, 270, 120, 18);
      label(ctx, "Closed", 605, 104, C.green, "bold 18px Arial", "center");
      drawMatrix(ctx, closed, 515, 120, 18);
      badge(ctx, "before 7   after 3   PASS", 230, 336, 270, C.green);
      return canvas;
    });
  }
  return writeFrames("04_morphology_closing", frames, 3);
}

function reflect101(index, length) {
  if (length <= 1) return 0;
  let value = index;
  while (value < 0 || value >= length) {
    if (value < 0) value = -value;
    if (value >= length) value = 2 * length - value - 2;
  }
  return value;
}

function correlate(matrix, kernel) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  return matrix.map((_, r) => matrix[0].map((__, c) => {
    let sum = 0;
    for (let kr = 0; kr < 3; kr += 1) {
      for (let kc = 0; kc < 3; kc += 1) {
        const rr = reflect101(r + kr - 1, rows);
        const cc = reflect101(c + kc - 1, cols);
        sum += matrix[rr][cc] * kernel[kr][kc];
      }
    }
    return Math.abs(sum);
  }));
}

async function kernelSlide() {
  const matrix = await readMatrix("inputs/digit_variants/digit_7_slanted.csv");
  const kernels = [
    { name: "Vertical-edge kernel", color: C.orange, values: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]] },
    { name: "Horizontal-edge kernel", color: C.cyan, values: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]] },
  ];
  const frames = [];
  for (const kernel of kernels) {
    const response = correlate(matrix, kernel.values);
    const positions = [[1,1],[1,3],[1,5],[1,7],[3,1],[3,3],[3,5],[3,7],[5,1],[5,3],[5,5],[5,7],[7,1],[7,3],[7,5],[7,7],[8,8]];
    for (let step = 0; step < positions.length; step += 1) {
      const [row, col] = positions[step];
      frames.push(async () => {
        const { canvas, ctx } = base("A kernel slides, multiplies, and sums", kernel.name);
        drawMatrix(ctx, matrix, 28, 100, 27, { window: { row, col }, windowColor: kernel.color });
        label(ctx, "3×3 weights", 400, 102, kernel.color, "bold 17px Arial", "center");
        drawMatrix(ctx, kernel.values, 345, 118, 36, { maxValue: 1 });
        for (let kr = 0; kr < 3; kr += 1) for (let kc = 0; kc < 3; kc += 1) {
          label(ctx, kernel.values[kr][kc], 363 + kc * 36, 143 + kr * 36,
            kernel.values[kr][kc] < 0 ? C.red : C.navy, "bold 14px Arial", "center");
        }
        label(ctx, `absolute response at (${row}, ${col}) = ${response[row][col]}`,
          340, 252, kernel.color, "bold 16px Arial");
        label(ctx, "response map", 570, 102, C.navy, "bold 17px Arial", "center");
        const currentIndex = row * 10 + col;
        drawMatrix(ctx, response, 480, 118, 18, {
          maxValue: 6,
          visible: (r, c) => r * 10 + c <= currentIndex,
        });
        badge(ctx, "Move one position and repeat", 355, 347, 300, kernel.color);
        return canvas;
      });
    }
  }
  return writeFrames("05_kernel_slide", frames, 5);
}

async function panelPipeline(name, sourceRelativePath, stages, crop, finalMessage) {
  const source = await loadImage(path.join(LAB, sourceRelativePath));
  const frames = [];
  for (let stage = 0; stage < stages.length; stage += 1) {
    for (let repeat = 0; repeat < 4; repeat += 1) {
      frames.push(async () => {
        const { canvas, ctx } = base(stages[stage].title, stages[stage].subtitle);
        const panel = stages[stage].panel;
        ctx.fillStyle = C.light;
        ctx.fillRect(52, 104, 616, 230);
        ctx.drawImage(source,
          crop(panel).sx, crop(panel).sy, crop(panel).sw, crop(panel).sh,
          52, 104, 616, 230);
        const totalWidth = 600;
        const segment = totalWidth / stages.length;
        for (let i = 0; i < stages.length; i += 1) {
          ctx.fillStyle = i <= stage ? stages[i].color : C.border;
          ctx.fillRect(60 + i * segment, 383, segment - 8, 8);
          label(ctx, stages[i].short, 60 + i * segment + (segment - 8) / 2,
            409, i === stage ? stages[i].color : C.slate,
            i === stage ? "bold 14px Arial" : "13px Arial", "center");
        }
        if (stage === stages.length - 1) badge(ctx, finalMessage, 205, 341, 310, C.green);
        return canvas;
      });
    }
  }
  return writeFrames(name, frames, 3);
}

async function edgePipeline() {
  const stages = [
    { panel: 0, short: "input", title: "Input matrix", subtitle: "Upscale and center the digit", color: C.blue },
    { panel: 1, short: "Sobel", title: "Sobel magnitude", subtitle: "Large values mark strong brightness changes", color: C.orange },
    { panel: 2, short: "Canny", title: "Canny edges", subtitle: "Threshold and thin the supported boundaries", color: C.cyan },
    { panel: 3, short: "Hough", title: "Hough segments", subtitle: "Group edge pixels that support the same straight segment", color: C.red },
  ];
  return panelPipeline("06_edge_pipeline", "outputs/edge_shape_7_slanted.png", stages,
    (panel) => ({ sx: 20 + panel * 230, sy: 55, sw: 210, sh: 210 }),
    "prediction 7, 525 edge pixels, 6 segments");
}

async function lanePipeline(name, source, curved) {
  const stages = curved ? [
    { panel: 0, short: "input", title: "Road image", subtitle: "The node receives this file path through a ROS 2 topic", color: C.blue },
    { panel: 1, short: "Canny", title: "Canny edges", subtitle: "Brightness boundaries include lanes and background clutter", color: C.orange },
    { panel: 2, short: "evidence", title: "Road-region evidence", subtitle: "Color and the trapezoid keep likely lane pixels", color: C.cyan },
    { panel: 3, short: "curve fit", title: "Quadratic lane fit", subtitle: "Fit x as a smooth function of y for the left and right boundaries", color: C.red },
  ] : [
    { panel: 0, short: "input", title: "Road image", subtitle: "The node receives this file path through a ROS 2 topic", color: C.blue },
    { panel: 1, short: "Canny", title: "Canny edges", subtitle: "Brightness boundaries include lanes and background clutter", color: C.orange },
    { panel: 2, short: "ROI", title: "Road-region evidence", subtitle: "The trapezoid removes edges outside the likely road area", color: C.cyan },
    { panel: 3, short: "Hough", title: "Straight lane segments", subtitle: "HoughLinesP groups aligned edge pixels into straight segments", color: C.red },
  ];
  return panelPipeline(name, source, stages,
    (panel) => ({
      sx: panel % 2 === 0 ? 15 : 483,
      sy: panel < 2 ? 55 : 420,
      sw: 453,
      sh: 340,
    }),
    curved ? "two fitted lane curves" : "11 accepted Hough segments");
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(FRAME_ROOT, { recursive: true });
  const results = [];
  results.push(await histogramCounting());
  results.push(await histogramFailures("02_histogram_failures_a", [
    { label: "clean 5: same projections as 2", prediction: "-1", path: "inputs/digit_5.csv" },
    { label: "shifted 3", prediction: "-1", path: "inputs/digit_variants/digit_3_shifted.csv" },
    { label: "thick 3", prediction: "9", path: "inputs/digit_variants/digit_3_thick.csv" },
  ]));
  results.push(await histogramFailures("03_histogram_failures_b", [
    { label: "thin 3", prediction: "7", path: "inputs/digit_variants/digit_3_thin.csv" },
    { label: "3 with holes", prediction: "7", path: "inputs/digit_variants/digit_3_holes.csv" },
    { label: "3 with extra dots", prediction: "9", path: "inputs/digit_variants/digit_3_dots.csv" },
  ]));
  results.push(await morphologyClosing());
  results.push(await kernelSlide());
  results.push(await edgePipeline());
  results.push(await lanePipeline("07_lane_straight_pipeline", "outputs/lane_straight.png", false));
  results.push(await lanePipeline("08_lane_curved_pipeline", "outputs/lane_curved.png", true));
  console.log(JSON.stringify({ outputDirectory: OUT, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
