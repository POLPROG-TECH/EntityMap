export const FLOORS = ["areas", "devices", "entities", "scenes", "automations"];

const FLOOR_BY_TYPE = {
  area: 0,
  device: 1,
  entity: 2,
  helper: 2,
  group: 2,
  unknown: 2,
  scene: 3,
  script: 3,
  automation: 4,
};

export const CAMERA_LIMITS = { minPitch: 0.05, maxPitch: 1.45, minDistance: 150, maxDistance: 6000 };
const NEAR_PLANE = 20;

export function floorOf(nodeType) {
  return FLOOR_BY_TYPE[nodeType] ?? FLOOR_BY_TYPE.unknown;
}

export function createCamera(overrides = {}) {
  return { yaw: -0.6, pitch: 0.5, distance: 1100, focal: 800, target: { x: 0, y: 0, z: 0 }, ...overrides };
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function orbitCamera(camera, deltaYaw, deltaPitch) {
  return {
    ...camera,
    yaw: camera.yaw + deltaYaw,
    pitch: clamp(camera.pitch + deltaPitch, CAMERA_LIMITS.minPitch, CAMERA_LIMITS.maxPitch),
  };
}

export function zoomCamera(camera, factor) {
  return {
    ...camera,
    distance: clamp(camera.distance / factor, CAMERA_LIMITS.minDistance, CAMERA_LIMITS.maxDistance),
  };
}

const FIT_SEARCH_STEPS = 24;

function fitsInside(points, camera, viewport, padding) {
  return points.every((point) => {
    const p = projectPoint(point, camera, viewport);

    return p && p.x >= padding && p.x <= viewport.width - padding && p.y >= padding && p.y <= viewport.height - padding;
  });
}

/**
 * Closest camera distance, at the current angle, that keeps every point on
 * screen with some padding: a binary search over distance, since closer
 * always means larger on screen.
 */
export function fitDistance(points, camera, viewport, padding = 60) {
  let near = CAMERA_LIMITS.minDistance;
  let far = CAMERA_LIMITS.maxDistance;

  for (let step = 0; step < FIT_SEARCH_STEPS; step++) {
    const middle = (near + far) / 2;

    if (fitsInside(points, { ...camera, distance: middle }, viewport, padding)) {
      far = middle;
    } else {
      near = middle;
    }
  }

  return far;
}

/**
 * World -> screen. Yaw turns around the vertical axis, pitch tilts the
 * camera down. Returns null for points behind the camera.
 */
export function projectPoint(point, camera, viewport) {
  const dx = point.x - camera.target.x;
  const dy = point.y - camera.target.y;
  const dz = point.z - camera.target.z;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const x1 = dx * cosYaw - dz * sinYaw;
  const z1 = dx * sinYaw + dz * cosYaw;
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const y2 = dy * cosPitch - z1 * sinPitch;
  const depth = dy * sinPitch + z1 * cosPitch + camera.distance;

  if (depth <= NEAR_PLANE) {
    return null;
  }

  const scale = camera.focal / depth;

  return { x: viewport.width / 2 + x1 * scale, y: viewport.height / 2 - y2 * scale, scale, depth };
}

export function pickNode(projected, x, y, slop = 3) {
  const hits = projected.filter((p) => Math.hypot(p.x - x, p.y - y) <= p.radius + slop);

  if (hits.length === 0) {
    return null;
  }

  return hits.reduce((nearest, p) => (p.depth < nearest.depth ? p : nearest)).id;
}

export function sortFarToNear(projected) {
  return [...projected].sort((a, b) => b.depth - a.depth);
}

export const CAMERA_PRESETS = {
  top: { yaw: 0, pitch: CAMERA_LIMITS.maxPitch },
  side: { yaw: 0, pitch: CAMERA_LIMITS.minPitch },
  iso: { yaw: -Math.PI / 4, pitch: 0.62 },
};

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function shortestAngle(from, to) {
  const turn = 2 * Math.PI;
  const delta = ((((to - from) % turn) + turn + Math.PI) % turn) - Math.PI;

  return from + delta;
}

const lerp = (a, b, t) => a + (b - a) * t;

export function lerpCamera(from, to, t) {
  return {
    ...to,
    yaw: lerp(from.yaw, shortestAngle(from.yaw, to.yaw), t),
    pitch: lerp(from.pitch, to.pitch, t),
    distance: lerp(from.distance, to.distance, t),
    target: {
      x: lerp(from.target.x, to.target.x, t),
      y: lerp(from.target.y, to.target.y, t),
      z: lerp(from.target.z, to.target.z, t),
    },
  };
}

export function axisDirection(axis, camera) {
  const flat = { ...camera, target: { x: 0, y: 0, z: 0 }, distance: 1e6, focal: 1e6 };
  const p = projectPoint(axis, flat, { width: 0, height: 0 });

  return { x: p.x, y: p.y };
}

/**
 * Picking stays fast on big graphs: nodes are bucketed by screen cell once
 * per frame, and a pointer only checks the nodes in its own cell.
 */
function cellsCovering(p, cell) {
  const span = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const columns = span(Math.floor((p.x - p.radius) / cell), Math.floor((p.x + p.radius) / cell));
  const rows = span(Math.floor((p.y - p.radius) / cell), Math.floor((p.y + p.radius) / cell));

  return columns.flatMap((column) => rows.map((row) => `${column},${row}`));
}

export function buildPickGrid(projected, cell) {
  const grid = new Map();
  const entries = projected.flatMap((p) => cellsCovering(p, cell).map((key) => [key, p]));

  for (const [key, p] of entries) {
    if (!grid.has(key)) {
      grid.set(key, []);
    }

    grid.get(key).push(p);
  }

  return grid;
}

export function pickFromGrid(grid, cell, x, y, slop = 3) {
  return pickNode(grid.get(`${Math.floor(x / cell)},${Math.floor(y / cell)}`) || [], x, y, slop);
}
