# Release validation — 8 September 2026

The revised full-window 3D explorer was checked on Ubuntu 22.04, ROS 2 Humble, system Python 3.10 and the in-app Chromium browser. All-model tests used localhost-only discovery and ROS domain 47.

| Check | Result |
|---|---|
| ROS package build | All five packages build with colcon |
| Numerical tests | 10 tests passed; zero failures, errors or skips |
| Export fidelity | NumPy logits match the shipped PyTorch references for 40 held-out images per architecture, with identical predicted classes; absolute/relative tolerance 0.00002 |
| Browser inspection calculations | 114 inspected units checked across all three architectures: valid source indices, dense sums, convolution products, pooling maxima, Q·K scores and weighted values |
| All visible stages | 1,194 MLP nodes / 4 layers; 9,134 CNN nodes / 8 layers; 4,976 transformer cells / 7 stages |
| Browser interaction | Live freehand inference before pointer release, manual send, clear/draw/erase, examples, center/shift, model switching, direct neuron picking, pin/release, layer visibility, trace, camera controls and fullscreen exercised |
| Transformer controls | Head changes alter attention scores; value-dimension changes alter the weighted-value visualization; projected patch has 49 source pixels |
| ROS parameter round trips | MLP disable/restore, CNN negative slope change/restore and transformer position removal/restore verified in the returned activation messages |
| ROS graph | Direct Image publication → all three prediction topics → web subscriptions verified for supplied digits 3, 7 and 1 |
| Malformed image | Rejected without killing a model; a subsequent valid image was processed by all three nodes |
| rosbag2 | Recorded the Image topic and replayed it; all three models generated fresh predictions from the recording |
| Visual QA | Source and implementation compared together at 1280×720; narrow layout checked at 390×844 with no document-level horizontal overflow; see design-qa.md |
| Browser diagnostics | No warning/error logs during the final interaction checks |
| Student distribution | Fresh extraction built all five packages without symlinks and passed the same 10 tests; ZIP integrity and model checksums passed |

The ROS integration probe verifies message transport and recovery, not that every digit is classified correctly. For the checked first example of digit 3, MLP and CNN predicted 8 while the transformer predicted 3. All three recognized the checked 7 and 1. The model card reports accuracy over the complete official test set, not only these examples.

JSON display tensors are rounded to six decimals; independent browser-connection sums use an absolute plus relative tolerance of 0.00002. The NumPy/PyTorch reference tests run on the full-precision arrays.

To repeat numerical checks from the sourced workspace:

```bash
colcon test --packages-select neural_vision_common --event-handlers console_direct+
colcon test-result --verbose
```

From the lab root, with all models and the bridge running:

```bash
python3 tests/verify_ros.py --bag-dir /tmp/neural_vision_validation_bag
node tests/verify_topology.mjs
```

Use a new bag directory. Node 22 is needed only for the optional topology test, not for running the demos. Browser steps are in `tests/BROWSER_CHECKS.md`. Run browser and ROS tests sequentially: both change the same current image. Individual launch wrappers were checked in the earlier release; this revision's fresh runtime validation used the all-model launch.

Jazzy, native Windows/macOS ROS, WSL forwarding, remote VM networking and physical touch devices were not tested. This localhost service shares one current image among connected browser tabs; each student should run a separate local instance. The models classify MNIST-style digits, not driving scenes.

The final ZIP contains 77 files, including five ROS packages, the trained weights, all local WebGL/icon assets and licenses, guides and tests. Build/install/log folders, recordings, old dashboard files and instructor reference captures are excluded. That build verified the 3D explorer release before the readability-only follow-up below.

## Readability-only follow-up

The current archive includes the enlarged responsive UI, sharper numeric canvases, wider output-label spacing and narrow-screen panel switching. Verified the large display (2466×1204 CSS pixels), laptop (1280×800), and narrow layout (400×840), including inspector rendering and attention value-dimension interaction. The document has no horizontal overflow in the checked layouts; output labels do not overlap at the laptop's initial camera. JavaScript syntax and served-asset equality were checked, and the archive was regenerated.

The ROS Python code, model weights and numerical fixtures are unchanged from the five-package build and ten-test validation above. Those tests were not repeated for this UI-only edit. See `design-qa.md` for the measured type sizes and browser evidence.

## Browser publication and UI redesign — 2026-09-08

- All five ROS 2 packages rebuilt successfully with the new shared web assets. The ten numeric ROS-package tests passed, and all 114 inspected-node topology checks passed against the running ROS bridge. This revision did not change ROS message handling or model weights.
- The independent browser parity suite passed 133 cases and 249,185 numeric comparisons, including held-out PyTorch logits and full intermediate tensors for selected inputs. Maximum absolute difference: 0.000005514. It also exercised 828 inspector records, pool reductions and attention row / weighted-value calculations.
- The standalone site runs under a path prefix with relative asset URLs and no ROS endpoint. All three models use a worker and the same exported weights. The local version explicitly retains ROS mode.
- Browser QA covered the prediction rail, model tabs, layer controls, actual CNN filter products, transformer head/dimension selection, position-vector removal, and the 400 × 840 phone view. Pinned inspectors scroll; the control rail can be hidden and restored. See the dated design QA entry for screenshots and layout checks.
- The public build copies only approved web assets, exported weights and the student archive. Model references, source files and training tools are available in the student ZIP, which excludes build/install/log products and private render folders. ZIP entries use fixed timestamps so local and CI archives can be compared.
- GitHub Actions runs the browser parity suite before building and deploying the Pages artifact.
