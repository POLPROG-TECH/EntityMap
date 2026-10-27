/** Draws the layered 3D view on a plain 2D canvas, without WebGL or an extra library. */

import {
  CAMERA_PRESETS, FLOORS, createCamera, easeInOutCubic, fitDistance, lerpCamera, orbitCamera, pickFromGrid, zoomCamera,
} from "./scene3d-math.js";
import { drawEdges, drawFlow, drawLabels, drawNodes, drawWaveEdges, drawWaves, resolveCssColor } from "./scene3d-draw.js";
import { drawAreas, drawFloors, drawGizmo, pointInPolygon } from "./scene3d-draw-world.js";
import { SceneInput } from "./scene3d-input.js";
import { navigateNodes } from "./scene3d-nav.js";
import { NODE_LIFT, PICK_CELL, buildAdjacency, hoverHighlight, insideRect, projectScene } from "./scene3d-frame.js";

const AUTO_ROTATE_PER_MS = 0.00006;
const IDLE_FRAME_MS = 33; /* auto-rotation alone runs at about 30 fps */
const INERTIA_DECAY = 0.92; /* per 16 ms frame */
const INERTIA_STOP = 0.00002;
const TWEEN_MS = 600;
const FLY_TO_DISTANCE = 700;

const VIEW_COLORS = {
  text: "var(--em-text, #212121)",
  textSecondary: "var(--em-text-secondary, #757575)",
  background: "var(--em-bg, #ffffff)",
  outline: "var(--em-node-outline, #ffffff)",
  primary: "var(--em-primary, #1A73E8)",
  path: "var(--em-path, #E91E63)",
  missing: "var(--em-missing, #db4437)",
};

/**
 * `callbacks`: onSelect(id | null), onFocus(id), onHover(id | null, anchor),
 * onKeyFocus(id, anchor), onCameraChange(camera) and
 * onInteract() on the first user input. The host owns data, selection and
 * wording; this class draws and turns input into those callbacks.
 */
export class Scene3D {
  constructor(host, { camera, callbacks, ariaLabel }) {
    this.host = host;
    this.callbacks = callbacks;
    this.camera = camera || createCamera();
    Object.assign(this, initialState());
    this.canvas = createCanvas(host, ariaLabel);
    this.ctx = this.canvas.getContext("2d");
    this._frame = this._frame.bind(this);
    this._input = new SceneInput(this);
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(host);
    this._resize();
  }

  setData({ nodes, links, areas, floorLabels, floorGap }) {
    this.scene = { ...this.scene, nodes, links, areas, floorLabels, nodesById: new Map(nodes.map((node) => [node.id, node])) };
    this.adjacency = buildAdjacency(links);
    this.floorGap = floorGap;
    this._layoutWorld();
    this._style = null;
  }

  setFloorGap(gap) {
    this.floorGap = gap;
    this._layoutWorld();
    this._requestFrame();
  }

  setHighlight(highlight) {
    this.highlight = highlight;
    this._requestFrame();
  }

  setFlowNodes(ids) {
    this.flowNodes = new Set(ids);
    this._requestFrame();
  }

  setAnimations(enabled) {
    this.animations = enabled;
    this.autoRotate = this.autoRotate && enabled;
    this._requestFrame();
  }

  playWave({ depthById, edges, color, stepMs, ringMs }) {
    const maxDepth = Math.max(0, ...depthById.values());
    this.wave = { depthById, edges, color, stepMs, ringMs, maxDepth, start: performance.now() };
    this._requestFrame();
  }

  zoomBy(factor) {
    this._setCamera(zoomCamera(this.camera, factor));
  }

  orbitBy(deltaYaw, deltaPitch) {
    this._setCamera(orbitCamera(this.camera, deltaYaw, deltaPitch));
  }

  fit() {
    this._animateCamera(this._fitted({ ...this.camera, target: { x: 0, y: 0, z: 0 } }));
  }

  resetCamera() {
    this._animateCamera(this._fitted(createCamera()));
  }

  setPreset(name) {
    this.interact();
    this._animateCamera(this._fitted({ ...this.camera, ...CAMERA_PRESETS[name], target: { x: 0, y: 0, z: 0 } }));
  }

  flyTo(id) {
    const node = this.scene.nodesById.get(id);

    if (!node) {
      return;
    }

    const target = { x: node.world.x, y: node.world.y + NODE_LIFT, z: node.world.z };
    this._animateCamera({ ...this.camera, target, distance: Math.min(this.camera.distance, FLY_TO_DISTANCE) });
  }

  startInertia(velocityYaw, velocityPitch) {
    this._inertia = this.animations ? { yaw: velocityYaw, pitch: velocityPitch } : null;
    this._requestFrame();
  }

  stopMotion() {
    this._inertia = null;
    this._tween = null;
  }

