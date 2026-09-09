# Model card and credits

## Intended use

Small, inspectable handwritten-digit classifiers for conceptual teaching of MLPs, CNNs and vision transformers. Every activation, filter weight, Q/K/V vector, attention matrix and class score displayed by the interface comes from the included trained model. The code is an original implementation inspired by the interaction pattern of Adam Harley's visualizations.

These are **MNIST digit classifiers**, not road-object detectors. The transformer is a compact vision transformer, not a language model. Keeping the same digit task lets students compare architectures without changing the input or the prediction target.

## Architectures

| Model | Forward pass | Parameters | Held-out test accuracy |
|---|---|---:|---:|
| MLP | 784 → Linear 300 → ReLU → Linear 100 → ReLU → Linear 10 | 266,610 | 97.76% |
| CNN | Pad 28×28 to 32×32 → Conv 5×5, 6 channels → ReLU → max pool 2×2 → Conv 5×5, 16 channels → ReLU → max pool 2×2 → flatten 400 → Linear 120 → ReLU → Linear 100 → ReLU → Linear 10 | 63,802 | 98.54% |
| Vision transformer | 16 patches of 7×7 → linear projection to 48 values → prepend learned CLS → add 17 learned position vectors → two transformer blocks → final layer norm → CLS classification head | 41,770 | 97.19% |

Each transformer block uses pre-layer normalization, three attention heads of 16 values each, scaled dot-product attention, output projection, a residual addition, another layer norm, a 48→96→48 feed-forward network with GELU, and another residual addition. The GELU uses PyTorch's tanh approximation. LayerNorm epsilon is 1e-5. All ten output logits are converted to softmax scores for display.

Convolution is the cross-correlation convention used by PyTorch (the kernel is not flipped). The inspector includes zero padding, learned bias and the actual activation. Pooling has stride 2. Its maximum can be negative after the leaky-activation intervention.

The MLP layer counts and CNN six/sixteen-map layout match the supplied Harley references. This release uses separately trained ReLU networks; the originals use different weights and activation functions. The transformer is an original companion in the same interaction style. This is not a port of the original models.

## Training and measurement

- Dataset: original MNIST, obtained using `torchvision.datasets.MNIST` from its public mirrors.
- Fixed random seed: 647. A randomized split of the 60,000 training images gives 55,000 training and 5,000 validation examples.
- The official 10,000-image test split is held out. The best validation epoch is selected before one final test evaluation per model.
- Inputs are 28×28 grayscale divided by 255, without mean/standard-deviation normalization.
- Training augmentation: a random integer translation of up to two pixels along each axis, with zero fill. The same translation applies to each image within a batch.
- AdamW: learning rate 0.002, weight decay 0.01, batch size 256; six epochs for the MLP/CNN and twelve for the transformer.
- Training environment for this release: Python 3.10, PyTorch 2.11.0, torchvision 0.26.0, an NVIDIA RTX 3080. The local student runtime uses ROS 2 and NumPy. The hosted website uses an equivalent JavaScript forward pass in a browser worker, with the same float32 weights exported as JSON.
- Exported `.npz` files contain float32 weights. The NumPy inference implementation matches the exported PyTorch model's reference logits on 40 held-out examples within the checked absolute/relative tolerance of 0.00002, with identical predicted classes in the release check.
- `models/metrics.json` contains validation histories, test accuracy, parameter counts, training configuration and weight checksums. These are single-run measurements for these specific small networks, not evidence that one architecture is generally superior.
- Thirty sample drawings are the first three images of each digit class in the MNIST test set. They were not selected for high model confidence or correctness. The reference fixtures also contain MNIST test images.

To reproduce from the repository root (in an instructor environment with PyTorch and torchvision installed):

```bash
/usr/bin/python3 2026/Labs/NeuralVision/tools/train_models.py
```

From an unpacked student lab directory, supply output paths explicitly:

```bash
python3 tools/train_models.py --data /tmp/neural_vision_mnist \
  --output ws/src/neural_vision_common/models
```

Retraining is optional and needs dataset downloads. GPU and library differences can change the final weights; the shipped checksums identify the evaluated release.

## How to interpret the visualization

