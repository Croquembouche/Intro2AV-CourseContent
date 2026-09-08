from glob import glob
from setuptools import setup,find_packages

setup(name='mlp_demo',version='1.0.0',packages=find_packages(),
    data_files=[('share/ament_index/resource_index/packages',['resource/mlp_demo']),
                ('share/mlp_demo',['package.xml','LICENSE']),
                ('share/mlp_demo/launch',glob('launch/*.py')),
                ('share/mlp_demo/models',glob('models/*')),
                ('share/mlp_demo/web',glob('web/*'))],
    install_requires=['setuptools'],zip_safe=False,
    maintainer='CISC 647 course staff',maintainer_email='course@example.edu',
    description='Interactive neural vision with real ROS 2 message flow.',license='MIT',
    entry_points={'console_scripts':['model = mlp_demo.node:main']})
