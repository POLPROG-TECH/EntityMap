import { FLOORS, floorOf } from "./scene3d-math.js";

export const LAYOUT_3D = { floorGap: 170, ringRadius: 260, headlessTicks: 160 };

function centroid(points) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });

  return { x: sum.x / points.length, y: sum.y / points.length };
}

function ringPosition(index, count, radius) {
  const angle = (2 * Math.PI * index) / Math.max(1, count);

  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * The 2D layout becomes the floor plan (x, z) and the node type picks the
 * floor (y), so a node sits right above or below where it is in 2D. Nodes
 * without a 2D position go on a ring on their floor. The scene is centered
 * on the origin, which the camera orbits.
 */
export function layoutScene(nodes, positions, { floorGap = LAYOUT_3D.floorGap, ringRadius = LAYOUT_3D.ringRadius } = {}) {
  const known = nodes.map((node) => positions.get(node.node_id)).filter((p) => p && Number.isFinite(p.x));
  const center = centroid(known);
  const lift = ((FLOORS.length - 1) * floorGap) / 2;
  const unplaced = nodes.filter((node) => !positions.get(node.node_id));
  const ringIndex = new Map(unplaced.map((node, index) => [node.node_id, index]));
  const placed = new Map();

  for (const node of nodes) {
    const known2d = positions.get(node.node_id);
    const plan = known2d
      ? { x: known2d.x - center.x, y: known2d.y - center.y }
      : ringPosition(ringIndex.get(node.node_id), unplaced.length, ringRadius);

    placed.set(node.node_id, { x: plan.x, y: floorOf(node.node_type) * floorGap - lift, z: plan.y });
  }

  return placed;
}

export function headlessPositions(d3, nodes, links, ticks = LAYOUT_3D.headlessTicks) {
  const simNodes = nodes.map((node) => ({ id: node.node_id }));
  const simLinks = links.map((link) => ({ source: link.source, target: link.target }));

  d3.forceSimulation(simNodes)
    .force("link", d3.forceLink(simLinks).id((d) => d.id).distance(80))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("x", d3.forceX(0).strength(0.05))
    .force("y", d3.forceY(0).strength(0.05))
    .stop()
    .tick(ticks);

  return new Map(simNodes.map((n) => [n.id, { x: n.x, y: n.y }]));
}
