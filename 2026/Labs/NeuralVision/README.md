# Neural Vision Lab — MLP, CNN and vision transformer

Three interactive web demos for Lecture 3 of CISC 647 at the University of Delaware. Draw a digit, rotate the network, hover individual neurons to inspect their actual inputs, weights and outputs. The hosted version runs the trained models on your device. The downloadable ROS 2 version sends the same input to three separate model nodes.

The models and web assets are included. After installing the ROS dependencies, running the demos needs **no GPU, PyTorch, npm installation, cloud service, or internet connection**. The current release has been tested on **Ubuntu 22.04 / ROS 2 Humble / Python 3.10**. Other ROS 2 distributions have not been tested.

## Open the web demos

[Open Neural Vision](https://croquembouche.github.io/Intro2AV-CourseContent/) — no installation or ROS server needed.

- [Fully connected network](https://croquembouche.github.io/Intro2AV-CourseContent/?model=mlp)
- [Convolutional network](https://croquembouche.github.io/Intro2AV-CourseContent/?model=cnn)
- [Vision transformer](https://croquembouche.github.io/Intro2AV-CourseContent/?model=transformer)
- [Download the ROS 2 packages](https://croquembouche.github.io/Intro2AV-CourseContent/NeuralVision_student.zip)

Your drawing stays in your browser in the hosted version. A JavaScript worker computes all predictions and intermediate values with the bundled trained weights. The website does not connect to a ROS graph. The local ROS version below uses actual nodes, Image messages and parameter services.

## Get started with ROS 2

If using the student ZIP, unpack it into the Linux filesystem:

```bash
mkdir -p ~/cisc647
unzip ~/Downloads/NeuralVision_student.zip -d ~/cisc647
cd ~/cisc647/neural_vision
```

If using this repository directly, start from `2026/Labs/NeuralVision` instead. The remaining commands are the same. WSL users should build under `~/cisc647`, rather than a Windows or OneDrive mount.

ROS 2 Humble must already be installed. Use Ubuntu's system Python; deactivate Conda before building.

```bash
source /opt/ros/humble/setup.bash
sudo apt update
sudo apt install -y python3-colcon-common-extensions python3-rosdep python3-pytest
# First use only: sudo rosdep init
rosdep update
cd ws
rosdep install --from-paths src --ignore-src -r -y
python3 -c "import sys, rclpy, numpy; print(sys.executable, numpy.__version__)"
colcon build --symlink-install
source install/setup.bash
export ROS_LOCALHOST_ONLY=1
export ROS_DOMAIN_ID=47
ros2 launch neural_vision_demos all.launch.py
```

Open **http://localhost:8773** in a browser on that computer. Keep the launch terminal running. The status should show `ROS 2 · 3/3 models` and the initial example should produce three predictions. Stop the launch with `Ctrl+C` when finished.

Use the **same** `ROS_DOMAIN_ID` and `ROS_LOCALHOST_ONLY` in every terminal for this lab. Localhost-only discovery keeps classmates' independent demos separate. If another application uses port 8773, launch with `port:=8774` and use that URL.

## What to explore

| Demo | What the student can do | Question to think about |
|---|---|---|
| **Fully connected / MLP** | Draw a digit; inspect any of 300 first-layer neurons; see its 784 learned input weights; trace all incoming connections; disable a neuron through a ROS parameter. | Does a bright pixel always increase a neuron's response? What happens when the digit shifts? |
| **Local features / CNN** | Explore six first-layer and sixteen second-layer feature maps; hover a response to reveal its 5 × 5 receptive field and learned weights; inspect max pooling and both fully connected layers; try a leaky activation. | Why reuse the same filter everywhere? What detail disappears when four values become one? |
| **Global connections / transformer** | Inspect 16 image patches, their projected tokens, both blocks and all three attention heads; select a query/key pair, inspect weighted values, and remove position vectors using the model control. | Which patches contribute to this token? Why can heads differ? What is lost without position information? |

The interface uses larger, high-contrast labels and scales its text with the display width. Use **Draw & predict** and **Layers & inspect** to switch the control rail. **Hide** gives the network the full canvas; **Show controls** brings the rail back. Long panels and pinned inspectors scroll without shrinking their text.

The full-window WebGL view follows the interaction of [Adam Harley’s MLP](https://adamharley.com/nn_vis/mlp/3d.html) and [CNN](https://adamharley.com/nn_vis/cnn/3d.html) explorers:

- **Draw with Live enabled:** the network updates while you draw. Uncheck Live to work on a stroke before pressing **Update prediction**. Clear, examples, Center and Shift right send an image immediately.
- **Hover a cube:** see the actual incoming connections, local inputs, learned weights and calculation. **Click** to pin the inspection; press **Esc** to release it.
- **Drag** to orbit, use the **wheel** to zoom, and **right-drag** to pan. Use **Reset view** or **Full screen** when presenting. Long dense layers deliberately extend across the scene; zoom out or pan to inspect their ends.
- **Hide / Show** individual layers to uncover an overlapping feature map. **Choose a unit** provides the same inspection through layer, map/head and unit controls. Units are numbered from 0; maps and heads from 1.
- **Trace connections** animates travel along the selected unit’s real connections. It does not depict training, change the values, or represent the execution timing of the model.
- **Transformer:** each token row has 48 components. Each attention map has 17 query rows × 17 key columns, including CLS at index 0. The inspector shows the selected attention score, its softmax weight, the complete 17-key row, and one dimension of the weighted values. Dashed gold/pink lines for a selected attention cell identify its whole query/key tokens; block-output lines summarize one head’s token mixing. The Attention head selector changes a pinned attention inspection, or the head shown for a block-output token.
- **Change the model:** open this section under **Layers & inspect** for parameter controls. The **ROS 2 package** button opens setup commands and, on the hosted site, the download. These interventions modify a trained network at inference time; they do not retrain it.

Thirty MNIST examples, freehand drawing, centering and a two-pixel shift are included. The first and second guesses always refer to the selected model. Models always choose one of ten digits, including for a blank image. A desktop or laptop with WebGL enabled is recommended for the network and numerical inspection.

The MLP uses **784 → 300 → 100 → 10** nodes. The CNN exposes **all eight stages**, including both convolution/pooling pairs and both hidden dense layers. The transformer exposes the input, projected tokens, two attention stages, two block outputs and the classifier. Model details and visual encodings are documented in [MODEL_CARD.md](MODEL_CARD.md).

## Run the demos separately

Stop the all-model launch before using an individual launch. Each command starts that model and the web bridge; the other tabs show that their model nodes are offline.

```bash
ros2 launch mlp_demo demo.launch.py
ros2 launch cnn_demo demo.launch.py
ros2 launch transformer_demo demo.launch.py
```

Run only one of these commands at a time. To add a model to a running individual demo without opening another server, use a new sourced terminal:

```bash
ros2 run cnn_demo model
```

For a ROS-only run, start model executables directly. The web bridge is a separate executable:

```bash
ros2 run mlp_demo model
ros2 run neural_vision_common web_bridge --ros-args -p port:=8773
```

## Revisit ROS 2

Follow [ROS2_GUIDE.md](ROS2_GUIDE.md) for a short sequence covering nodes, typed topics, publishers/subscribers, parameters, services, launch files and rosbag2. It includes a supplied image publisher that works without the browser. No code needs to be completed before the demos work.

```text
Browser drawing
    ↓ HTTP POST
/neural_web_bridge
    ↓ sensor_msgs/msg/Image on /neural_demo/input
/mlp_model    /cnn_model    /transformer_model
    ↓ each publishes prediction + actual internal values
/neural_demo/<model>/prediction     std_msgs/msg/String (small JSON)
/neural_demo/<model>/activations    std_msgs/msg/String (detailed JSON)
    ↓ ROS subscriptions in the web bridge
Browser 3D network and neuron inspector
```

In ROS mode, the bridge never computes a fallback prediction. The browser runtime is a separate, explicitly configured publishing target; it does not hide stopped ROS nodes. If a model node stops, it stops producing new results. The result's `input_id` combines the Image header's timestamp and source frame, so recorded inputs also update the browser during replay. The header's `frame_id` identifies the source (`digit_canvas` or `mnist_sample`). The bridge exposes one shared image state: multiple tabs connected to the same server share the current input. Each student should launch their own local instance.

## Package map

- `ws/src/mlp_demo`: MLP model executable and individual launch.
- `ws/src/cnn_demo`: CNN model executable and individual launch.
- `ws/src/transformer_demo`: transformer model executable and individual launch.
- `ws/src/neural_vision_common`: NumPy inference, model subscriber logic, image publisher, web bridge, browser assets, weights and numeric tests.
- `ws/src/neural_vision_demos`: launch all three models and one bridge.
- `tools/train_models.py`: optional training and export script for instructors.
- `tests/`: ROS integration, browser inspection checklist and topology calculation checks.

After editing a Python node, stop that launch, rebuild with `colcon build --symlink-install`, source `install/setup.bash` again, and relaunch. Refresh the browser after editing web assets. Rebuild when adding new files so they are installed. If upgrading from the earlier dashboard version, stop the old launch and remove only this lab’s generated `ws/build`, `ws/install` and `ws/log` directories before rebuilding; removed asset symlinks can otherwise persist.

## Build the standalone website

From the lab root, with Python 3, NumPy and Node 22 installed:

```bash
python3 tests/verify_browser.py
python3 tools/build_pages.py --output /tmp/neural-vision-site
python3 -m http.server 8783 --directory /tmp/neural-vision-site
```

Open `http://localhost:8783`. All asset URLs work below a repository path as well as at a domain root. The builder exports the original float32 weights and packages the ROS source for download. It copies only the web files, model exports and student ZIP into its output; it does not publish the repository root. The GitHub Actions workflow checks numerical agreement before each Pages deployment.

## Validation and model details

```bash
# From ws, after building and sourcing:
colcon test --packages-select neural_vision_common --event-handlers console_direct+
colcon test-result --verbose
# With all three models and the bridge running, from the lab root:
python3 tests/verify_ros.py
```

See [MODEL_CARD.md](MODEL_CARD.md) for architecture, measured held-out accuracy, training provenance, limitations and references, and [VALIDATION.md](VALIDATION.md) for release checks. The attention matrices come from a small trained vision transformer; they are not hand-authored maps or object-relationship ground truth.

## Troubleshooting

- **`Package ... not found`:** run the build and source the workspace's `install/setup.bash` in this terminal.
- **`No module named rclpy`:** deactivate Conda, source Humble, and verify `which python3` is `/usr/bin/python3`.
- **Page does not open:** read the launch terminal. Check the port is free; use `port:=8774` if needed. Do not open `index.html` directly: it requires the ROS bridge.
- **Page opens but a model is offline:** check `ros2 node list` and ensure the model and bridge use the same ROS domain. Do not start duplicate model nodes with the same names.
- **CLI parameters appear unchanged in the display:** parameter changes apply to the next image. Press **Update prediction** to recompute. Browser parameter controls do this automatically.
- **VM or WSL networking:** use a browser inside the Linux environment first. WSL localhost forwarding commonly works, but was not tested for this release. To access a course VM from its host, use `host:=0.0.0.0`, then open `http://VM_IP:8773` over the course's trusted local network. The default binds only to loopback.
- **Predictions are wrong:** use a centered, upright digit with similar stroke width to the examples. Explore the failures; the small models are teaching examples, not general object recognizers.