- The MLP shows all 784 inputs, 300 first hidden units, 100 second hidden units and 10 outputs. Selecting a neuron draws **all incoming connections**, including small and negative weights. Dense layers may extend beyond the initial camera framing; zoom out or pan. A disabled neuron is an explicit intervention; ReLU does not delete links.
- Feature maps use per-map color scaling to reveal spatial structure. Equal colors across different maps do not necessarily mean equal numerical values. The inspector reports the values for the selected map and window.
- The CNN displays every convolution, pool, hidden dense layer and output. Its spatial sizes are 32 → 28 → 14 → 10 → 5. First-layer responses use 25 input values; second-layer responses use 150 across all six source maps. The second-layer popup previews map 1 while its sum and connections include all six maps. Pooling connects four inputs; all tied maxima are marked, and their values are not summed. Convolution maps show responses after ReLU (or the selected leaky activation).
- The transformer token matrices show signed activation values. Attention rows are normalized over all 17 tokens, including CLS; the image attention grid shows the 16 patch weights and lists the CLS weight separately.
- A selected attention cell has two dashed whole-token dependencies: query (gold) and key (pink). The Q/K score is scaled and normalized over the entire 17-key row. Each line spans the source token’s 48 features; it does not start at an arbitrary feature. Block-output views use gold dashed lines to summarize one head’s token mixing into the whole output token, while the selected scalar reports its actual residual plus feed-forward value. The classifier groups CLS and computes contributions after the final LayerNorm.
- The attention inspector displays **one selected dimension** of the head's value vectors. The model mixes all 16 dimensions, concatenates all three heads, projects, then applies residual and feed-forward operations.
- Attention weights are learned mixing coefficients. They are not guaranteed explanations of why a prediction was made, and digit patches do not represent labeled scene objects.
- No training occurs in the browser. Changing the ReLU slope, disabling a neuron or removing positions is an inference ablation. It may make a trained network worse.
- The small Network input preview belongs to the displayed network and prediction. With Live off, edits stay on the drawing pad and a status marks them as pending until Update prediction. Clear, examples and transforms still send immediately. The drawing pad does not silently center inputs. Use **Center** when desired; this fits the drawing to a 20×20 bounding box inside the 28×28 image. Shifts remain visible in the actual input.
- The models always choose among ten digits. A blank canvas or unfamiliar drawing can receive a confident but meaningless prediction; there is no unknown/blank class or calibrated uncertainty estimate.

Solid scalar connections are cyan for nonnegative weights and purple for negative weights, with intensity scaled by magnitude. Pooling uses brighter links for values equal to the maximum. Feature-map colors are normalized per map. The trace animation travels along these connections without simulating inference timing.

## References and attribution

- Adam W. Harley, *An Interactive Node-Link Visualization of Convolutional Neural Networks*, ISVC 2015. [Project and original interactive demos](https://adamharley.com/nn_vis/). The draw-and-inspect interaction inspired this lab; no Harley JavaScript, trained weights or visual assets were copied.
- Yann LeCun, Corinna Cortes and Christopher J. C. Burges, [MNIST handwritten digit database](https://yann.lecun.com/exdb/mnist/). [CVDF dataset mirror and provenance](https://github.com/cvdfoundation/mnist). The included sample and reference images originate from MNIST; they are separate from the original application code.
- Alexey Dosovitskiy et al., [An Image is Worth 16×16 Words: Transformers for Image Recognition at Scale](https://arxiv.org/abs/2010.11929), ICLR 2021. This teaching model uses smaller 7×7 patches and a much smaller network.
- Ashish Vaswani et al., [Attention Is All You Need](https://arxiv.org/abs/1706.03762), NeurIPS 2017, for scaled dot-product multi-head attention.
- [Three.js](https://threejs.org/), version 0.180.0, provides WebGL rendering and OrbitControls. Its files and MIT license are bundled locally.
- [Lucide](https://lucide.dev/), version 0.468.0, provides the interface icons, bundled with its ISC license.
- [ROS 2 Humble publisher examples](https://github.com/ros2/examples/tree/humble/rclpy/topics/minimal_publisher) and the installed ROS 2 Humble APIs.

University of Delaware branding and the CAR Lab logo are from the existing course materials. They are not licensed as part of the source-code license. Original application and training code is provided under the accompanying MIT license; third-party data and institutional marks retain their respective rights.

## Hosted browser runtime

The browser release passes 133 cases against the NumPy implementation and held-out PyTorch logits, including all exposed intermediate tensors for selected examples, blank and full inputs, neuron disabling, leaky activations and position-vector removal. The measured maximum absolute difference across 337,913 checked values is 0.000005514. JavaScript uses double-precision arithmetic; the ROS reference uses float32, so small rounding differences are expected. The hosted version does not publish ROS messages or contact a ROS bridge. Drawings are processed on the student’s device.

The 2026-09-09 consistency audit checks every displayed unit for one reference image per model, then selected units for additional inputs and interventions: 16,018 inspected units. It reconstructs dense/convolution sums, pooling maxima, patch projections, Q/K scores, attention-weighted values, residual additions and the normalized CLS head. These finite tests provide evidence of agreement, not a proof for every possible image.

## Relation to Lecture 3

The lecture uses small examples to introduce ideas, including 3×3 neighborhoods and an illustrative number of output classes. The CNN demo uses trained 5×5 filters and all three demos predict the ten digits 0–9. The demos cover a fully connected baseline, a compact CNN and a compact global-attention ViT. They do not implement the lecture’s FPN, ResNet or shifted-window Swin examples. Changing activation slope demonstrates inference after an intervention; it does not demonstrate training or prove leaky ReLU improves the model.
