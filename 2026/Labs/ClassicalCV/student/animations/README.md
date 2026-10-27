# Classical vision: watch one idea at a time

Open one animation at a time. First identify the input image, then watch the highlighted operation and its output. These are instructor demonstrations; no installation, calculation, or worksheet is needed.

| Demonstration | Where to look | Concept to explain |
| --- | --- | --- |
| [Count using a histogram](01_histogram_count.gif) | Watch the image regions and their projected counts. | Compressing an image can make a simple counting problem easier. |
| [Counting failure A](02_histogram_failures_a.gif) | Compare the input arrangement with the counting result. | A shortcut depends on assumptions about the scene. |
| [Counting failure B](03_histogram_failures_b.gif) | Watch where the image no longer separates cleanly into groups. | Different arrangements can confuse the same counting rule. |
| [Close small gaps](04_morphology_closing.gif) | Compare gaps before and after the operation. | A local shape operation can connect broken regions; it can also merge nearby regions. |
| [Move a small window](05_kernel_slide.gif) | Follow the highlighted window across the image. | The same local operation is repeated at different image positions. Do not calculate the window values. |
| [From image to lines](06_edge_pipeline.gif) | Follow the successive outputs from edges to line evidence. | Each stage simplifies the image for the next stage. |
| [Straight lane pipeline](07_lane_straight_pipeline.gif) | Follow which image evidence remains at each stage. | Detecting a lane requires selecting relevant evidence and fitting an appropriate shape. |
| [Curved lane pipeline](08_lane_curved_pipeline.gif) | Compare the curved lane shape with the straight-lane example. | The representation must be able to describe the road shape. |

Pause between animations to explain the visible result in one sentence. The optional ROS 2 starter project is a separate programming activity.
