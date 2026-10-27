import { buildPickGrid, projectPoint, sortFarToNear } from "./scene3d-math.js";
import { fogAlpha } from "./scene3d-style.js";

export const NODE_LIFT = 16; /* nodes float this far above their floor plate */
export const PICK_CELL = 48;
const SCREEN_MARGIN = 40;
const FOG_STRENGTH = 0.55;

function projectNode(node, camera, viewport) {
  const center = projectPoint({ ...node.world, y: node.world.y + NODE_LIFT }, camera, viewport);
  const shadow = projectPoint(node.world, camera, viewport);

  if (!center || !shadow) {
    return null;
  }

  const onScreen = center.x > -SCREEN_MARGIN && center.y > -SCREEN_MARGIN
    && center.x < viewport.width + SCREEN_MARGIN && center.y < viewport.height + SCREEN_MARGIN;

  return { ...center, id: node.id, radius: node.r * center.scale, shadow, onScreen };
}

export function projectScene(nodes, camera, viewport) {
  const entries = nodes.map((node) => projectNode(node, camera, viewport)).filter(Boolean);
  const depths = entries.map((p) => p.depth);
  const near = Math.min(...depths);
  const far = Math.max(...depths);
  const withFog = entries.map((p) => ({ ...p, fog: fogAlpha(p.depth, near, far, FOG_STRENGTH) }));

  return {
    projected: new Map(withFog.map((p) => [p.id, p])),
    ordered: sortFarToNear(withFog),
    pickGrid: buildPickGrid(withFog.filter((p) => p.onScreen), PICK_CELL),
  };
}

export function buildAdjacency(links) {
  const adjacency = new Map();
  const connect = (a, b) => {
    if (!adjacency.has(a)) {
      adjacency.set(a, new Set());
    }

    adjacency.get(a).add(b);
  };

  for (const link of links) {
    connect(link.sourceId, link.targetId);
    connect(link.targetId, link.sourceId);
  }

  return adjacency;
}

export function hoverHighlight(hoverId, adjacency, links, highlight) {
  if (!hoverId) {
    return highlight;
  }

  const nodes = new Set([hoverId, ...(adjacency.get(hoverId) || [])]);
  const edges = new Set(links.filter((link) => link.sourceId === hoverId || link.targetId === hoverId).map((link) => link.key));

  return { primary: highlight?.primary, nodes, edges, pathEdges: highlight?.pathEdges };
}

export function insideRect(point, rect) {
  return Boolean(rect) && point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}
