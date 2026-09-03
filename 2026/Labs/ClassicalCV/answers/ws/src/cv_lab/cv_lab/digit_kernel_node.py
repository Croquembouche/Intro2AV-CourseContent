"""Recognize matrix digits with two small directional edge kernels."""

from pathlib import Path

from ament_index_python.packages import get_package_share_directory
import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32MultiArray, String


VERTICAL_EDGE_KERNEL = np.asarray(
    [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float32)
HORIZONTAL_EDGE_KERNEL = np.asarray(
    [[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=np.float32)


class DigitKernelNode(Node):
    """Use multiply-and-sum filters as a more local digit descriptor."""

    def __init__(self):
        super().__init__('digit_kernel')
        self.data_dir = Path(get_package_share_directory('cv_lab')) / 'data'
        self.declare_parameter('output_dir', '/tmp/cv_lab')
        self.templates = self.load_templates()
        self.report_publisher = self.create_publisher(
            String, '/perception/kernel_digit_report', 10)
        self.subscription = self.create_subscription(
            Int32MultiArray, '/perception/digit_matrix',
            self.receive_matrix, 10)

    @staticmethod
    def filter_digit(matrix):
        """Return vertical-edge and horizontal-edge response magnitudes."""
        source = matrix.astype(np.float32)
        vertical_edges = np.abs(cv2.filter2D(
            source, cv2.CV_32F, VERTICAL_EDGE_KERNEL))
        horizontal_edges = np.abs(cv2.filter2D(
            source, cv2.CV_32F, HORIZONTAL_EDGE_KERNEL))
        return vertical_edges, horizontal_edges

    @classmethod
    def describe(cls, matrix):
        vertical_edges, horizontal_edges = cls.filter_digit(matrix)
        return np.concatenate([
            vertical_edges.reshape(-1), horizontal_edges.reshape(-1)
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
        vertical_edges, horizontal_edges = self.filter_digit(matrix)
        descriptor = np.concatenate([
            vertical_edges.reshape(-1), horizontal_edges.reshape(-1)])
        distances = {
            digit: float(np.abs(descriptor - template).sum())
            for digit, template in self.templates.items()
        }
        prediction = min(distances, key=distances.get)
        output_path = self.save_visualization(
            matrix, vertical_edges, horizontal_edges, prediction)
        report_text = (
            f'prediction={prediction}; distance={distances[prediction]:.1f}; '
            f'vertical_edge_energy={vertical_edges.sum():.1f}; '
            f'horizontal_edge_energy={horizontal_edges.sum():.1f}; '
            f'visualization={output_path}'
        )
        report = String()
        report.data = report_text
        self.report_publisher.publish(report)
        self.get_logger().info(report_text)

    def save_visualization(self, matrix, vertical_edges, horizontal_edges,
                           prediction):
        canvas = np.full((420, 1040, 3), 255, dtype=np.uint8)
        panels = [
            (matrix.astype(np.float32), 'input'),
            (vertical_edges, 'left-right change -> vertical edges'),
            (horizontal_edges, 'top-bottom change -> horizontal edges'),
        ]
        for index, (data, label) in enumerate(panels):
            normalized = cv2.normalize(data, None, 0, 255,
                                       cv2.NORM_MINMAX).astype(np.uint8)
            view = cv2.resize(normalized, (300, 300),
                              interpolation=cv2.INTER_NEAREST)
            x = 25 + index * 340
            canvas[65:365, x:x + 300] = cv2.cvtColor(
                view, cv2.COLOR_GRAY2BGR)
            cv2.putText(canvas, label, (x, 45), cv2.FONT_HERSHEY_SIMPLEX,
                        0.52, (35, 50, 72), 1, cv2.LINE_AA)
        cv2.putText(canvas, f'edge-template prediction = {prediction}',
                    (320, 405), cv2.FONT_HERSHEY_SIMPLEX, 0.78,
                    (83, 83, 159), 2)
        output_dir = Path(self.get_parameter('output_dir').value)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / 'kernel_digit.png'
        cv2.imwrite(str(output_path), canvas)
        return output_path


def main(args=None):
    rclpy.init(args=args)
    node = DigitKernelNode()
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
