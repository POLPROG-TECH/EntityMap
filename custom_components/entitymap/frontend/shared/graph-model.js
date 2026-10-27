import { EDGE_FAMILY_BY_KIND } from "./constants.js";

export function endId(end) {
  return end && typeof end === "object" ? (end.node_id ?? end.id) : end;
}

export function nodeDomain(nodeId) {
  const dot = nodeId.indexOf(".");

  return dot === -1 ? nodeId : nodeId.slice(0, dot);
}

export function areaNamesById(nodes) {
  const names = new Map();

  for (const node of nodes || []) {
    if (node.node_type !== "area" || !node.area_id) {
      continue;
    }

    names.set(node.area_id, node.title);
  }

  return names;
}

/** The search query is already lower-cased by the panel. */
export function nodeMatchesQuery(node, query) {
  return node.node_id.toLowerCase().includes(query) || node.title.toLowerCase().includes(query);
}

export function countByType(nodes) {
  const counts = new Map();

  for (const node of nodes || []) {
    counts.set(node.node_type, (counts.get(node.node_type) || 0) + 1);
  }

  return counts;
}

export function edgeFamily(dependencyKind) {
  return EDGE_FAMILY_BY_KIND[dependencyKind] || "reference";
}

/**
 * Edges point from the dependent to its dependency, so a node's outgoing
 * edges are what it depends on and its incoming edges are what uses it.
 */
export function directionalDegrees(links) {
  const dependsOn = new Map();
  const usedBy = new Map();
  const bump = (map, id) => map.set(id, (map.get(id) || 0) + 1);

  for (const link of links) {
    bump(dependsOn, endId(link.source));
    bump(usedBy, endId(link.target));
  }

  return { dependsOn, usedBy };
}

/**
 * Entities often inherit their area from their device rather than setting it
 * themselves, so the device's area is the fallback.
 */
export function areaMembership(nodes, nodesById) {
  const members = new Map();

  for (const node of nodes) {
    const areaId = node.node_type === "area" ? null : (node.area_id || deviceArea(node, nodesById));

    if (!areaId) {
      continue;
    }

    if (!members.has(areaId)) {
      members.set(areaId, []);
    }

    members.get(areaId).push(node.node_id);
  }

  return members;
}

function deviceArea(node, nodesById) {
  return node.device_id ? nodesById.get(`device.${node.device_id}`)?.area_id : null;
}

export function computeDegrees(links) {
  const degrees = new Map();
  const bump = (id) => degrees.set(id, (degrees.get(id) || 0) + 1);

  for (const link of links) {
    bump(endId(link.source));
    bump(endId(link.target));
  }

  return degrees;
}

export function findPath(links, fromId, toId) {
  if (fromId === toId) {
    return [fromId];
  }

  const adjacency = undirectedAdjacency(links);
  const prev = new Map([[fromId, null]]);
  const queue = [fromId];

  while (queue.length) {
    const current = queue.shift();

    if (current === toId) {
      return _reconstruct(prev, toId);
    }

    enqueueUnvisited(adjacency.get(current) || [], current, prev, queue);
  }

  return [];
}

function undirectedAdjacency(links) {
  const adjacency = new Map();
  const connect = (a, b) => adjacency.set(a, [...(adjacency.get(a) || []), b]);

  for (const link of links) {
    connect(endId(link.source), endId(link.target));
    connect(endId(link.target), endId(link.source));
  }

  return adjacency;
}

function enqueueUnvisited(neighbors, current, prev, queue) {
  const unvisited = [...new Set(neighbors)].filter(next => !prev.has(next));

  unvisited.forEach(next => prev.set(next, current));
  queue.push(...unvisited);
}

function _reconstruct(prev, toId) {
  const path = [];
  let node = toId;

  while (node !== null && node !== undefined) {
    path.unshift(node);
    node = prev.get(node);
  }

  return path;
}
