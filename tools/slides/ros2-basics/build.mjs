import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOL_DIR, "../../..");
const BUILD = `${ROOT}/.build/slides/ros2-basics`;
const STARTER = `${TOOL_DIR}/template-starter.pptx`;
const FINAL = `${ROOT}/2026/Presentations/Lecture 1.pptx`;
const RENDER_DIR = `${BUILD}/final-render`;
const LAYOUT_DIR = `${BUILD}/final-layout`;
const DRIVE_URL = "https://drive.google.com/file/d/1zd5GGe6t-UIEEMK9XJ1UCwRFa9NWEHrm/view?usp=sharing";
const BLUE = "#00539F";
const DARK = "#17324D";
const SLATE = "#4B6072";

const ROS_NODE = "https://docs.ros.org/en/humble/Tutorials/Beginner-CLI-Tools/Understanding-ROS2-Nodes/Understanding-ROS2-Nodes.html";
const ROS_INTERFACES = "https://docs.ros.org/en/humble/Concepts/Basic/Interfaces-Topics-Services-Actions.html";
const ROS_QOS = "https://docs.ros.org/en/humble/Concepts/Intermediate/About-Quality-of-Service-Settings.html";
const ROS_BAG = "https://docs.ros.org/en/humble/Tutorials/Beginner-CLI-Tools/Recording-And-Playing-Back-Data/Recording-And-Playing-Back-Data.html";
const ROS_RELEASES = "https://docs.ros.org/en/rolling/Releases.html";
const LOCAL_META = `${ROOT}/2026/Data/Project1/project1_simulated_data/metadata.yaml`;
const SYLLABUS = `${ROOT}/2026/Documents/Syllabus.docx`;

function statement(text, options = {}) {
  return {
    bulletCharacter: "",
    alignment: "left",
    marginLeft: options.marginLeft ?? 0,
    indent: 0,
    spaceAfter: options.spaceAfter ?? 11,
    runs: [{ run: text, textStyle: { bold: options.bold ?? false, color: options.color ?? DARK } }],
  };
}

function concept(term, definition) {
  return {
    bulletCharacter: "",
    alignment: "left",
    marginLeft: 0,
    indent: 0,
    spaceAfter: 13,
    runs: [
      { run: term, textStyle: { bold: true, color: BLUE } },
      { run: `  ${definition}`, textStyle: { color: DARK } },
    ],
  };
}

function command(text, purpose = "") {
  return {
    bulletCharacter: "",
    alignment: "left",
    marginLeft: 0,
    indent: 0,
    spaceAfter: 10,
    runs: [
      { run: text, textStyle: { bold: true, typeface: "Courier New", color: DARK } },
      ...(purpose ? [{ run: `\n${purpose}`, textStyle: { color: SLATE } }] : []),
    ],
  };
}

function linkedLine(text, uri) {
  return {
    bulletCharacter: "",
    alignment: "left",
    marginLeft: 0,
    indent: 0,
    spaceAfter: 12,
    runs: [{ run: text, textStyle: { bold: true, underline: "sng", color: BLUE }, link: { uri, isExternal: true } }],
  };
}

function notes(cue, sources) {
  return [cue, "", "[Sources]", ...sources.map((source) => `- ${source}`)].join("\n");
}

const image = (slideNumber, name) => `${TOOL_DIR}/images/slide-${String(slideNumber).padStart(2, "0")}-${name}.png`;

