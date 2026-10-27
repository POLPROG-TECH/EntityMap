const ROTATE_PER_PIXEL = 0.006;
const KEY_ROTATE_STEP = 0.12;
const WHEEL_ZOOM_RATE = 0.0015;
const DRAG_THRESHOLD_PX = 4;
const NAVIGATION_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);
const ROTATION_KEYS = {
  ArrowLeft: [-KEY_ROTATE_STEP, 0],
  ArrowRight: [KEY_ROTATE_STEP, 0],
  ArrowUp: [0, -KEY_ROTATE_STEP],
  ArrowDown: [0, KEY_ROTATE_STEP],
};

export class SceneInput {
  constructor(scene) {
    this.scene = scene;
    this.canvas = scene.canvas;
    this.pointers = new Map();
    this.drag = null;
    this.pinch = null;
    this.handlers = [
      ["pointerdown", (e) => this._onPointerDown(e)],
      ["pointermove", (e) => this._onPointerMove(e)],
      ["pointerup", (e) => this._onPointerUp(e)],
      ["pointercancel", (e) => this._onPointerUp(e)],
      ["pointerleave", () => this._onPointerLeave()],
      ["wheel", (e) => this._onWheel(e), { passive: false }],
      ["dblclick", (e) => this.scene.doubleClickAt(this._local(e))],
      ["keydown", (e) => this._onKeyDown(e)],
      ["blur", () => this.scene.clearKeyboardFocus()],
    ];
    this.handlers.forEach(([type, handler, options]) => this.canvas.addEventListener(type, handler, options));
  }

  destroy() {
    this.handlers.forEach(([type, handler, options]) => this.canvas.removeEventListener(type, handler, options));
  }

  _local(e) {
    const box = this.canvas.getBoundingClientRect();

    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }

  /**
   * Some browsers refuse capture for a pointer they consider inactive; the
   * gesture then still works while the pointer stays over the canvas.
   */
  _capture(pointerId) {
    try {
      this.canvas.setPointerCapture(pointerId);
    } catch (e) {
      return;
    }
  }

  _release(pointerId) {
    try {
      this.canvas.releasePointerCapture(pointerId);
    } catch (e) {
      return;
    }
  }

  _onPointerDown(e) {
    this._capture(e.pointerId);
    this.pointers.set(e.pointerId, this._local(e));
    this.scene.interact();
    this.scene.stopMotion();

    if (this.pointers.size === 2) {
      this.pinch = { distance: this._pinchDistance() };
      this.drag = null;

      return;
    }

    this.drag = { ...this._local(e), time: e.timeStamp, moved: false, vx: 0, vy: 0 };
  }

  _onPointerMove(e) {
    if (!this.pointers.has(e.pointerId)) {
      this.scene.hoverAt(this._local(e));

      return;
    }

    this.pointers.set(e.pointerId, this._local(e));

    if (this.pinch && this.pointers.size === 2) {
      this._pinchZoom();

      return;
    }

    if (this.drag) {
      this._dragOrbit(this._local(e), e.timeStamp);
    }
  }

  _pinchDistance() {
    const [a, b] = [...this.pointers.values()];

    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  _pinchZoom() {
    const distance = this._pinchDistance();

    this.scene.zoomBy(distance / this.pinch.distance);
    this.pinch.distance = distance;
  }

  _dragOrbit(position, timeStamp) {
    const dx = position.x - this.drag.x;
    const dy = position.y - this.drag.y;
    this.drag.moved = this.drag.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD_PX;

    if (!this.drag.moved) {
      return;
    }

    const elapsed = Math.max(1, timeStamp - this.drag.time);
    Object.assign(this.drag, { x: position.x, y: position.y, time: timeStamp, vx: dx / elapsed, vy: dy / elapsed });
    this.scene.hoverAt(null);
    this.scene.orbitBy(dx * ROTATE_PER_PIXEL, dy * ROTATE_PER_PIXEL);
  }

  _onPointerUp(e) {
    this.pointers.delete(e.pointerId);
    this._release(e.pointerId);

    if (this.pinch) {
      this.pinch = this.pointers.size === 2 ? this.pinch : null;
      this.drag = null;

      return;
    }

    if (this.drag) {
      this._finishDrag(this._local(e));
    }
  }

  _finishDrag(position) {
    if (this.drag.moved) {
      this.scene.startInertia(this.drag.vx * ROTATE_PER_PIXEL, this.drag.vy * ROTATE_PER_PIXEL);
    } else {
      this.scene.clickAt(position);
    }

    this.drag = null;
  }

  _onPointerLeave() {
    if (this.pointers.size === 0) {
      this.scene.hoverAt(null);
    }
  }

  _onWheel(e) {
    e.preventDefault();
    this.scene.interact();
    this.scene.zoomBy(Math.exp(-e.deltaY * WHEEL_ZOOM_RATE));
  }

  _onKeyDown(e) {
    if (e.shiftKey && e.key in ROTATION_KEYS) {
      e.preventDefault();
      this.scene.interact();
      this.scene.orbitBy(...ROTATION_KEYS[e.key]);

      return;
    }

    if (NAVIGATION_KEYS.has(e.key)) {
      e.preventDefault();
      this.scene.moveKeyboardFocus(e.key);

      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.scene.activateKeyboardFocus();
    }
  }
}
