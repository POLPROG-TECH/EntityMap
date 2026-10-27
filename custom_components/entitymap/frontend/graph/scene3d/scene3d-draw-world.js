import { paddedHull } from "../graph-geometry.js";
import { FLOORS, axisDirection, projectPoint } from "./scene3d-math.js";

const FLOOR_PADDING = 60;
const FLOOR_FILL_ALPHA = 0.05;
const FLOOR_HOVER_FILL_ALPHA = 0.12;
const FLOOR_STROKE_ALPHA = 0.3;
const AREA_PADDING = 34;
const GIZMO = { size: 20, margin: 40 };

/** Map.groupBy is too new for some Home Assistant companion app web views. */
function groupBy(items, keyOf) {
  const groups = new Map();

  for (const item of items) {
    const key = keyOf(item);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  }

  return groups;
}

function floorBounds(nodes) {
  const xs = nodes.map((node) => node.world.x);
  const zs = nodes.map((node) => node.world.z);

  return {
    minX: Math.min(...xs) - FLOOR_PADDING,
    maxX: Math.max(...xs) + FLOOR_PADDING,
    minZ: Math.min(...zs) - FLOOR_PADDING,
    maxZ: Math.max(...zs) + FLOOR_PADDING,
  };
}

function tracePolygon(ctx, points) {
  ctx.beginPath();
  points.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
  ctx.closePath();
}

export function drawFloors(ctx, scene, view, hoverFloor) {
  const byFloor = groupBy(scene.nodes, (node) => node.floor);
  const hits = [];

  for (const [floor, nodes] of byFloor) {
    const bounds = floorBounds(nodes);
    const y = nodes[0].world.y;
    const corners = [
      { x: bounds.minX, y, z: bounds.minZ },
      { x: bounds.maxX, y, z: bounds.minZ },
      { x: bounds.maxX, y, z: bounds.maxZ },
      { x: bounds.minX, y, z: bounds.maxZ },
    ].map((corner) => projectPoint(corner, view.camera, view.viewport));

    if (corners.some((corner) => !corner)) {
      continue;
    }

    hits.push({ floor, polygon: corners, label: drawFloorPlate(ctx, scene, view, { floor, corners, hovered: floor === hoverFloor }) });
  }

  return hits;
}

function drawFloorPlate(ctx, scene, view, { floor, corners, hovered }) {
  tracePolygon(ctx, corners);
  ctx.fillStyle = view.colors.textSecondary;
  ctx.strokeStyle = view.colors.textSecondary;
  ctx.globalAlpha = hovered ? FLOOR_HOVER_FILL_ALPHA : FLOOR_FILL_ALPHA;
  ctx.fill();
  ctx.globalAlpha = FLOOR_STROKE_ALPHA;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const text = scene.floorLabels[FLOORS[floor]];
  const anchor = corners.reduce((left, corner) => (corner.x < left.x ? corner : left));
  ctx.font = `600 11px ${view.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = hovered ? view.colors.text : view.colors.textSecondary;
  ctx.fillText(text, anchor.x + 6, anchor.y - 6);

  const width = ctx.measureText(text).width;

  return { x: anchor.x + 2, y: anchor.y - 20, width: width + 8, height: 18 };
}

export function drawAreas(ctx, scene, view) {
  for (const area of scene.areas) {
    const members = area.memberIds.map((id) => scene.nodesById.get(id)).filter(Boolean);
    const floors = groupBy(members, (node) => node.floor);
    const centers = [...floors.values()]
      .filter((nodes) => nodes.some((node) => node.id !== area.id))
      .map((nodes) => drawAreaOutline(ctx, view, area.color, nodes))
      .filter(Boolean);

    drawAreaColumn(ctx, area.color, centers);
  }

  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

function drawAreaOutline(ctx, view, color, nodes) {
  const y = nodes[0].world.y;
  const hull = paddedHull(nodes.map((node) => ({ x: node.world.x, y: node.world.z })), AREA_PADDING)
    .map((point) => projectPoint({ x: point.x, y, z: point.y }, view.camera, view.viewport));

  if (hull.length === 0 || hull.some((point) => !point)) {
    return null;
  }

  tracePolygon(ctx, hull);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.07;
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  return {
    x: hull.reduce((sum, point) => sum + point.x, 0) / hull.length,
    y: hull.reduce((sum, point) => sum + point.y, 0) / hull.length,
  };
}

function drawAreaColumn(ctx, color, centers) {
  if (centers.length < 2) {
    return;
  }

  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  centers.forEach((center, index) => (index ? ctx.lineTo(center.x, center.y) : ctx.moveTo(center.x, center.y)));
  ctx.stroke();
}

export function drawGizmo(ctx, view) {
  const origin = { x: view.viewport.width - GIZMO.margin, y: GIZMO.margin };
  const axes = [
    { axis: { x: 1, y: 0, z: 0 }, color: "#ef4444", label: "X" },
    { axis: { x: 0, y: 0, z: 1 }, color: "#3b82f6", label: "Z" },
    { axis: { x: 0, y: 1, z: 0 }, color: "#22c55e", label: "↑" },
  ];

  ctx.font = `600 10px ${view.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 2;

  for (const { axis, color, label } of axes) {
    const direction = axisDirection(axis, view.camera);
    const end = { x: origin.x + direction.x * GIZMO.size, y: origin.y + direction.y * GIZMO.size };
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillText(label, origin.x + direction.x * (GIZMO.size + 8), origin.y + direction.y * (GIZMO.size + 8));
  }
}

export function pointInPolygon(point, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = (a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    inside = crosses ? !inside : inside;
  }

  return inside;
}
