"""Launch the five nodes used by the classical perception deck."""

from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    """Return the progressive digit-to-lane practice graph."""
    return LaunchDescription([
        Node(
            package='cv_lab',
            executable='digit_recognizer_node',
            output='screen',
        ),
        Node(
            package='cv_lab',
            executable='digit_recognizer_morphology',
            output='screen',
        ),
        Node(
            package='cv_lab',
            executable='digit_kernel_node',
            output='screen',
        ),
        Node(
            package='cv_lab',
            executable='digit_edge_node',
            output='screen',
        ),
        Node(
            package='cv_lab',
            executable='lane_detector_node',
            output='screen',
        ),
    ])
