/* Perspective point-cloud viewers. Input coordinates are x/y horizontal, z up. */
'use strict';
window.MappingScene3D = (() => {
  const T = window.THREE;
  const vec = p => new T.Vector3(p[0], p[2], -p[1]);
  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
  const colors = new Map();
  function color(value) {
    if (!colors.has(value)) colors.set(value, new T.Color(value));
    return colors.get(value);
  }

  class Viewer {
    constructor(canvas, status) {
      this.canvas = canvas;
      this.status = status;
      this.renderer = new T.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true});
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0x0a1c30);
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(45, 1, .01, 3000);
      this.target = new T.Vector3();
      this.azimuth = .65;
      this.elevation = .65;
      this.distance = this.homeDistance = 80;
      this.tool = 'rotate';
      this.home = {center: [0, 0, 0], distance: 80};
      this.pointers = new Map();
      this.cloudGeometry = new T.BufferGeometry();
      this.capacity = 0;
      this.cloud = new T.Points(this.cloudGeometry, new T.PointsMaterial({vertexColors: true, size: 3, sizeAttenuation: false}));
      this.scene.add(this.cloud);
      this.details = new T.Group();
      this.scene.add(this.details);
      this.bounds = new T.Box3();
      this.canvas.tabIndex = 0;
      this.bindControls();
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(canvas);
    }

    reference(center, distance, gridSize, gridStep) {
      this.home = {center, distance};
      if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); this.grid.material.dispose(); }
      if (this.axes) { this.scene.remove(this.axes); this.axes.geometry.dispose(); this.axes.material.dispose(); }
      this.grid = new T.GridHelper(gridSize, gridSize / gridStep, 0x36516c, 0x20384f);
      this.scene.add(this.grid);
      this.axes = new T.AxesHelper(gridStep);
      this.scene.add(this.axes);
      this.reset();
    }

    reset() {
      this.target.copy(vec(this.home.center));
      this.distance = this.homeDistance = this.home.distance;
      this.preset('oblique');
    }

    preset(view) {
      this.azimuth = view === 'side' ? Math.PI / 2 : view === 'top' ? 0 : .65;
      this.elevation = view === 'top' ? Math.PI / 2 - .01 : view === 'side' ? .08 : .65;
      this.draw();
    }

    setCloud(items, position, tint, pointSize = 3) {
      if (!this.capacity || items.length > this.capacity) {
        this.capacity = Math.max(items.length, this.capacity * 2, 1024);
        this.positions = new Float32Array(this.capacity * 3);
        this.tints = new Float32Array(this.capacity * 3);
        this.cloudGeometry.setAttribute('position', new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage));
        this.cloudGeometry.setAttribute('color', new T.BufferAttribute(this.tints, 3).setUsage(T.DynamicDrawUsage));
      }
      this.bounds.makeEmpty();
      const p = new T.Vector3();
      for (let i = 0; i < items.length; i++) {
        const xyz = position(items[i], i), c = color(tint(items[i], i)), n = i * 3;
        this.positions[n] = xyz[0]; this.positions[n + 1] = xyz[2]; this.positions[n + 2] = -xyz[1];
        this.tints[n] = c.r; this.tints[n + 1] = c.g; this.tints[n + 2] = c.b;
        this.bounds.expandByPoint(p.set(xyz[0], xyz[2], -xyz[1]));
      }
      this.cloudGeometry.setDrawRange(0, items.length);
      if (this.capacity) {
        this.cloudGeometry.attributes.position.needsUpdate = true;
        this.cloudGeometry.attributes.color.needsUpdate = true;
      }
      // Unused buffer capacity must not affect visibility or framing.
      this.cloud.frustumCulled = false;
      this.cloud.material.size = pointSize;
      this.clearDetails();
    }

    clearDetails() {
      for (const item of [...this.details.children]) {
        item.geometry.dispose(); item.material.dispose(); this.details.remove(item);
      }
    }

    lines(points, tint, segments = false) {
      if (points.length < 2) return;
      const geometry = new T.BufferGeometry().setFromPoints(points.map(vec));
      const material = new T.LineBasicMaterial({color: tint});
      this.details.add(segments ? new T.LineSegments(geometry, material) : new T.Line(geometry, material));
      for (const p of points) this.bounds.expandByPoint(vec(p));
    }

    markers(points, tint, size) {
      if (!points.length) return;
      const geometry = new T.BufferGeometry().setFromPoints(points.map(vec));
      this.details.add(new T.Points(geometry, new T.PointsMaterial({color: tint, size, sizeAttenuation: false, depthTest: false})));
      for (const p of points) this.bounds.expandByPoint(vec(p));
    }

    fit() {
      if (this.bounds.isEmpty()) return this.reset();
      const sphere = this.bounds.getBoundingSphere(new T.Sphere());
      this.target.copy(sphere.center);
      const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
      const vertical = this.camera.fov * Math.PI / 360;
      const halfAngle = Math.min(vertical, Math.atan(Math.tan(vertical) * aspect));
      this.distance = clamp(sphere.radius / Math.sin(halfAngle) * 1.15, .1, 1500);
      this.draw();
    }

    zoom(factor) { this.distance = clamp(this.distance * factor, .1, 1500); this.draw(); }

    pan(dx, dy) {
      this.camera.updateMatrixWorld();
      const scale = 2 * this.distance * Math.tan(this.camera.fov * Math.PI / 360) / Math.max(1, this.canvas.clientHeight);
      const right = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const up = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      this.target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
    }

    orbit(dx, dy) {
      this.azimuth -= dx * .008;
      this.elevation = clamp(this.elevation + dy * .008, -Math.PI / 2 + .01, Math.PI / 2 - .01);
    }

    draw() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      if (this.lastWidth !== w || this.lastHeight !== h) {
        this.renderer.setSize(w, h, false);
        this.lastWidth = w; this.lastHeight = h;
      }
      this.camera.aspect = w / h;
      this.camera.position.set(
        this.target.x + this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth),
        this.target.y + this.distance * Math.sin(this.elevation),
        this.target.z + this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth));
      this.camera.lookAt(this.target);
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
      this.status.textContent = `${this.tool === 'pan' ? 'Pan' : 'Rotate'} drag · Zoom ${(this.homeDistance / this.distance).toFixed(2)}×`;
    }

    gesture() {
      const [a, b] = [...this.pointers.values()];
      return {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, span: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))};
    }

    bindControls() {
      const c = this.canvas;
      c.oncontextmenu = e => e.preventDefault();
      c.onpointerdown = e => {
        e.preventDefault(); c.focus({preventScroll: true});
        c.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY, pan: e.button === 1 || e.button === 2 || e.shiftKey || this.tool === 'pan'});
        this.pinch = this.pointers.size === 2 ? this.gesture() : null;
        c.classList.add('dragging');
      };
      c.onpointermove = e => {
        const prev = this.pointers.get(e.pointerId);
        if (!prev) return;
        const next = {...prev, x: e.clientX, y: e.clientY};
        this.pointers.set(e.pointerId, next);
        if (this.pointers.size === 2) {
          const now = this.gesture();
          if (this.pinch) {
            this.pan(now.x - this.pinch.x, now.y - this.pinch.y);
            this.distance = clamp(this.distance * this.pinch.span / now.span, .1, 1500);
          }
          this.pinch = now;
        } else if (this.pointers.size === 1) {
          if (prev.pan || e.shiftKey || this.tool === 'pan') this.pan(next.x - prev.x, next.y - prev.y);
          else this.orbit(next.x - prev.x, next.y - prev.y);
        }
        this.draw();
      };
      const end = e => {
        this.pointers.delete(e.pointerId); this.pinch = null;
        if (!this.pointers.size) c.classList.remove('dragging');
      };
      c.onpointerup = end; c.onpointercancel = end; c.onlostpointercapture = end;
      c.addEventListener('wheel', e => { e.preventDefault(); this.zoom(Math.exp(clamp(e.deltaY, -300, 300) * .001)); }, {passive: false});
      c.onkeydown = e => {
        const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        if (!arrows.includes(e.key) && !['+', '=', '-', '_', 'r', 'R', 'f', 'F'].includes(e.key)) return;
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -20 : e.key === 'ArrowRight' ? 20 : 0;
        const dy = e.key === 'ArrowUp' ? -20 : e.key === 'ArrowDown' ? 20 : 0;
        if (arrows.includes(e.key)) { if (e.shiftKey || this.tool === 'pan') this.pan(dx, dy); else this.orbit(dx, dy); }
        if (e.key === '+' || e.key === '=') this.distance = clamp(this.distance / 1.2, .1, 1500);
        if (e.key === '-' || e.key === '_') this.distance = clamp(this.distance * 1.2, .1, 1500);
        if (e.key.toLowerCase() === 'r') return this.reset();
        if (e.key.toLowerCase() === 'f') return this.fit();
        this.draw();
      };
    }
  }
  return {Viewer};
})();
