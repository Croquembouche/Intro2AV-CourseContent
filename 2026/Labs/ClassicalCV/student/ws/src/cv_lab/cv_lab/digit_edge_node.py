"""Student node: Sobel, Canny, and Hough evidence for matrix digits."""

from pathlib import Path

from ament_index_python.packages import get_package_share_directory
import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32MultiArray, String  # noqa: F401


class DigitEdgeNode(Node):
    """Complete edge extraction and ROS wiring; matching is supplied."""

    def __init__(self):
        super().__init__('digit_edge')
        self.data_dir = Path(get_package_share_directory('cv_lab')) / 'data'
        self.declare_parameter('output_dir', '/tmp/cv_lab')
        self.templates = self.load_templates()

        # TODO EDGE-ROS: publish String on /perception/edge_digit_report and
        # subscribe to Int32MultiArray on /perception/digit_matrix using
        # self.receive_matrix.
        raise NotImplementedError('Complete TODO EDGE-ROS')

    @staticmethod
    def normalize_position(matrix):
        """Supplied: translate the foreground box toward the 10x10 center."""
        ys, xs = np.nonzero(matrix)
        if xs.size == 0:
            return matrix.copy()
        shift_x = int(round((9 - (int(xs.min()) + int(xs.max()))) / 2.0))
        shift_y = int(round((9 - (int(ys.min()) + int(ys.max()))) / 2.0))
        transform = np.asarray(
            [[1, 0, shift_x], [0, 1, shift_y]], dtype=np.float32)
        aligned = cv2.warpAffine(
            matrix * 255, transform, (10, 10),
            flags=cv2.INTER_NEAREST, borderValue=0)
        return (aligned > 0).astype(np.uint8)

    @staticmethod
    def extract_edges(matrix):
        """Build the four images shown on the experiment slide."""
        aligned = DigitEdgeNode.normalize_position(matrix)
        image = cv2.resize(aligned * 255, (200, 200),
                           interpolation=cv2.INTER_NEAREST)
        _ = image
        # TODO EDGE-CV: blur image; compute Sobel gx/gy and magnitude; compute
        # Canny; compute line segments with cv2.HoughLinesP. Return
        # (image, magnitude, canny, lines).
        raise NotImplementedError('Complete TODO EDGE-CV')

    @classmethod
    def describe(cls, matrix):
        """Supplied: turn edge images and line angles into one descriptor."""
        _, magnitude, canny, lines = cls.extract_edges(matrix)
        return cls.describe_edges(magnitude, canny, lines)

    @staticmethod
    def describe_edges(magnitude, canny, lines):
        """Supplied: describe the same edge arrays shown in the PNG."""
        small_sobel = cv2.resize(magnitude, (20, 20),
                                 interpolation=cv2.INTER_AREA)
        small_canny = cv2.resize(canny, (20, 20),
                                 interpolation=cv2.INTER_AREA)
        orientation_bins = np.zeros(6, dtype=np.float32)
        if lines is not None:
            for x1, y1, x2, y2 in lines[:, 0]:
                angle = np.arctan2(y2 - y1, x2 - x1) % np.pi
                index = min(5, int(angle / np.pi * 6))
                orientation_bins[index] += float(np.hypot(x2 - x1, y2 - y1))
        return np.concatenate([
            small_sobel.reshape(-1) / 255.0,
            small_canny.reshape(-1) / 255.0,
            orientation_bins / 20.0,
        ])

    def load_templates(self):
        templates = {}
        for digit in range(10):
            matrix = np.loadtxt(
                self.data_dir / f'digit_{digit}.csv', delimiter=',',
                dtype=np.uint8)
            templates[digit] = self.describe(matrix)
        return templates

    def receive_matrix(self, message):
        values = np.asarray(message.data, dtype=np.int32)
        if values.size != 100:
            self.get_logger().error(
                f'Expected 100 values; received {values.size}')
            return
        matrix = (values.reshape(10, 10) > 0).astype(np.uint8)
        image, magnitude, canny, lines = self.extract_edges(matrix)
        descriptor = self.describe_edges(magnitude, canny, lines)
        distances = {
            digit: float(np.abs(descriptor - template).sum())
            for digit, template in self.templates.items()
        }
        prediction = min(distances, key=distances.get)
        line_count = 0 if lines is None else len(lines)
        output_path = self.save_visualization(
            image, magnitude, canny, lines, prediction)
        report_text = (
            f'prediction={prediction}; distance={distances[prediction]:.2f}; '
            f'canny_pixels={int(np.count_nonzero(canny))}; '
            f'hough_segments={line_count}; visualization={output_path}'
        )
        _ = report_text

        # TODO EDGE-PUB: publish report_text as a String.
        raise NotImplementedError('Complete TODO EDGE-PUB')

    def save_visualization(self, image, magnitude, canny, lines, prediction):
        hough_view = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        if lines is not None:
            for x1, y1, x2, y2 in lines[:, 0]:
                cv2.line(hough_view, (x1, y1), (x2, y2), (0, 50, 230), 2)
        sobel_view = cv2.normalize(
            magnitude, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        panels = [image, sobel_view, canny, hough_view]
        labels = ['input', 'Sobel magnitude', 'Canny edges', 'Hough segments']
        canvas = np.full((330, 940, 3), 255, dtype=np.uint8)
        for index, (panel, label) in enumerate(zip(panels, labels)):
            if panel.ndim == 2:
                panel = cv2.cvtColor(panel, cv2.COLOR_GRAY2BGR)
            view = cv2.resize(panel, (210, 210))
            x = 20 + index * 230
            canvas[55:265, x:x + 210] = view
            cv2.putText(canvas, label, (x, 38), cv2.FONT_HERSHEY_SIMPLEX,
                        0.54, (35, 50, 72), 1, cv2.LINE_AA)
        cv2.putText(canvas, f'edge-based prediction = {prediction}',
                    (315, 312), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                    (83, 83, 159), 2)
        output_dir = Path(self.get_parameter('output_dir').value)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / 'edge_digit.png'
        cv2.imwrite(str(output_path), canvas)
        return output_path


def main(args=None):
    rclpy.init(args=args)
    node = DigitEdgeNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == '__main__':
    main()
