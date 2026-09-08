# Revisit ROS 2 through the neural vision demos

These optional experiments accompany Lecture 3. Start from the working demo in the README; there are no TODOs required to use it. Keep the model launch running in Terminal 1.

In **every new terminal**, set the same workspace and discovery settings:

```bash
cd ~/cisc647/neural_vision
source /opt/ros/humble/setup.bash
source ws/install/setup.bash
export ROS_LOCALHOST_ONLY=1
export ROS_DOMAIN_ID=47
```

If using the repository checkout, replace the first path with its `2026/Labs/NeuralVision` directory.

## 1. Packages, executables and nodes

```bash
ros2 pkg executables mlp_demo
ros2 pkg executables cnn_demo
ros2 pkg executables transformer_demo
ros2 pkg executables neural_vision_common
ros2 node list
ros2 node info /cnn_model
```

With the all-model launch, the four persistent nodes are `/mlp_model`, `/cnn_model`, `/transformer_model` and `/neural_web_bridge`. Packages hold code; a node is one running participant in the graph. The launch package starts the participants together.

**Look for:** the CNN node subscribes to `/neural_demo/input` and publishes both `/neural_demo/cnn/prediction` and `/neural_demo/cnn/activations`.

## 2. Follow an image through a typed topic

```bash
ros2 topic list -t
ros2 topic info /neural_demo/input --verbose
ros2 interface show sensor_msgs/msg/Image
ros2 topic echo --once /neural_demo/cnn/prediction
```

Leave the last command waiting, then draw a digit with Live enabled, or press **Update prediction**. The terminal prints a JSON string containing `model`, `prediction`, ten `probabilities`, ten `logits`, `input_id`, `stamp` and `inference_ms`.

The input is `mono8`, 28 pixels wide, 28 pixels high, with 28 bytes per row. White pixels are 255 and black pixels are 0. The model divides those byte values by 255. A standard Image message makes the data compatible with other ROS image publishers. The detailed activation message uses JSON within `std_msgs/msg/String` because each model exposes differently shaped arrays.

**Think about:** the browser and a ROS command-line publisher can provide the same typed input. The neural network does not need to know who published it.

## 3. Publish without the web page

In Terminal 2, wait for the result:

```bash
ros2 topic echo --once /neural_demo/transformer/prediction
```

In Terminal 3:

```bash
ros2 run neural_vision_common publish_sample --ros-args -p digit:=7 -p variant:=0
```

The terminal receives a prediction and the open browser switches to that image. `digit` can be 0–9 and `variant` can be 0–2. These are the first three examples of each class in the official MNIST test split, selected without filtering by model correctness.

Open `ws/src/neural_vision_common/neural_vision_common/sample_publisher.py` to identify `create_publisher`, the Image fields and `publish`. Then find the matching `create_subscription` and callback in `model_node.py`.

## 4. Parameters change the next forward pass

Inspect and change the CNN activation slope:

```bash
ros2 param list /cnn_model
ros2 param get /cnn_model negative_slope
ros2 param set /cnn_model negative_slope 0.1
```

Press **Update prediction**. In the CNN view, hover a convolution response with a negative weighted input: it now remains a small negative value. Pooling still takes the maximum of its four inputs. Restore the trained configuration:

```bash
ros2 param set /cnn_model negative_slope 0.0
```

Recompute after restoring. The training used ReLU; changing to a leaky activation here is an inference intervention, not a demonstration that this newly modified network was trained successfully.

Try the other models:

```bash
# Disable neuron 10 in the MLP's first hidden layer.
ros2 param set /mlp_model disabled_neuron 10
# Restore it.
ros2 param set /mlp_model disabled_neuron -1

# Remove the transformer's learned position vectors.
ros2 param set /transformer_model use_positions false
# Restore them.
ros2 param set /transformer_model use_positions true
```

Open **ROS 2** in the browser’s bottom bar for the same operations. Browser changes call ROS parameter services and automatically publish the current image again. CLI changes wait for the next image.

| Node | Parameter | Accepted values | Trained default |
|---|---|---|---|
| `/mlp_model` | `disabled_neuron` | integer −1 through 299 | −1, all enabled |
| `/cnn_model` | `negative_slope` | floating-point 0.0 through 0.3 | 0.0 |
| `/transformer_model` | `use_positions` | boolean | true |

The common implementation declares all three parameters on every model node to keep the forward-pass interface uniform. Only the parameter listed for that architecture affects its result.

## 5. A service request is different from a topic stream

```bash
ros2 service list -t
ros2 service type /transformer_model/set_parameters
ros2 interface show rcl_interfaces/srv/SetParameters
ros2 service call /transformer_model/set_parameters \
  rcl_interfaces/srv/SetParameters \
  "{parameters: [{name: use_positions, value: {type: 1, bool_value: false}}]}"
```

The response contains `successful: true`. A parameter service returns an explicit response to a request; the image topic continuously distributes inputs to subscribers. Restore `use_positions` to `true` and send a new image.

## 6. Record and replay the exact same input

Keep the models and web bridge running. In Terminal 2:

```bash
ros2 bag record -o my_digits /neural_demo/input
```

Draw three different digits or publish sample digits from Terminal 3. Stop recording with `Ctrl+C`. A bag folder with metadata and a database appears.

```bash
ros2 bag info my_digits
ros2 bag play my_digits
```

The browser follows the replayed images and the models recompute their activations. Do not draw in the browser during playback if you want to follow only the recorded sequence. Use a new bag directory name for each recording.

**Think about:** record once, change a model parameter, then replay the same input. This separates the input change from the model change. Images are not latched; a model started after publication needs a new image or a replay.

## 7. Edit, rebuild, source, run

An optional small change: add a `get_logger().info(...)` in `ModelNode.receive` to print image dimensions, encoding and input ID. Keep the forward-pass code unchanged for this exercise.

Stop the launch, then:

```bash
cd ~/cisc647/neural_vision/ws
source /opt/ros/humble/setup.bash
colcon build --symlink-install
source install/setup.bash
export ROS_LOCALHOST_ONLY=1
export ROS_DOMAIN_ID=47
ros2 launch neural_vision_demos all.launch.py
```

Draw again and inspect the log. Remove the extra per-image logging when finished. The supplied node, topic and parameter names remain the same across all three demos so the repeated commands become familiar.
