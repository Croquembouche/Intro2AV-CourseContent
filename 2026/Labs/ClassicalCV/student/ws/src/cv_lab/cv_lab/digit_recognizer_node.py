"""Student node: naive digit recognition with x/y projection histograms."""

from pathlib import Path

from ament_index_python.packages import get_package_share_directory
import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32, Int32MultiArray, String  # noqa: F401


class DigitRecognizerNode(Node):
    """Complete three short TODOs; validation and drawing are supplied."""

    def __init__(self):
        super().__init__('digit_recognizer')
        self.data_dir = Path(get_package_share_directory('cv_lab')) / 'data'
        self.declare_parameter('output_dir', '/tmp/cv_lab')
        self.templates = self.load_templates()

        # TODO HIST-ROS: create two publishers and one subscriber.
        # Int32 -> /perception/digit_prediction
        # String -> /perception/digit_report
        # Int32MultiArray <- /perception/digit_matrix, callback receive_matrix
        raise NotImplementedError('Complete TODO HIST-ROS')

    @staticmethod
    def describe(matrix):
        """Build the 20-number descriptor taught on the histogram slide."""
        # TODO HIST-CV: count foreground pixels in each column (x histogram)
        # and each row (y histogram), then concatenate the two arrays.
        raise NotImplementedError('Complete TODO HIST-CV')

    def load_templates(self):
        """Supplied: load one 10x10 template for each digit."""
        templates = {}
        for digit in range(10):
            matrix = np.loadtxt(
                self.data_dir / f'digit_{digit}.csv', delimiter=',',
                dtype=np.uint8)
            if matrix.shape != (10, 10):
                raise ValueError(f'digit_{digit}.csv must be 10x10')
            templates[digit] = self.describe(matrix)
        return templates

    def receive_matrix(self, message):
        """Supplied: validate, compare descriptors, and prepare the report."""
        values = np.asarray(message.data, dtype=np.int32)
        if values.size != 100:
            self.get_logger().error(
                f'Expected 100 values; received {values.size}')
            return
        matrix = (values.reshape(10, 10) > 0).astype(np.uint8)
        descriptor = self.describe(matrix)
        distances = {
            digit: int(np.abs(descriptor - template).sum())
            for digit, template in self.templates.items()
        }
        first_match = min(distances, key=distances.get)
        best_distance = distances[first_match]
        best_matches = [d for d, value in distances.items()
                        if value == best_distance]
        ambiguous = len(best_matches) > 1
        prediction = -1 if ambiguous else best_matches[0]
        output_path = self.save_visualization(
            matrix, descriptor[:10], descriptor[10:], prediction,
            best_distance)
        report_text = (
            f'prediction={prediction}; best_matches={best_matches}; '
            f'ambiguous={str(ambiguous).lower()}; distance={best_distance}; '
            f'x_hist={descriptor[:10].tolist()}; '
            f'y_hist={descriptor[10:].tolist()}; visualization={output_path}'
        )
        _ = report_text

        # TODO HIST-PUB: publish prediction as Int32 and report_text as String.
        raise NotImplementedError('Complete TODO HIST-PUB')

    def save_visualization(self, matrix, x_histogram, y_histogram,
                           prediction, distance):
        """Supplied: save the digit and both histograms."""
        canvas = np.full((560, 900, 3), 255, dtype=np.uint8)
        digit = cv2.resize(255 - matrix * 255, (420, 420),
                           interpolation=cv2.INTER_NEAREST)
        canvas[70:490, 40:460] = cv2.cvtColor(digit, cv2.COLOR_GRAY2BGR)
        for index in range(11):
            p = index * 42
            cv2.line(canvas, (40 + p, 70), (40 + p, 490),
                     (190, 190, 190), 1)
            cv2.line(canvas, (40, 70 + p), (460, 70 + p),
                     (190, 190, 190), 1)
        max_count = max(1, int(max(x_histogram.max(), y_histogram.max())))
        for index, count in enumerate(x_histogram):
            x = 505 + index * 35
            height = int(150 * int(count) / max_count)
            cv2.rectangle(canvas, (x, 250 - height), (x + 22, 250),
                          (83, 83, 159), -1)
            cv2.putText(canvas, str(int(count)), (x + 2, 274),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (35, 50, 72), 1)
        for index, count in enumerate(y_histogram):
            y = 315 + index * 20
            width = int(250 * int(count) / max_count)
            cv2.rectangle(canvas, (505, y), (505 + width, y + 13),
                          (52, 144, 220), -1)
            cv2.putText(canvas, str(int(count)), (770, y + 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (35, 50, 72), 1)
        cv2.putText(canvas, 'received 10 x 10 matrix', (40, 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.72, (35, 50, 72), 2)
        cv2.putText(canvas, 'x histogram: count each column', (500, 72),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (35, 50, 72), 2)
        cv2.putText(canvas, 'y histogram: count each row', (500, 305),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (35, 50, 72), 2)
        cv2.putText(canvas, f'prediction = {prediction}', (40, 535),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (83, 83, 159), 2)
        cv2.putText(canvas, f'histogram distance = {distance}', (360, 535),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.72, (35, 50, 72), 2)
        output_dir = Path(self.get_parameter('output_dir').value)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / 'histogram_digit.png'
        cv2.imwrite(str(output_path), canvas)
        return output_path


def main(args=None):
    rclpy.init(args=args)
    node = DigitRecognizerNode()
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
