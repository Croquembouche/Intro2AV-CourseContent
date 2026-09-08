from glob import glob
from setuptools import setup
setup(name='neural_vision_demos',version='1.0.0',packages=[],
    data_files=[('share/ament_index/resource_index/packages',['resource/neural_vision_demos']),
                ('share/neural_vision_demos',['package.xml','LICENSE']),
                ('share/neural_vision_demos/launch',glob('launch/*.py'))],
    install_requires=['setuptools'],zip_safe=False,
    maintainer='CISC 647 course staff',maintainer_email='course@example.edu',
    description='Launch all neural vision demos.',license='MIT')
