/** The selected node in the middle, what it depends on to the right, what depends on it to the left. */

import { endId } from "../../shared/graph-model.js";

export const RADIAL = { ringGap: 170, maxHops: 4, arc: (140 * Math.PI) / 180, gridCell: { width: 156, height: 64 }, gridGap: 120 };

const SIDE_CENTER = { dependencies: 0, dependents: Math.PI };

function directedIndex(links) {
  const index = { dependencies: new Map(), dependents: new Map() };
  const add = (map, a, b) => map.set(a, [...(map.get(a) || []), b]);

  for (const link of links) {
    add(index.dependencies, endId(link.source), endId(link.target));
    add(index.dependents, endId(link.target), endId(link.source));
  }

  return index;
}

/**
 * Breadth-first from the center. The first hop decides the side: what the
 * center depends on goes right, what depends on the center goes left; deeper
 * nodes stay on their parent's side. Each node keeps its first placement.
 */
function exploreSides(centerId, index, present) {
  const placed = new Map([[centerId, { hop: 0, side: null, parent: null }]]);
  let frontier = [centerId];

  for (let hop = 1; hop <= RADIAL.maxHops && frontier.length; hop++) {
    frontier = frontier.flatMap((id) => claimNeighbors(id, hop, index, placed, present));
  }

  return placed;
}

function claimNeighbors(id, hop, index, placed, present) {
  const parentSide = placed.get(id).side;
  const sides = parentSide ? [parentSide] : ["dependencies", "dependents"];
  const candidates = sides.flatMap((side) => (index[side].get(id) || []).map((next) => ({ next, side })));
  const fresh = candidates.filter(({ next }) => present.has(next) && !placed.has(next));

  fresh.forEach(({ next, side }) => placed.set(next, { hop, side, parent: id }));

  return [...new Set(fresh.map(({ next }) => next))];
}

function ringPositions(placed) {
  const positions = new Map([...placed].filter(([, info]) => info.hop === 0).map(([id]) => [id, { x: 0, y: 0 }]));
  const angles = new Map([...positions.keys()].map((id) => [id, 0]));
  const maxHop = Math.max(0, ...[...placed.values()].map((info) => info.hop));

  for (let hop = 1; hop <= maxHop; hop++) {
    placeRing(placed, hop, positions, angles);
  }

  return positions;
}

function placeRing(placed, hop, positions, angles) {
  const entries = ["dependencies", "dependents"].flatMap((side) => sideRing(placed, hop, side, angles));

  for (const { id, angle } of entries) {
    angles.set(id, angle);
    positions.set(id, { x: Math.cos(angle) * hop * RADIAL.ringGap, y: Math.sin(angle) * hop * RADIAL.ringGap });
  }
}

/**
 * Nodes of one side and hop spread evenly over that side's arc, ordered by
 * their parent's angle so branches stay together.
 */
function sideRing(placed, hop, side, angles) {
  const ring = [...placed]
    .filter(([, info]) => info.hop === hop && info.side === side)
    .sort(([a, infoA], [b, infoB]) => angles.get(infoA.parent) - angles.get(infoB.parent) || a.localeCompare(b));
  const step = ring.length > 1 ? RADIAL.arc / (ring.length - 1) : 0;
  const start = SIDE_CENTER[side] - (step * (ring.length - 1)) / 2;

  return ring.map(([id], i) => ({ id, angle: start + i * step }));
}

function unrelatedGrid(ids, top) {
  const columns = Math.max(4, Math.ceil(Math.sqrt(ids.length * 2)));
  const width = columns * RADIAL.gridCell.width;
  const positions = ids.map((id, i) => [id, {
    x: -width / 2 + (i % columns) * RADIAL.gridCell.width + RADIAL.gridCell.width / 2,
    y: top + RADIAL.gridGap + Math.floor(i / columns) * RADIAL.gridCell.height,
  }]);
  const rows = Math.ceil(ids.length / columns);
  const group = { kind: "unrelated", key: "unrelated", x: -width / 2, y: top + RADIAL.gridGap / 2, width, height: rows * RADIAL.gridCell.height + RADIAL.gridGap / 2 };

  return { positions, group };
}

/**
 * Returns null when the center is not in view. Groups: one ring per hop
 * ({ kind: "ring", hop, radius }) and the grid of unrelated nodes. `related`
 * holds the ids placed on the rings, center included.
 */
export function radialLayout(nodes, links, centerId) {
  const present = new Set(nodes.map((node) => node.node_id));

  if (!present.has(centerId)) {
    return null;
  }

  const placed = exploreSides(centerId, directedIndex(links), present);
  const positions = ringPositions(placed);
  const maxHop = Math.max(0, ...[...placed.values()].map((info) => info.hop));
  const rings = Array.from({ length: maxHop }, (_, i) => ({ kind: "ring", key: `ring-${i + 1}`, hop: i + 1, radius: (i + 1) * RADIAL.ringGap }));
  const unrelatedIds = nodes.map((node) => node.node_id).filter((id) => !placed.has(id)).sort();
  const grid = unrelatedIds.length ? unrelatedGrid(unrelatedIds, maxHop * RADIAL.ringGap) : null;

  return {
    positions: new Map([...positions, ...(grid ? grid.positions : [])]),
    groups: grid ? [...rings, grid.group] : rings,
    related: new Set(placed.keys()),
  };
}
