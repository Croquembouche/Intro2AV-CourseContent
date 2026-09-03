"""Student node: repair noisy digits before histogram recognition."""

from pathlib import Path

from ament_index_python.packages import get_package_share_directory
import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32MultiArray, String  # noqa: F401


class MorphologyDigitNode(Node):
    """Complete ROS, morphology, and publish TODOs; support code is supplied."""

    def __init__(self):
        super().__init__('digit_recognizer_morphology')
        self.data_dir = Path(get_package_share_directory('cv_lab')) / 'data'
        self.declare_parameter('operation', 'opening')
        self.declare_parameter('kernel', 'square2')
        self.declare_parameter('case_name', 'digit')
        self.declare_parameter('expected_digit', -1)
        self.declare_parameter('output_dir', '/tmp/cv_lab')
        self.templates = self.load_templates()

        # TODO MORPH-ROS: publish String on /perception/morph_digit_report,
        # publish Int32MultiArray on /perception/morph_digit_matrix, and
        # subscribe to Int32MultiArray on /perception/digit_matrix using
        # self.receive_matrix.
        raise NotImplementedError('Complete TODO MORPH-ROS')

    @staticmethod
    def describe(matrix):
        return np.concatenate(
            [matrix.sum(axis=0), matrix.sum(axis=1)]).astype(np.int32)

    def load_templates(self):
        templates = {}
        for digit in range(10):
            matrix = np.loadtxt(
                self.data_dir / f'digit_{digit}.csv', delimiter=',',
                dtype=np.uint8)
            templates[digit] = self.describe(matrix)
        return templates

    @staticmethod
    def select_kernel(name):
        kernels = {
            'square2': np.ones((2, 2), dtype=np.uint8),
            'horizontal2': np.ones((1, 2), dtype=np.uint8),
            'vertical2': np.ones((2, 1), dtype=np.uint8),
        }
        if name not in kernels:
            raise ValueError(f'Unknown kernel {name}')
        return kernels[name]

    @staticmethod
    def apply_morphology(matrix, operation, kernel):
        """Apply the operation selected by the run script."""
        # TODO MORPH-CV: implement erode, dilate, opening, and closing using
        # cv2.erode, cv2.dilate, and cv2.morphologyEx.
        raise NotImplementedError('Complete TODO MORPH-CV')

    def predict(self, matrix):
        descriptor = self.describe(matrix)
        distances = {
            digit: int(np.abs(descriptor - template).sum())
            for digit, template in self.templates.items()
        }
        prediction = min(distances, key=distances.get)
        return prediction, distances[prediction]

    def receive_matrix(self, message):
        values = np.asarray(message.data, dtype=np.int32)
        if values.size != 100:
            self.get_logger().error(
                f'Expected 100 values; received {values.size}')
            return
        before = (values.reshape(10, 10) > 0).astype(np.uint8)
        operation = str(self.get_parameter('operation').value)
        kernel_name = str(self.get_parameter('kernel').value)
        after = self.apply_morphology(
            before, operation, self.select_kernel(kernel_name))
        before_prediction, _ = self.predict(before)
        prediction, distance = self.predict(after)
        expected = int(self.get_parameter('expected_digit').value)
        case_name = str(self.get_parameter('case_name').value)
        output_path = self.save_visualization(
            before, after, operation, kernel_name, before_prediction,
            prediction, expected, case_name)
        status = 'PASS' if expected < 0 or prediction == expected else 'TRY_AGAIN'
        report_text = (
            f'case={case_name}; operation={operation}; kernel={kernel_name}; '
            f'before_prediction={before_prediction}; prediction={prediction}; '
            f'expected={expected}; status={status}; distance={distance}; '
            f'visualization={output_path}'
        )
        _ = report_text

        # TODO MORPH-PUB: publish flattened `after` on the matrix topic and
        # report_text on the report topic.
        raise NotImplementedError('Complete TODO MORPH-PUB')

    def save_visualization(self, before, after, operation, kernel_name,
                           before_prediction, prediction, expected, case_name):
        canvas = np.full((520, 940, 3), 255, dtype=np.uint8)
        for matrix, x, label in [(before, 45, 'before'), (after, 505, 'after')]:
            view = cv2.resize(255 - matrix * 255, (390, 390),
                              interpolation=cv2.INTER_NEAREST)
            canvas[72:462, x:x + 390] = cv2.cvtColor(
                view, cv2.COLOR_GRAY2BGR)
            cv2.putText(canvas, label, (x, 52), cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, (35, 50, 72), 2)
        cv2.putText(canvas, f'{case_name}: {operation} / {kernel_name}',
                    (220, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.82,
                    (83, 83, 159), 2)
        cv2.putText(canvas, f'prediction {before_prediction}', (45, 500),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.72, (180, 70, 60), 2)
        cv2.putText(canvas, f'prediction {prediction} | expected {expected}',
                    (505, 500), cv2.FONT_HERSHEY_SIMPLEX, 0.72,
                    (45, 135, 80), 2)
        output_dir = Path(self.get_parameter('output_dir').value)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f'morph_{case_name}.png'
        cv2.imwrite(str(output_path), canvas)
        return output_path


def main(args=None):
    rclpy.init(args=args)
    node = MorphologyDigitNode()
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