const specs = {
  3: {
    title: "Core entities and communication contracts",
    titleSize: 32,
    image: image(3, "entities"),
    alt: "Technical illustration of ROS 2 nodes, typed messages, communication links, and delivery policies.",
    body: [
      concept("Node", "runtime process with a scoped responsibility"),
      concept("Topic", "named channel for continuous data"),
      concept("Message", "typed payload carried by a topic"),
      concept("QoS", "endpoint compatibility and delivery policy"),
    ],
    notes: notes("Limit exposition to the four entities needed for the lab. Ask students to instantiate each term using a camera driver and image stream. Defer services and actions.", [ROS_NODE, ROS_INTERFACES, ROS_QOS, "OpenAI ImageGen: technical ROS 2 entity and contract illustration"]),
  },
  4: {
    title: "Essential introspection commands",
    image: image(4, "cli"),
    alt: "Technical illustration of terminal-based graph inspection.",
    bodySize: 17.5,
    body: [
      command("ros2 node list", "Enumerate runtime participants"),
      command("ros2 topic list -t", "Enumerate streams and types"),
      command("ros2 topic info -v <topic>", "Inspect endpoints and QoS"),
      command("ros2 topic echo <topic> --once", "Sample one message"),
      command("ros2 topic hz / bw <topic>", "Measure rate and throughput"),
      command("ros2 bag info . / play .", "Inspect and replay a recording"),
    ],
    notes: notes("Demonstrate the recurring command grammar and ros2 <verb> --help. Students will use these commands repeatedly; avoid exhaustively teaching options.", [ROS_NODE, ROS_INTERFACES, ROS_BAG, "OpenAI ImageGen: terminal introspection illustration"]),
  },
  5: {
    title: "Laboratory execution model",
    image: image(5, "terminals"),
    alt: "Professional robotics lab with parallel playback and analysis workstations.",
    body: [
      command("Terminal A", "ros2 bag play . --loop"),
      command("Terminal B", "ros2 node list\nros2 topic list -t"),
      statement("Source the ROS 2 environment in every new shell."),
      statement("Work in pairs; exchange playback and analysis roles midway."),
    ],
    notes: notes("Rosbag playback creates runtime publishers from recorded data. Pair work reduces setup friction while still requiring each student to operate both terminals.", [ROS_BAG, ROS_NODE, "OpenAI ImageGen: dual-terminal robotics laboratory"]),
  },
  6: {
    title: "Environment and dataset verification",
    image: image(6, "environment"),
    alt: "Layered workstation, ROS 2 runtime, terminal environment, and recorded dataset verification.",
    bodySize: 18.5,
    body: [
      linkedLine("Download the course rosbag", DRIVE_URL),
      command("echo $ROS_DISTRO", "Windows cmd: echo %ROS_DISTRO%"),
      command("ros2 bag --help", "Verify the rosbag plugin"),
      command("metadata.yaml + *.db3", "Run commands from the inner bag directory"),
      statement("Use the course Ubuntu VM when native support blocks RViz."),
    ],
    notes: notes("Pause until every pair can identify its active distribution, run ros2 bag --help, and locate both bag files. PowerShell uses $env:ROS_DISTRO. There is no official Krystal release; Crystal Clemmys is EOL, while Kilted Kaiju is current in the release family. Use the supported course environment if compatibility becomes the exercise rather than the data.", [DRIVE_URL, ROS_RELEASES, LOCAL_META, "OpenAI ImageGen: environment and dataset verification illustration"]),
  },
  7: {
    title: "Exercise 1: characterize the recording",
    titleSize: 31,
    image: image(7, "bag"),
    alt: "Recorded sensor archive feeding camera, LiDAR, IMU, GNSS, and pose streams over time.",
    body: [
      command("ros2 bag info ."),
      statement("Determine storage, duration, and total message count."),
      statement("Identify every topic and message type."),
      statement("Predict the dominant bandwidth contributors before playback."),
      statement("Record the assumptions behind the prediction."),
    ],
    notes: notes("Expected evidence: SQLite3, 42.379 seconds, 6,589 messages, and five streams. Camera has 419 Image messages; LiDAR has 475 PointCloud2 messages; IMU has 1,897; GNSS fix and pose have 1,899 each. Ask why message count alone does not determine bandwidth.", [ROS_BAG, LOCAL_META, "OpenAI ImageGen: five-stream rosbag characterization illustration"]),
  },
  8: {
    title: "Exercise 2: reconstruct the runtime graph",
    titleSize: 31,
    image: image(8, "runtime-graph"),
    alt: "Playback process publishing multiple typed streams to analysis subscribers.",
    body: [
      command("ros2 bag play . --loop", "Terminal A"),
      command("ros2 node list", "Terminal B"),
      command("ros2 topic list -t", "Terminal B"),
      statement("Draw the observed publication relationships."),
      statement("Separate stored metadata from runtime discovery evidence."),
    ],
    notes: notes("Students should discover /rosbag2_player and the five recorded topics. The analytical distinction is important: bag info reads a file; node and topic commands interrogate the active DDS graph.", [ROS_NODE, ROS_BAG, LOCAL_META, "OpenAI ImageGen: runtime graph reconstruction illustration"]),
  },
  9: {
    title: "Exercise 3: inspect topic contracts",
    titleSize: 31,
    titleLeft: 96,
    titleWidth: 816,
    bodyLeft: 96,
    bodyWidth: 356,
    image: image(9, "contract"),
    alt: "Typed message schema between publisher and subscriber with Quality of Service compatibility.",
    body: [
      command("ros2 topic type <topic>"),
      command("ros2 interface show <message_type>"),
      command("ros2 topic info -v <topic>"),
      statement("Compare one camera stream with one LiDAR stream."),
      statement("Record type, publisher, reliability, and durability."),
    ],
    notes: notes("Require students to select topics from their own discovery output. They should distinguish Image from PointCloud2 and identify the rosbag player as publisher. The validated Humble host offered BEST_EFFORT and VOLATILE for the camera endpoint.", [ROS_INTERFACES, ROS_QOS, LOCAL_META, "OpenAI ImageGen: typed topic contract illustration"]),
  },
  10: {
    title: "Exercise 4: extract targeted fields",
    titleSize: 32,
    image: image(10, "field-extraction"),
    alt: "Selective extraction of compact metadata from large camera and LiDAR messages.",
    body: [
      command("ros2 topic echo <topic> --once\n  --field <field>"),
      statement("Camera: determine width and height."),
      statement("LiDAR: determine frame_id and point count proxy."),
      statement("Explain why full-message output is a weak diagnostic."),
      statement("Compare results with another pair."),
    ],
    notes: notes("Expected values: camera width 800 and height 600; LiDAR frame velodyne_top_base_link; sampled cloud width approximately 33,111. Point count varies by message. Emphasize precise field queries over dumping binary arrays.", [LOCAL_META, ROS_INTERFACES, "OpenAI ImageGen: targeted message-field extraction illustration"]),
  },
  11: {
    title: "Exercise 5: quantify runtime behavior",
    titleSize: 27,
    image: image(11, "rate-bw"),
    alt: "Scientific traces comparing event frequency, packet size, and throughput at two playback rates.",
    body: [
      command("ros2 topic hz <topic>"),
      command("ros2 topic bw <topic>"),
      statement("Measure camera and LiDAR at 1.0× playback."),
      statement("Predict both measurements at 0.5× playback."),
      statement("Test the prediction and quantify the deviation."),
    ],
    notes: notes("Metadata implies approximately 9.9 Hz for camera and 11.2 Hz for LiDAR at 1.0x. A validated camera sample is roughly 1.92 MB per message. Results vary with CPU, discovery, QoS, and measurement window; at 0.5x, rate and throughput should approximately halve.", [LOCAL_META, ROS_QOS, "OpenAI ImageGen: scientific rate and bandwidth comparison"]),
  },
  12: {
    title: "Exercise 6: test QoS compatibility",
    titleSize: 32,
    bodyLeft: 96,
    bodyWidth: 356,
    image: image(12, "qos"),
    alt: "Compatible and incompatible publisher-subscriber delivery contracts.",
    body: [
      command("ros2 topic info -v <camera_topic>"),
      command("ros2 topic echo <camera_topic> --once"),
      command("... --qos-reliability best_effort"),
      statement("Construct a compatible and an incompatible request."),
      statement("Explain why discovery can succeed while delivery fails."),
    ],
    notes: notes("If the CLI automatically selects a compatible sensor-data profile, use RViz reliability settings or an explicitly reliable subscription to create the mismatch. The objective is to separate graph discovery from endpoint compatibility.", [ROS_QOS, LOCAL_META, "OpenAI ImageGen: QoS compatibility boundary illustration"]),
  },
  13: {
    title: "Exercise 7: validate spatial data in RViz",
    titleSize: 31,
    image: image(13, "rviz"),
    alt: "Aligned urban camera imagery and LiDAR point cloud with coordinate frames.",
    body: [
      command("rviz2"),
      statement("Add the camera Image stream; verify reliability."),
      statement("Add the LiDAR PointCloud2 stream."),
      statement("Set the fixed frame from the message header."),
      statement("Capture one view containing both modalities."),
    ],
    notes: notes("Students configure RViz from their own discovered topics. If camera is blank, inspect reliability. If the cloud reports a transform error, set the fixed frame to velodyne_top_base_link. Use the course Ubuntu VM when native macOS or Windows visualization is blocked.", [ROS_QOS, LOCAL_META, "OpenAI ImageGen: camera and LiDAR spatial validation scene"]),
  },
  14: {
    title: "Synthesis: design a range-filtering subscriber",
    titleSize: 30,
    image: image(14, "filter"),
    alt: "LiDAR point cloud with inner and outer radial gates retaining an annular region.",
    body: [
      concept("Input", "sensor_msgs/msg/PointCloud2"),
      concept("Filter", "retain points with 10 ≤ ‖p‖ ≤ 50 m"),
      concept("Output", "preserve frame and timestamp semantics"),
      concept("QoS", "select a policy compatible with the source"),
      concept("Validation", "counts, throughput, and RViz evidence"),
    ],
    notes: notes("Give pairs 15–20 minutes. Require a defensible dataflow and test plan, not implementation unless time permits. Strong answers parse PointCloud2 fields, compute Euclidean radius, preserve the header, select sensor-data QoS, and validate with message counts plus RViz.", [ROS_INTERFACES, ROS_QOS, LOCAL_META, "OpenAI ImageGen: LiDAR annular range-filter visualization"]),
  },
  15: {
    title: "Technical debrief",
    bodySize: 18,
    image: image(15, "synthesis"),
    alt: "Graph, schema, timing, camera, and point-cloud evidence converging into a system model.",
    body: [
      concept("Graph", "publishers, subscribers, and streams"),
      concept("Contract", "message type and QoS"),
      concept("Behavior", "measured rate and throughput"),
      concept("Spatial validity", "frame and display configuration"),
      statement("When data disappears, which command should run first—and why?", { bold: true, color: BLUE }),
    ],
    notes: notes("Collect one evidence-backed answer for each category. Close on the idea that ROS 2 debugging is systematic boundary testing: environment, graph discovery, message contract, observed behavior, then visualization.", [ROS_NODE, ROS_QOS, ROS_BAG, LOCAL_META, "OpenAI ImageGen: evidence-synthesis engineering illustration"]),
  },
};

