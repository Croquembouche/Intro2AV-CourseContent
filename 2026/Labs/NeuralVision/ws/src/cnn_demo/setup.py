from glob import glob
from setuptools import setup,find_packages

setup(name='cnn_demo',version='1.0.0',packages=find_packages(),
    data_files=[('share/ament_index/resource_index/packages',['resource/cnn_demo']),
                ('share/cnn_demo',['package.xml','LICENSE']),
                ('share/cnn_demo/launch',glob('launch/*.py')),
                ('share/cnn_demo/models',glob('models/*')),
                ('share/cnn_demo/web',glob('web/*'))],
    install_requires=['setuptools'],zip_safe=False,
    maintainer='CISC 647 course staff',maintainer_email='course@example.edu',
    description='Interactive neural vision with real ROS 2 message flow.',license='MIT',
    entry_points={'console_scripts':['model = cnn_demo.node:main']})
