# Classical perception lab — student code

There are no run or build helper scripts in this package. You will use the ROS 2
command line directly. Work in `ws/src/cv_lab/cv_lab/`: complete the ROS 2
publisher/subscriber TODOs and the perception operation named on the current
slide. Data loading, validation, template comparison, report formatting, and
PNG drawing are supplied.

## Download and unpack

Download `ClassicalCV_student.zip` from the Google Drive link on the setup
slide. Save it in `~/Downloads`, then use a short Linux path:

```bash
mkdir -p ~/cisc647
unzip ~/Downloads/ClassicalCV_student.zip -d ~/cisc647
cd ~/cisc647/cv_lab
ls
```

You should see `inputs`, `msg`, `outputs`, and `ws`. If you use Windows with
WSL, copy the ZIP into the Linux filesystem first; do not build from a long
OneDrive or Windows-mounted path.

## Install the declared dependencies

ROS 2 Humble must already be installed. The starter package declares OpenCV,
NumPy, `rclpy`, `std_msgs`, and `ament_index_python` in `package.xml`, so let
`rosdep` install what is missing:

```bash
source /opt/ros/humble/setup.bash
sudo apt update
sudo apt install -y python3-rosdep python3-colcon-common-extensions unzip
sudo rosdep init       # first use only; skip if it says already initialized
rosdep update
cd ~/cisc647/cv_lab/ws
rosdep install --from-paths src --ignore-src -r -y
```

Verify the Python modules before building:

```bash
which python3
python3 -c "import cv2, numpy, rclpy; print('OpenCV', cv2.__version__)"
```

If `which python3` points to Anaconda or Miniconda, run `conda deactivate`,
source ROS 2 again, and repeat the check. ROS 2 Humble's binary packages are
built for Ubuntu's system Python.

## Create a separate practice package and node

This scratch package is only for seeing what ROS 2 generates. Do not create it
inside the downloaded `cv_lab` workspace.

```bash
source /opt/ros/humble/setup.bash
mkdir -p ~/pkg_practice/src
cd ~/pkg_practice/src
ros2 pkg create cv_practice \
  --build-type ament_python --license Apache-2.0 \
  --node-name practice_node \
  --dependencies rclpy std_msgs ament_index_python
find cv_practice -maxdepth 2 -type f
```

The generated files include `cv_practice/cv_practice/practice_node.py` and a
`practice_node` console entry point in `cv_practice/setup.py`.

## Build the package yourself

From `~/cisc647/cv_lab`:

```bash
source /opt/ros/humble/setup.bash
cd ws
colcon build --symlink-install --packages-select cv_lab
source install/setup.bash
ros2 pkg executables cv_lab
cd ..
```

After you finish the TODOs in the Python file named on the slide, rebuild the
ROS 2 package and source the rebuilt workspace before starting that node:

```bash
source /opt/ros/humble/setup.bash
cd ~/cisc647/cv_lab/ws
colcon build --symlink-install --packages-select cv_lab
source install/setup.bash
cd ..
```

If that node is already running, stop it with `Ctrl+C` before rebuilding it.
Then, for the hands-on test, open three terminals in `~/cisc647/cv_lab`. In
**each new terminal**, run:

```bash
cd ~/cisc647/cv_lab
source /opt/ros/humble/setup.bash
source ws/install/setup.bash
```

Do not start a second copy of a node that is already running.

## First three-terminal checkpoint

Keep all terminals in this folder so `$PWD/outputs` and `msg/d3.yaml` resolve.

```bash
# Terminal 1 — run your node
ros2 run cv_lab digit_recognizer_node --ros-args \
  -p output_dir:="$PWD/outputs"

# Terminal 2 — inspect the graph, then wait for one result
ros2 node list
ros2 topic list -t
ros2 topic info /perception/digit_matrix --verbose
ros2 topic echo --once /perception/digit_report

# Terminal 3 — publish the supplied 10 x 10 matrix
ros2 topic pub --once /perception/digit_matrix \
  std_msgs/msg/Int32MultiArray "$(cat msg/d3.yaml)"
```

The node publishes its report on the topic and writes the supplied visualization
to `outputs/histogram_digit.png`. The `.yaml` files are data, not scripts:
open one to see the exact 100 integers sent by `ros2 topic pub`.

Some multi-input checkpoints deliberately reuse one output filename. Open or
refresh the PNG after each publish command, because the next input replaces it.

Continue with [ROS2_HANDS_ON.md](ROS2_HANDS_ON.md) for the direct commands used
by every experiment. No submission is required.
