from glob import glob
import os

from setuptools import find_packages, setup

package_name = 'cv_lab'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'data'), glob('data/*')),
        (os.path.join('share', package_name, 'launch'), glob('launch/*.py')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='CISC 647 course staff',
    maintainer_email='course@example.edu',
    description='ROS 2 perception micro-experiments for Lecture Perception.',
    license='Apache-2.0',
    extras_require={
        'test': [
            'pytest',
        ],
    },
    entry_points={
        'console_scripts': [
            'digit_recognizer_node = '
            'cv_lab.digit_recognizer_node:main',
            'digit_recognizer_morphology = '
            'cv_lab.digit_recognizer_morphology:main',
            'digit_kernel_node = cv_lab.digit_kernel_node:main',
            'digit_edge_node = cv_lab.digit_edge_node:main',
            'lane_detector_node = cv_lab.lane_detector_node:main',
        ],
    },
)
