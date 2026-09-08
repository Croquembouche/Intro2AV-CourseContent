from glob import glob
from setuptools import setup,find_packages

setup(name='neural_vision_common',version='1.0.0',packages=find_packages(),
    data_files=[('share/ament_index/resource_index/packages',['resource/neural_vision_common']),
                ('share/neural_vision_common',['package.xml','LICENSE']),
                ('share/neural_vision_common/launch',glob('launch/*.py')),
                ('share/neural_vision_common/models',glob('models/*')),
                ('share/neural_vision_common/web',glob('web/*'))],
    install_requires=['setuptools'],tests_require=['pytest'],zip_safe=False,
    maintainer='CISC 647 course staff',maintainer_email='course@example.edu',
    description='Interactive neural vision with real ROS 2 message flow.',license='MIT',
    entry_points={'console_scripts':['web_bridge = neural_vision_common.bridge:main', 'publish_sample = neural_vision_common.sample_publisher:main']})