function setNotes(slide, text) {
  slide.speakerNotes.textFrame.setText(text);
  slide.speakerNotes.setVisible(true);
}

function setTitle(title, text, size = 33) {
  title.position = { left: 48, top: 55, width: 864, height: 78 };
  title.text.set([{ alignment: "left", bulletCharacter: "", marginLeft: 0, indent: 0, runs: [{ run: text, textStyle: { fontSize: `${size}px`, typeface: "Arial", bold: true, color: BLUE } }] }]);
  title.text.style = {
    typeface: "Arial",
    bold: true,
    color: BLUE,
    alignment: "left",
    verticalAlignment: "middle",
    autoFit: "shrinkText",
    wrap: "square",
    insets: { top: 3, right: 6, bottom: 3, left: 6 },
  };
}

function styleBody(body, size = 20) {
  body.text.style = {
    fontSize: size,
    typeface: "Arial",
    color: DARK,
    alignment: "left",
    verticalAlignment: "top",
    autoFit: "shrinkText",
    wrap: "square",
    insets: { top: 4, right: 8, bottom: 4, left: 4 },
    lineSpacing: 1.0,
  };
}

async function addImage(slide, path, alt, position, fit = "contain") {
  const file = await fs.readFile(path);
  const bytes = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
  return slide.images.add({ blob: bytes, contentType: "image/png", alt, fit, position });
}

