"""Image subscriber -> real model forward pass -> prediction and activation publishers."""
import json
import time
import numpy as np
import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy
from rcl_interfaces.msg import SetParametersResult
from sensor_msgs.msg import Image
from std_msgs.msg import String
from ament_index_python.packages import get_package_share_directory
from .inference import Network, serial, image_id

class ModelNode(Node):
    def __init__(self, model):
        super().__init__(model + '_model')
        self.model = model
        self.network = Network(model, get_package_share_directory('neural_vision_common') + '/models')
        self.declare_parameter('disabled_neuron', -1)
        self.declare_parameter('negative_slope', 0.0)
        self.declare_parameter('use_positions', True)
        self.add_on_set_parameters_callback(self.validate_parameters)
        topic = '/neural_demo/' + model
        self.prediction = self.create_publisher(String,topic+'/prediction',10)
        self.activations = self.create_publisher(String,topic+'/activations',10)
        # BEST_EFFORT subscriber accepts both reliable browser input and sensor-style publishers.
        self.input_sub = self.create_subscription(Image,'/neural_demo/input',self.receive,
            QoSProfile(depth=1,reliability=ReliabilityPolicy.BEST_EFFORT))
        self.get_logger().info(f'{model.upper()} ready: /neural_demo/input -> {topic}/prediction')

    def validate_parameters(self, params):
        allowed = {'disabled_neuron':lambda v:type(v) is int and -1 <= v < 300,
                   'negative_slope':lambda v:type(v) is float and 0 <= v <= .3,
                   'use_positions':lambda v:type(v) is bool}
        for param in params:
            if param.name in allowed and not allowed[param.name](param.value):
                return SetParametersResult(successful=False,reason='Parameter outside its documented range')
        return SetParametersResult(successful=True)

    def receive(self, msg):
        if msg.height != 28 or msg.width != 28 or msg.encoding != 'mono8' or msg.step < 28 or len(msg.data) != msg.step*28:
            self.get_logger().warning('Expected a 28 x 28 mono8 image; ignored malformed input.')
            return
        start = time.perf_counter()
        image = np.frombuffer(bytes(msg.data),dtype=np.uint8).reshape(28,msg.step)[:,:28].astype(np.float32)/255
        result = self.network.forward(image, **{n:self.get_parameter(n).value for n in
                    ('disabled_neuron','negative_slope','use_positions')})
        result.update(input_id=image_id(msg),stamp={'sec':msg.header.stamp.sec,'nanosec':msg.header.stamp.nanosec},
                      inference_ms=round((time.perf_counter()-start)*1000,2))
        summary = {k:serial(v) for k,v in result.items() if k != 'detail'}
        self.prediction.publish(String(data=json.dumps(summary,separators=(',',':'))))
        self.activations.publish(String(data=json.dumps(serial(result),separators=(',',':'))))

def run_model(model,args=None):
    rclpy.init(args=args)
    node = ModelNode(model)
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt,rclpy.executors.ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok(): rclpy.shutdown()
