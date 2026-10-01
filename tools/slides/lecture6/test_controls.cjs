// Exercise the actual orbit controller with mouse, keyboard, and multi-pointer streams.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const sandbox = {console: {warn() {}}}; sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of ['vendor/three.min.js', 'scene3d.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, '2026/Labs/Mapping', file), 'utf8'), sandbox);
}
const T = sandbox.THREE, Viewer = sandbox.MappingScene3D.Viewer;
const canvas = {clientHeight: 300, focus() {}, setPointerCapture() {}, classList: {add() {}, remove() {}}, addEventListener(type, fn) {this[type] = fn;}};
const v = Object.create(Viewer.prototype);
Object.assign(v, {canvas, camera: new T.PerspectiveCamera(45, 1, .01, 3000), target: new T.Vector3(), azimuth: .65, elevation: .65, distance: 100, tool: 'rotate', pointers: new Map(), draw() {this.draws++;}, draws: 0});
v.camera.position.set(0, 0, 100); v.camera.lookAt(v.target); v.bindControls();
const event = (pointerId, x, y, extra = {}) => ({pointerId, clientX: x, clientY: y, button: 0, preventDefault() {}, ...extra});
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

canvas.onpointerdown(event(1, 100, 100)); canvas.onpointermove(event(1, 140, 125)); canvas.onpointerup(event(1, 140, 125));
close(v.azimuth, .33); close(v.elevation, .85); close(v.distance, 100);
assert.equal(v.target.length(), 0); assert.equal(v.pointers.size, 0);

const angles = [v.azimuth, v.elevation];
canvas.onpointerdown(event(1, 100, 100, {button: 2})); canvas.onpointermove(event(1, 130, 120)); canvas.onpointercancel(event(1, 130, 120));
assert.ok(v.target.x < 0 && v.target.y > 0); assert.deepEqual([v.azimuth, v.elevation], angles);
assert.equal(v.pointers.size, 0);

v.target.set(0, 0, 0);
canvas.onpointerdown(event(1, 100, 100, {pointerType: 'touch'})); canvas.onpointerdown(event(2, 200, 100, {pointerType: 'touch'}));
canvas.onpointermove(event(1, 80, 120, {pointerType: 'touch'})); canvas.onpointermove(event(2, 240, 120, {pointerType: 'touch'}));
close(v.distance, 62.5); assert.ok(v.target.length() > 0); assert.deepEqual([v.azimuth, v.elevation], angles);
canvas.onpointerup(event(2, 240, 120));
const azimuth = v.azimuth;
canvas.onpointermove(event(1, 90, 120)); close(v.azimuth, azimuth - .08);
canvas.onlostpointercapture(event(1, 90, 120)); assert.equal(v.pointers.size, 0);

const beforePan = v.target.clone(), beforeAngle = v.azimuth;
canvas.onkeydown({key: 'ArrowRight', shiftKey: true, preventDefault() {}});
assert.ok(v.target.distanceTo(beforePan) > 0); close(v.azimuth, beforeAngle);
const distance = v.distance;
canvas.onkeydown({key: '+', preventDefault() {}}); close(v.distance, distance / 1.2);
canvas.onkeydown({key: '-', preventDefault() {}}); close(v.distance, distance);
v.tool = 'pan';
canvas.onpointerdown(event(7, 0, 0)); canvas.onpointermove(event(7, 10, 10)); canvas.onpointerup(event(7, 10, 10)); close(v.azimuth, beforeAngle);
v.distance = .1; canvas.wheel({deltaY: -1000, preventDefault() {}}); close(v.distance, .1);
v.distance = 1500; canvas.wheel({deltaY: 1000, preventDefault() {}}); close(v.distance, 1500);
v.tool = 'rotate'; canvas.onpointerdown(event(8, 0, 0)); canvas.onpointermove(event(8, 0, 10000));
assert.ok(Number.isFinite(v.elevation) && v.elevation < Math.PI / 2);
canvas.onpointercancel(event(8, 0, 10000));
console.log('PASS: orbit, right-drag pan, multi-touch pan/pinch, pointer cancellation, touch-to-single-pointer transition, keyboard, and camera limits.');
