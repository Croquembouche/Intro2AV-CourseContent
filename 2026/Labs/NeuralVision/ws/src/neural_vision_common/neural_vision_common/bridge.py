"""Local HTTP UI and ROS bridge. Inference always runs in the separate ROS nodes."""
import json
import copy
import mimetypes
import threading
import time
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import numpy as np
import rclpy
from rclpy.node import Node
from rclpy.parameter import Parameter
from rclpy.qos import QoSProfile,ReliabilityPolicy
from rcl_interfaces.srv import SetParameters
from sensor_msgs.msg import Image
from std_msgs.msg import String
from ament_index_python.packages import get_package_share_directory
from .inference import MODELS, Network, serial, image_id

class Bridge(Node):
    def __init__(self):
        super().__init__('neural_web_bridge')
        self.declare_parameter('host','127.0.0.1')
        self.declare_parameter('port',8773)
        self.declare_parameter('default_model','mlp')
        self.share = Path(get_package_share_directory('neural_vision_common'))
        self.lock = threading.Lock(); self.records = OrderedDict(); self.latest = None
        self.received = 0
        self.pub = self.create_publisher(Image,'/neural_demo/input',10)
        self.subs = [self.create_subscription(Image,'/neural_demo/input',self.on_input,
            QoSProfile(depth=1,reliability=ReliabilityPolicy.BEST_EFFORT))]
        self.parameter_clients = {}
        self.weights = {}
        for name in MODELS:
            self.subs.append(self.create_subscription(String,f'/neural_demo/{name}/activations',self.on_result,10))
            self.parameter_clients[name] = self.create_client(SetParameters,f'/{name}_model/set_parameters')
            self.weights[name] = serial(Network(name,self.share/'models').w)
        self.metrics = json.loads((self.share/'models/metrics.json').read_text())
        self.samples = json.loads((self.share/'models/samples.json').read_text())

    def on_input(self,msg):
        if msg.width != 28 or msg.height != 28 or msg.encoding != 'mono8' or msg.step < 28 or len(msg.data) != 28*msg.step:
            return
        pixels = np.frombuffer(bytes(msg.data),dtype=np.uint8).reshape(28,msg.step)[:,:28].flatten().tolist()
        with self.lock:
            self.latest = image_id(msg)
            self.records.setdefault(self.latest,{'input_id':self.latest,'results':{}})['pixels'] = pixels
            self.records.move_to_end(self.latest)
            while len(self.records)>16: self.records.popitem(last=False)

    def on_result(self,msg):
        value = json.loads(msg.data)
        with self.lock:
            key = value['input_id']
            self.records.setdefault(key,{'input_id':key,'results':{}})['results'][value['model']] = value
            self.received += 1
            while len(self.records)>16: self.records.popitem(last=False)

    def publish(self,pixels):
        array = np.asarray(pixels)
        if array.shape != (784,) or not np.issubdtype(array.dtype,np.number) or not np.isfinite(array).all() or array.min()<0 or array.max()>255:
            raise ValueError('pixels must contain 784 numeric values in [0,255]')
        msg = Image(); msg.height = 28; msg.width = 28; msg.encoding = 'mono8'; msg.step = 28
        msg.header.stamp = self.get_clock().now().to_msg(); msg.header.frame_id = 'digit_canvas'
        msg.data = np.rint(array).astype(np.uint8).tolist()
        self.on_input(msg); self.pub.publish(msg)
        return {'input_id':image_id(msg)}

    def configure(self,name,values):
        permitted = {'mlp':{'disabled_neuron'},'cnn':{'negative_slope'},'transformer':{'use_positions'}}
        if name not in permitted or not values or set(values)-permitted[name]:
            raise ValueError('Unknown model parameter')
        client = self.parameter_clients[name]
        if not client.wait_for_service(timeout_sec=.5):
            raise RuntimeError(f'{name} model node is not running')
        if 'negative_slope' in values:
            if type(values['negative_slope']) not in (int,float): raise ValueError('Slope must be numeric')
            values = {**values,'negative_slope':float(values['negative_slope'])}
        request = SetParameters.Request()
        request.parameters = [Parameter(k,value=v).to_parameter_msg() for k,v in values.items()]
        future = client.call_async(request)
        ready = threading.Event(); future.add_done_callback(lambda _:ready.set())
        if not ready.wait(3): raise RuntimeError('ROS parameter service timed out')
        response = future.result()
        if any(not r.successful for r in response.results):
            raise ValueError('; '.join(r.reason for r in response.results if not r.successful))
        return {'ok':True}

    def state(self):
        with self.lock:
            current = self.records.get(self.latest,{'input_id':None,'results':{}})
            return {**copy.deepcopy(current),'received':self.received,'nodes':{n:self.count_publishers(f'/neural_demo/{n}/activations')>0 for n in MODELS}}

class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send(self,status,data,kind='application/json'):
        if not isinstance(data,bytes): data=json.dumps(data,separators=(',',':')).encode()
        self.send_response(status); self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(data))); self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff'); self.end_headers()
        try: self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError): pass
    def do_GET(self):
        bridge = self.server.bridge
        path = urlsplit(self.path).path
        if path == '/api/state': self.send(200,bridge.state())
        elif path == '/api/meta': self.send(200,{'metrics':bridge.metrics,'samples':bridge.samples,'default_model':bridge.get_parameter('default_model').value})
        elif path.startswith('/api/weights/') and path.rsplit('/',1)[1] in MODELS:
            self.send(200,bridge.weights[path.rsplit('/',1)[1]])
        else:
            name = 'index.html' if path == '/' else path.lstrip('/')
            target = bridge.share/'web'/name
            # Installed ament assets can be symlinks into the source tree.
            if '/' in name or name.startswith('.') or not target.is_file():
                self.send(404,{'error':'Not found'}); return
            self.send(200,target.read_bytes(),mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
    def do_POST(self):
        # Same-origin local teaching service; never accept cross-site writes.
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            self.send(403,{'error':'Cross-origin writes are not allowed'}); return
        try:
            length = int(self.headers.get('Content-Length','0'))
            if not 0<length<=100000: raise ValueError('Invalid request size')
            body = json.loads(self.rfile.read(length))
            if self.path == '/api/infer': result=self.server.bridge.publish(body['pixels'])
            elif self.path == '/api/config': result=self.server.bridge.configure(body['model'],body['values'])
            else: self.send(404,{'error':'Not found'}); return
            self.send(200,result)
        except (ValueError,TypeError,KeyError,OverflowError) as exc:
            self.send(400,{'error':str(exc)})
        except RuntimeError as exc:
            self.send(503,{'error':str(exc)})

def main(args=None):
    rclpy.init(args=args); bridge=Bridge()
    try:
        server=Server((bridge.get_parameter('host').value,bridge.get_parameter('port').value),Handler)
        server.bridge=bridge
        thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
        bridge.get_logger().info(f'Open http://{server.server_address[0]}:{server.server_address[1]} — inference travels over ROS 2')
        try: rclpy.spin(bridge)
        except (KeyboardInterrupt,rclpy.executors.ExternalShutdownException): pass
        finally: server.shutdown(); server.server_close(); thread.join(timeout=2)
    finally:
        bridge.destroy_node()
        if rclpy.ok(): rclpy.shutdown()