async function setStandardSlide(slide, slideNumber, spec) {
  const title = slide.placeholders.getItem("title");
  setTitle(title, spec.title, spec.titleSize ?? 33);
  if (spec.titleLeft || spec.titleWidth) {
    title.position = { left: spec.titleLeft ?? 48, top: 55, width: spec.titleWidth ?? 864, height: 78 };
  }

  slide.placeholders.getItem("body").delete();
  const body = slide.shapes.add({
    geometry: "textbox",
    name: `Technical prompts ${slideNumber}`,
    position: { left: spec.bodyLeft ?? 48, top: 158, width: spec.bodyWidth ?? 404, height: 300 },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  body.text.set(spec.body);
  styleBody(body, spec.bodySize ?? 19.5);

  await addImage(slide, spec.image, spec.alt, { left: 490, top: 155, width: 422, height: 300 }, "contain");
  slide.placeholders.getItem("slideNumber").text = String(slideNumber);
  setNotes(slide, spec.notes);
}

async function main() {
  await fs.rm(RENDER_DIR, { recursive: true, force: true });
  await fs.rm(LAYOUT_DIR, { recursive: true, force: true });
  await fs.mkdir(RENDER_DIR, { recursive: true });
  await fs.mkdir(LAYOUT_DIR, { recursive: true });
  const presentation = await PresentationFile.importPptx(await FileBlob.load(STARTER));

  const cover = presentation.slides.getItem(0);
  const coverTitle = cover.shapes.items[0];
  const coverSubtitle = cover.shapes.items[1];
  await addImage(cover, image(1, "hero"), "Autonomous research vehicle instrumented with camera and LiDAR at dusk.", { left: 438, top: 0, width: 522, height: 540 }, "cover");
  coverTitle.position = { left: 54, top: 115, width: 390, height: 170 };
  coverTitle.text.set([
    { spaceAfter: 10, runs: [{ run: "CISC 647", textStyle: { fontSize: "20px", bold: true, color: "#9FD5F2", typeface: "Arial" } }] },
    { spaceAfter: 0, runs: [{ run: "ROS 2 Systems\nInspection", textStyle: { fontSize: "42px", bold: true, color: "#FFFFFF", typeface: "Arial" } }] },
  ]);
  coverTitle.text.style = { alignment: "left", verticalAlignment: "middle", autoFit: "shrinkText", insets: { top: 0, right: 8, bottom: 0, left: 0 } };
  coverSubtitle.position = { left: 56, top: 300, width: 370, height: 125 };
  coverSubtitle.text.set([
    { spaceAfter: 9, runs: [{ run: "LECTURE 1", textStyle: { fontSize: "18px", bold: true, color: "#EF8200", typeface: "Arial" } }] },
    { spaceAfter: 8, runs: [{ run: "Graph discovery, bag replay, and evidence-driven debugging", textStyle: { fontSize: "21px", bold: true, color: "#FFFFFF", typeface: "Arial" } }] },
    { runs: [{ run: "August 27, 2026", textStyle: { fontSize: "15px", color: "#D7E7F2", typeface: "Arial" } }] },
  ]);
  coverSubtitle.text.style = { alignment: "left", verticalAlignment: "top", autoFit: "shrinkText", insets: { top: 0, right: 8, bottom: 0, left: 0 } };
  setNotes(cover, notes("Open with one question: how can we infer the structure and behavior of a distributed robotic system without reading its source code? Establish that the session is primarily laboratory investigation.", [SYLLABUS, `${ROOT}/2026/Presentations/Lecture 8.pptx`, "OpenAI ImageGen: autonomous research vehicle hero image"]));

  const visual = presentation.slides.getItem(1);
  const visualTitle = visual.placeholders.getItem("title");
  setTitle(visualTitle, "ROS 2 as a computational graph", 34);
  visual.placeholders.getItem("slideNumber").text = "2";
  const visualBody = visual.placeholders.getItem("body");
  visualBody.delete();
  await addImage(visual, image(2, "graph"), "Vehicle sensors flowing through typed ROS 2 topics, nodes, Quality of Service, and rosbag storage.", { left: 54, top: 152, width: 852, height: 310 }, "contain");
  setNotes(visual, notes("Use the visual to establish the analytical model: sensors publish typed streams, nodes consume or transform them, QoS governs endpoint compatibility, and rosbag records or replays the traffic.", [ROS_INTERFACES, ROS_QOS, ROS_BAG, "OpenAI ImageGen: ROS 2 sensor-to-bag computational graph"]));

  for (const [numberText, spec] of Object.entries(specs)) {
    const number = Number(numberText);
    await setStandardSlide(presentation.slides.getItem(number - 1), number, spec);
  }

  for (let i = 0; i < presentation.slides.items.length; i += 1) {
    const slide = presentation.slides.getItem(i);
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 2 });
    await fs.writeFile(`${RENDER_DIR}/${stem}.png`, new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(`${LAYOUT_DIR}/${stem}.layout.json`, await layout.text(), "utf8");
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(`${BUILD}/final-montage.webp`, new Uint8Array(await montage.arrayBuffer()));
  const inspect = await presentation.inspect({ kind: "deck,slide,textbox,shape,image,notes,layout", maxChars: 180000 });
  await fs.writeFile(`${BUILD}/final-inspect.ndjson`, inspect.ndjson, "utf8");
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL);
  console.log(JSON.stringify({ final: FINAL, slideCount: presentation.slides.items.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
