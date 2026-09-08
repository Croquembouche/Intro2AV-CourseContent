from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, EmitEvent
from launch.events import Shutdown
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue

def generate_launch_description():
    return LaunchDescription([
        DeclareLaunchArgument('host',default_value='127.0.0.1'),
        DeclareLaunchArgument('port',default_value='8773'),
        Node(package='mlp_demo',executable='model',name='mlp_model',output='screen'),
        Node(package='cnn_demo',executable='model',name='cnn_model',output='screen'),
        Node(package='transformer_demo',executable='model',name='transformer_model',output='screen'),
        Node(package='neural_vision_common',executable='web_bridge',name='neural_web_bridge',
             output='screen',on_exit=[EmitEvent(event=Shutdown(reason='Web bridge stopped'))],parameters=[{'host':LaunchConfiguration('host'),
             'port':ParameterValue(LaunchConfiguration('port'),value_type=int),'default_model':'mlp'}]),
    ])
