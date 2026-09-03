"""Detect straight and curved lane boundaries from a ROS 2 path topic."""

from pathlib import Path

import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


STRAIGHT_CANNY_LOW = 60
STRAIGHT_CANNY_HIGH = 160
HOUGH_THRESHOLD = 48
HOUGH_MIN_LENGTH = 55
HOUGH_MAX_GAP = 35
CURVE_MIN_POINTS = 60


class LaneDetectorNode(Node):
    """Use Canny + Hough for straight lanes and Canny + fitting for curves."""

    def __init__(self):
        super().__init__('lane_detector')
        self.declare_parameter('mode', 'straight')
        self.declare_parameter('output_dir', '/tmp/cv_lab')
        self.report_publisher = self.create_publisher(
            String, '/perception/lane_report', 10)
        self.subscription = self.create_subscription(
            String, '/perception/road_image_path', self.receive_path, 10)

    @staticmethod
    def region_of_interest(image):
        """Keep the lower trapezoid where lane boundaries should appear."""
        height, width = image.shape[:2]
        polygon = np.asarray([[
            (0, height),
            (int(0.38 * width), int(0.48 * height)),
            (int(0.62 * width), int(0.48 * height)),
            (width, height),
        ]], dtype=np.int32)
        mask = np.zeros_like(image)
        color = 255 if image.ndim == 2 else (255,) * image.shape[2]
        cv2.fillPoly(mask, polygon, color)
        return cv2.bitwise_and(image, mask)

    @staticmethod
    def keep_lane_segments(lines):
        """Supplied geometry check: reject nearly horizontal clutter."""
        kept = []
        if lines is not None:
            for x1, y1, x2, y2 in lines[:, 0]:
                if x2 == x1:
                    continue
                slope = (y2 - y1) / float(x2 - x1)
                if 0.35 <= abs(slope) <= 5.0:
                    kept.append((x1, y1, x2, y2))
        return kept

    @staticmethod
    def draw_segments(image, segments):
        """Supplied drawing helper for accepted straight segments."""
        overlay = image.copy()
        for x1, y1, x2, y2 in segments:
            cv2.line(overlay, (x1, y1), (x2, y2), (40, 40, 240), 8)
        return overlay

    @classmethod
    def detect_straight(cls, image):
        """Find straight lane evidence with Canny and HoughLinesP."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(
            blurred, STRAIGHT_CANNY_LOW, STRAIGHT_CANNY_HIGH)
        roi_edges = cls.region_of_interest(edges)
        lines = cv2.HoughLinesP(
            roi_edges, 1, np.pi / 180, threshold=HOUGH_THRESHOLD,
            minLineLength=HOUGH_MIN_LENGTH, maxLineGap=HOUGH_MAX_GAP)
        kept = cls.keep_lane_segments(lines)
        overlay = cls.draw_segments(image, kept)
        return edges, roi_edges, overlay, kept

    @staticmethod
    def fit_curve(lane_y, lane_x, height, width):
        """Fit x = ay^2 + by + c and return drawable in-frame points."""
        if lane_y.size < CURVE_MIN_POINTS:
            return None
        coefficients = np.polyfit(lane_y, lane_x, 2)
        sample_y = np.arange(int(0.49 * height), height)
        sample_x = np.polyval(coefficients, sample_y)
        keep = (sample_x >= 0) & (sample_x < width)
        return np.column_stack(
            [sample_x[keep], sample_y[keep]]).astype(np.int32)

    @classmethod
    def detect_curved(cls, image):
        """Use edge/color evidence and fit x as a quadratic function of y."""
        height, width = image.shape[:2]
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        white = cv2.inRange(hsv, (0, 0, 175), (180, 75, 255))
        yellow = cv2.inRange(hsv, (12, 80, 120), (42, 255, 255))
        color_mask = cv2.bitwise_or(white, yellow)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)
        evidence = cv2.bitwise_and(edges, color_mask)
        evidence = cv2.dilate(
            evidence, np.ones((3, 3), dtype=np.uint8), iterations=1)
        roi_evidence = cls.region_of_interest(evidence)

        ys, xs = np.nonzero(roi_evidence)
        valid = ys > int(0.48 * height)
        ys, xs = ys[valid], xs[valid]
        center = width / 2.0
        left = xs < center
        right = xs >= center
        overlay = image.copy()
        fitted = 0
        for selector, color in [(left, (20, 210, 255)),
                                (right, (40, 40, 240))]:
            points = cls.fit_curve(
                ys[selector], xs[selector], height, width)
            if points is not None and len(points) > 1:
                cv2.polylines(overlay, [points], False, color, 10)
                fitted += 1
        return edges, roi_evidence, overlay, fitted

    def receive_path(self, message):
        image_path = Path(message.data).expanduser().resolve()
        image = cv2.imread(str(image_path))
        if image is None:
            self.get_logger().error(f'Could not load image: {image_path}')
            return
        mode = str(self.get_parameter('mode').value)
        if mode == 'straight':
            edges, evidence, overlay, segments = self.detect_straight(image)
            feature_count = len(segments)
            count_label = 'hough_segments'
            method = 'Canny + HoughLinesP'
        elif mode == 'curved':
            edges, evidence, overlay, feature_count = self.detect_curved(image)
            count_label = 'fitted_curves'
            method = 'Canny/color evidence + quadratic fit'
        else:
            self.get_logger().error('mode must be straight or curved')
            return
        output_path = self.save_visualization(
            image, edges, evidence, overlay, mode, method, feature_count)
        report_text = (
            f'mode={mode}; method={method}; {count_label}={feature_count}; '
            f'input={image_path}; visualization={output_path}'
        )
        report = String()
        report.data = report_text
        self.report_publisher.publish(report)
        self.get_logger().info(report_text)

    def save_visualization(self, image, edges, evidence, overlay, mode,
                           method, feature_count):
        height = 340
        width = int(image.shape[1] * height / image.shape[0])
        panels = [
            cv2.resize(image, (width, height)),
            cv2.cvtColor(cv2.resize(edges, (width, height)),
                         cv2.COLOR_GRAY2BGR),
            cv2.cvtColor(cv2.resize(evidence, (width, height)),
                         cv2.COLOR_GRAY2BGR),
            cv2.resize(overlay, (width, height)),
        ]
        canvas = np.full((775, 2 * width + 45, 3), 255, dtype=np.uint8)
        positions = [(15, 55), (30 + width, 55),
                     (15, 420), (30 + width, 420)]
        labels = ['input image', 'Canny edges', 'road evidence', 'lane result']
        for panel, (x, y), label in zip(panels, positions, labels):
            canvas[y:y + height, x:x + width] = panel
            cv2.putText(canvas, label, (x, y - 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.62, (35, 50, 72), 2)
        cv2.putText(canvas,
                    f'{mode}: {method} | detected features: {feature_count}',
                    (20, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.74,
                    (83, 83, 159), 2)
        output_dir = Path(self.get_parameter('output_dir').value)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f'lane_{mode}.png'
        cv2.imwrite(str(output_path), canvas)
        return output_path


def main(args=None):
    rclpy.init(args=args)
    node = LaneDetectorNode()
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