  interact() {
    this.autoRotate = false;

    if (!this._interacted) {
      this._interacted = true;
      this.callbacks.onInteract?.();
    }
  }

  hoverAt(position) {
    const id = position ? this._pick(position) : null;
    const floor = position && !id ? this._floorAt(position) : null;

    this._setHoverFloor(floor);
    this._setHover(id);
  }

  clickAt(position) {
    this.callbacks.onSelect(this._pick(position));
  }

  doubleClickAt(position) {
    const id = this._pick(position);

    if (id) {
      this.callbacks.onFocus(id);
    }
  }

  moveKeyboardFocus(key) {
    const nodes = this.scene.nodes
      .map((node) => ({ id: node.id, floor: node.floor, x: this.projected.get(node.id)?.x ?? 0 }));
    const id = navigateNodes(nodes, this.focusId, key);

    if (!id) {
      return;
    }

    this.interact();
    this.focusId = id;

    if (!this.projected.get(id)?.onScreen) {
      this.flyTo(id);
    }

    this.callbacks.onKeyFocus(id, this.anchorFor(id));
    this._requestFrame();
  }

  activateKeyboardFocus() {
    if (this.focusId) {
      this.callbacks.onSelect(this.focusId);
    }
  }

  clearKeyboardFocus() {
    if (!this.focusId) {
      return;
    }

    this.focusId = null;
    this.callbacks.onKeyFocus(null, null);
    this._requestFrame();
  }

  anchorFor(id) {
    const box = this.canvas.getBoundingClientRect();
    const p = this.projected.get(id) || { x: 0, y: 0, radius: 0 };

    return {
      getBoundingClientRect: () => ({
        left: box.left + p.x - p.radius,
        right: box.left + p.x + p.radius,
        top: box.top + p.y - p.radius,
        bottom: box.top + p.y + p.radius,
      }),
    };
  }

  toBlob(callback) {
    const copy = document.createElement("canvas");
    copy.width = this.canvas.width;
    copy.height = this.canvas.height;
    const ctx = copy.getContext("2d");
    ctx.fillStyle = this._resolvedStyle().colors.background;
    ctx.fillRect(0, 0, copy.width, copy.height);
    ctx.drawImage(this.canvas, 0, 0);
    copy.toBlob(callback);
  }

  destroy() {
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._input.destroy();
    this._resizeObserver.disconnect();
    this.canvas.remove();
  }

  _pick(position) {
    return pickFromGrid(this._pickGrid || new Map(), PICK_CELL, position.x, position.y);
  }

  _layoutWorld() {
    const lift = ((FLOORS.length - 1) * this.floorGap) / 2;

    for (const node of this.scene.nodes) {
      node.world = { x: node.plan.x, y: node.floor * this.floorGap - lift, z: node.plan.z };
    }
  }

  _fitted(camera) {
    const points = this.scene.nodes.map((node) => node.world);

    return { ...camera, distance: fitDistance(points, camera, this.viewport) };
  }

  _setCamera(camera) {
    this.camera = camera;
    this.callbacks.onCameraChange?.(camera);
    this._requestFrame();
  }

  _animateCamera(camera) {
    if (!this.animations) {
      this._setCamera(camera);

      return;
    }

    this._tween = { from: this.camera, to: camera, start: performance.now() };
    this._requestFrame();
  }

  _stepTween(now) {
    const t = Math.min(1, (now - this._tween.start) / TWEEN_MS);
    const { from, to } = this._tween;
    this._tween = t < 1 ? this._tween : null;
    this._setCamera(lerpCamera(from, to, easeInOutCubic(t)));
  }

  _stepInertia(elapsed) {
    const { yaw, pitch } = this._inertia;
    const decay = INERTIA_DECAY ** (elapsed / 16);
    this._setCamera(orbitCamera(this.camera, yaw * elapsed, pitch * elapsed));
    this._inertia = Math.hypot(yaw * decay, pitch * decay) < INERTIA_STOP ? null : { yaw: yaw * decay, pitch: pitch * decay };
  }

  _stepMotion(now, elapsed) {
    if (this._tween) {
      this._stepTween(now);
    }

    if (this._inertia) {
      this._stepInertia(elapsed);
    }

    if (this.autoRotate && this.animations) {
      this.camera = { ...this.camera, yaw: this.camera.yaw + elapsed * AUTO_ROTATE_PER_MS };
    }
  }

