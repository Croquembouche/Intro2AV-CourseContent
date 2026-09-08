# Design QA — 3D explorer revision

**Result: passed for the requested reference-based desktop experience.** Reviewed on 8 September 2026 in the in-app Chromium browser.

## Reference and comparison

The visual targets were Adam Harley’s [MLP](https://adamharley.com/nn_vis/mlp/3d.html) and [CNN](https://adamharley.com/nn_vis/cnn/3d.html) demos. Both live pages were opened and exercised, including drawing and CNN neuron inspection. Source and implementation screenshots were reviewed together at 1280×720, with a hand-drawn seven and the default camera. Narrow layouts were captured at 390×844.

Instructor-local evidence is under `.build/neural-vision/` in the repository root: `reference/mlp-desktop.png`, `reference/cnn-desktop-1280.png`, `reference/cnn-hover.png`, and `v2/mlp-desktop.png`, `v2/cnn-desktop.png`, `v2/cnn-hover.png`, `v2/transformer-hover.png`, `v2/mobile.png`. Evidence and source-page captures are excluded from the student archive.

## Findings resolved

- Replaced the white dashboard and small canvas overview with a full-window, dark blue WebGL scene.
- Matched the layered spatial composition: input at the bottom, hidden stages above, output digits at the top. Replaced shortened/sampled overview rows with individually selectable units.
- Enlarged dense neurons and CNN maps after the first comparison showed that the network was too small. Corrected MLP input depth so it remains above the bottom controls.
- Matched the MLP’s 784/300/100/10 counts and the CNN’s six/sixteen-map, two-pool, two-hidden-layer structure.
- Added direct hover/click inspection with complete incoming connections, local input/weight grids, weighted input, activation and pooling calculations.
- Fixed overlapping output labels, a stale asset build, numeric parameter inputs, transformer value-dimension updates and attention-head selection.
- Retained live freehand drawing, first/second guesses, layer Hide/Show and orbit/zoom/pan. Added a keyboard-accessible unit selector and a connection-trace animation.

## Deliberate differences

The university/CAR header, model tabs, ROS status/dialog, sample controls and keyboard unit selector remain as course features. Their compact panels differ from the larger source controls. Output labels are enlarged for legibility. The models use separately trained ReLU weights, so activation colors and predictions do not reproduce the source models exactly. The transformer is an original companion with the same interaction pattern.

Desktop inspection is the primary target. On a phone-sized view, controls remain reachable and the document does not overflow horizontally; the network extends beyond the camera edges and can be zoomed/panned. The source also needs zoom/pan at narrow widths. This is not a claim of pixel-identical reproduction or touch-device classroom validation.

## Interaction evidence

Verified direct CNN selection, pin/release, 784/300/100 MLP connections, 25/150 CNN convolution inputs, four pooling inputs, 49-pixel patch projection and 17-token attention rows. Head changes update the displayed attention score; value dimension changes update its label and bars. Trace, layer hiding, live drawing, manual send, erase, examples, centering, shift, orbit, wheel zoom, reset and fullscreen were exercised. Actual browser runtime confirmed fullscreen entry and exit. The parameter controls were checked against the ROS model’s returned parameter values and restored afterward. No browser warning/error logs were recorded during final interaction checks.

## Readability follow-up — 8 September 2026

**Result: passed.** The user requested larger, clearer text while retaining the approved 3D explorer. Before/after captures from the same Chrome tab and viewport were reviewed together. The files are in `.build/neural-vision/readability/` alongside laptop inspector captures.

Replaced the previous 9–12 px control text with a responsive 18–26 px base, larger control targets, solid high-contrast panels, labeled drawing buttons, and separate bordered badges for map/head and output labels. On the user's 2466×1204 CSS-pixel viewport, layer text measures about 24.7 px and output labels about 32.9 px. Filter and attention canvases now render text at their displayed resolution and choose light/dark numeric text from the actual cell luminance.

At 1280×800 CSS pixels, the drawing's Send image action is visible without scrolling, output labels do not overlap, and the document has no horizontal overflow. The CNN and transformer inspectors were opened, including the attention value-dimension control. On a 400×840 layout, Drawing / Layers / Hide panels work, model names shorten to MLP / CNN / Transformer, and the layer text remains 17 px. Longer panels and pinned inspectors scroll. The QA viewport override was reset; the user's browser zoom preference was preserved. No application warning/error logs occurred in the final browser check.

These changes intentionally increase the panel and label sizes relative to the earlier reference match, following the user's readability request. Network inference and ROS behavior are unchanged.

## UI redesign and hosted runtime — 2026-09-08

Source: `.build/neural-vision/pages/before.png` (the accepted 3D explorer, 1280 × 720). Implementation captures: `.build/neural-vision/pages/after.png`, `transformer-inspection.png`, `phone-controls.png`, and `phone-network.png`. The source and implementation use the same desktop viewport and density; the before capture shows the pre-existing ROS drawing and the after capture uses the supplied 7, so neuron brightness is not a design comparison. The deliberate redesign retains the actual 3D engine, CAR artwork, type scale and hover/pin interaction while replacing two overlapping panels with one switchable rail.

- Typography: Arial retained, 18 px base scaling with wider displays; output labels retain the larger 24 px baseline. Light controls have dark text, and canvas controls use light text on navy.
- Layout: a dedicated control rail reserves canvas space; the model title and short interaction prompt sit outside the scene. All model tabs and canvas controls remain reachable on a 400 × 840 viewport.
- Tokens: navy stage and UD blue/gold accents continue the course identity. The light rail separates controls from data without covering the network.
- Images: the original CAR asset, vendored Lucide icons and actual WebGL data are retained. No screenshot replaces the interactive network.
- Copy: labels describe student actions; browser and ROS execution modes are explicit. Model interventions move to Layers & inspect.

Comparison history: the first desktop render put Update prediction below the initial fold. Tightening the compact-height rail spacing corrected this while keeping the 18 px base size. The revised 1280 × 720 capture shows the complete drawing workflow, with the Update prediction button ending at y=659 inside the rail ending at y=668. The narrower reserved canvas also required expanding output-layer spacing from 140 to 170 world units; measured label gaps are now at least 4.67 px in the MLP view. The full view plus CNN/transformer inspector captures cover overall composition and detailed numerical text.

Final result: passed.
