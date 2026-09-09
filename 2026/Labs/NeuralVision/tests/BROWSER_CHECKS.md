# Browser interaction checks

Run the all-model ROS launch, then open http://127.0.0.1:8773 in a WebGL-capable desktop browser. Run these checks separately from `verify_ros.py`, since both change the same current image.

1. Draw a 7 with Live checked. The input and activations should update before the pointer is released. First and second guesses update for the selected model.
2. Select Fully connected. The scene contains 784 input nodes, 300 first hidden units, 100 second hidden units and ten outputs. Hover a visible hidden neuron: the popup shows inputs, learned weights, weighted input and activation. Click to pin. Esc releases it.
3. Open Choose a unit. Inspect first hidden unit 150: 784 connections; second hidden unit 10: 300 connections; output 7: 100 connections. Zoom out to see the ends of the long first hidden layer.
4. Select Convolutional. All eight stages appear. Inspect Conv 1 + activation: 25 inputs and a 5×5 weight matrix. Inspect Conv 2 + activation: 150 inputs across six maps; its preview identifies the one map shown. Inspect pooling: four inputs and their maximum. Hide and restore a layer.
5. Select Transformer. Inspect an Attention 1 unit such as 8 (CLS query to patch 8): two dashed whole-token dependencies (gold query / pink key), Q·K score, normalized weight and the full attention row. Change Attention head; the selected head and numbers change. Change Value dimension; the weighted-value bars and dimension label change. Inspect projected-token unit 60: 49 pixel inputs. Inspect a block-output token: 17 grouped token relationships and a residual plus feed-forward calculation. Inspect an output digit: one grouped CLS connection and weighted contributions after LayerNorm. Selecting a different map/head with the unit chooser also updates Attention head.
6. Trace connections: particles trace the displayed scalar connections or grouped token relationships; they do not simulate computation timing. Stop trace stops them. Orbit, pan and wheel zoom change the viewpoint; Reset view restores it. Full screen enters and leaves fullscreen.
7. Use Clear, Draw, Erase, sample dropdown, Next, Center and Shift right. Disable Live and check that manual drawing waits for Update prediction. The Network input preview and prediction stay unchanged, the status says the drawing changed, and Update prediction makes the preview match again. Clear, examples and transforms send immediately, as documented.
8. Open Layers & inspect → Change the model. Disable MLP unit 10, then restore −1. Set the CNN slope to 0.1, then restore 0. Change transformer positions off, then restore them. New activation messages must return the changed parameter values. Confirm with `ros2 param get` or `/api/state`.
9. Open Models & credits and confirm the current architectures and measured accuracies. Check browser console and network requests for errors.
10. At narrow widths, use Draw & predict / Layers & inspect / Hide and confirm each panel is reachable and the model tabs read MLP / CNN / Transformer. Confirm the large type stays readable, output labels do not overlap at the initial camera, and pinned inspectors can scroll. Use a desktop or laptop for detailed inspection; the network supports zoom and pan, and the side panels may cover part of the initial view.

The `#scene` element exposes `data-node-count`, `data-visible-layers` and `data-connection-count` for read-only accessibility/debug inspection. Expected total nodes: MLP 1,194; CNN 9,134; transformer 4,976. Expected initial visible layers: 4, 8 and 7.

Release-specific evidence and outcomes are in `VALIDATION.md` and `design-qa.md`. The topology math can be independently checked with `node tests/verify_topology.mjs` (Node 22; all models running).


11. On a model's first visit, check that title, diagram, layer choices and model controls change together while inspection weights load. In a developer QA tab, temporarily block that model's `models/<name>.json` URL, switch to it, and confirm that the previous model never remains under the new title. Remove the block and reselect the model; inspection should recover and the error should clear.