  _resize() {
    const box = this.host.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.viewport = { width: box.width || 900, height: box.height || 600 };
    this.canvas.width = Math.round(this.viewport.width * ratio);
    this.canvas.height = Math.round(this.viewport.height * ratio);
    this.canvas.style.width = `${this.viewport.width}px`;
    this.canvas.style.height = `${this.viewport.height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this._style = null;
    this._requestFrame();
  }

  /**
   * Frames are drawn on demand; the loop keeps running only while something
   * moves. Auto-rotation alone is throttled to about 30 fps.
   */
  _requestFrame() {
    if (this._rafId == null) {
      this._rafId = requestAnimationFrame(this._frame);
    }
  }

  _frame(now) {
    this._rafId = null;
    const elapsed = this._lastFrame ? now - this._lastFrame : 0;

    if (this._onlyAutoRotating(now) && this._lastFrame && elapsed < IDLE_FRAME_MS) {
      this._requestFrame();

      return;
    }

    this._lastFrame = now;
    this._stepMotion(now, elapsed);
    this._draw(now);

    if (this._isAnimating(now)) {
      this._requestFrame();

      return;
    }

    this._lastFrame = 0;
  }

  _waveRunning(now) {
    return Boolean(this.wave) && now - this.wave.start < (this.wave.maxDepth + 1) * this.wave.stepMs + this.wave.ringMs;
  }

  _onlyAutoRotating(now) {
    const busy = this._tween || this._inertia || this._waveRunning(now) || this.flowNodes.size > 0;

    return this.autoRotate && this.animations && !busy;
  }

  _isAnimating(now) {
    const flowing = this.animations && this.flowNodes.size > 0;

    return Boolean(this._tween || this._inertia) || (this.autoRotate && this.animations) || flowing || this._waveRunning(now);
  }

  _draw(now) {
    const started = performance.now();
    const view = this._prepareFrame();
    const highlight = hoverHighlight(this.hoverId, this.adjacency, this.scene.links, this.highlight);

    this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    this._drawWorld(view, highlight, now);
    this._drawGraph(view, { highlight, hoverId: this.hoverId, focusId: this.focusId }, now);
    this._recordFrame(performance.now() - started);
  }

  _prepareFrame() {
    const frame = projectScene(this.scene.nodes, this.camera, this.viewport);
    const { colors, fontFamily } = this._resolvedStyle();

    this.projected = frame.projected;
    this.ordered = frame.ordered;
    this._pickGrid = frame.pickGrid;

    return { camera: this.camera, viewport: this.viewport, projected: this.projected, ordered: this.ordered, colors, fontFamily };
  }

  _drawWorld(view, highlight, now) {
    this.floorHits = drawFloors(this.ctx, this.scene, view, this.hoverFloor);
    drawAreas(this.ctx, this.scene, view);
    drawEdges(this.ctx, this.scene, view, highlight);

    if (this.animations) {
      drawFlow(this.ctx, this.scene, view, this.flowNodes, now);
    }

    drawWaveEdges(this.ctx, view, this.wave, now);
  }

  _drawGraph(view, state, now) {
    drawNodes(this.ctx, this.scene, view, state);
    drawWaves(this.ctx, view, this.wave, now);
    drawLabels(this.ctx, this.scene, view, state);
    drawGizmo(this.ctx, view);
  }

  _recordFrame(ms) {
    const frames = this.stats.frames + 1;
    this.stats = { frames, frameMs: this.stats.frameMs + (ms - this.stats.frameMs) / Math.min(frames, 30) };
  }

  _resolvedStyle() {
    if (!this._style) {
      this._style = {
        colors: Object.fromEntries(Object.entries(VIEW_COLORS).map(([key, value]) => [key, resolveCssColor(value, this.host)])),
        fontFamily: getComputedStyle(this.host).fontFamily || "sans-serif",
      };
    }

    return this._style;
  }

  _floorAt(position) {
    const hit = this.floorHits.find((floorHit) => insideRect(position, floorHit.label) || pointInPolygon(position, floorHit.polygon));

    return hit ? hit.floor : null;
  }

  _setHoverFloor(floor) {
    if (floor === this.hoverFloor) {
      return;
    }

    this.hoverFloor = floor;
    this.canvas.classList.toggle("over-floor", floor !== null);
    this._requestFrame();
  }

  _setHover(id) {
    if (id === this.hoverId) {
      return;
    }

    this.hoverId = id;
    this.canvas.classList.toggle("over-node", Boolean(id));
    this.callbacks.onHover(id, id ? this.anchorFor(id) : null);
    this._requestFrame();
  }
}

function initialState() {
  return {
    scene: { nodes: [], links: [], areas: [], nodesById: new Map(), floorLabels: {} },
    floorGap: 170,
    adjacency: new Map(),
    highlight: null,
    flowNodes: new Set(),
    wave: null,
    hoverId: null,
    hoverFloor: null,
    focusId: null,
    animations: true,
    autoRotate: true,
    projected: new Map(),
    ordered: [],
    floorHits: [],
    stats: { frameMs: 0, frames: 0 },
  };
}

function createCanvas(host, ariaLabel) {
  const canvas = document.createElement("canvas");

  canvas.className = "scene3d-canvas";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-roledescription", "3D");
  canvas.setAttribute("aria-label", ariaLabel);
  host.appendChild(canvas);

  return canvas;
}
