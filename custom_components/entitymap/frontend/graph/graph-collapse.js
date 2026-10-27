import { endId } from "../shared/graph-model.js";

const deviceNodeId = (node) => `device.${node.device_id}`;

function collapsibleEntities(nodes, { expanded, keep }) {
  const present = new Set(nodes.map((node) => node.node_id));
  const collapsible = (node) => node.node_type === "entity" && node.device_id
    && present.has(deviceNodeId(node)) && !expanded.has(deviceNodeId(node)) && !keep.has(node.node_id);

  return new Map(nodes.filter(collapsible).map((node) => [node.node_id, deviceNodeId(node)]));
}

function countByDevice(foldedInto) {
  const counts = new Map();

  for (const deviceId of foldedInto.values()) {
    counts.set(deviceId, (counts.get(deviceId) || 0) + 1);
  }

  return counts;
}

function rerouteLinks(links, foldedInto) {
  const reroute = (end) => foldedInto.get(endId(end)) ?? endId(end);
  const seen = new Set();

  return links
    .map((link) => ({ ...link, source: reroute(link.source), target: reroute(link.target) }))
    .filter((link) => link.source !== link.target)
    .filter((link) => {
      const key = `${link.source}|${link.target}|${link.dependency_kind}`;
      const fresh = !seen.has(key);

      seen.add(key);

      return fresh;
    });
}

/**
 * Entities whose device is in view fold into it, unless their device is
 * expanded or they must stay visible (selected, focused, on a path). Their
 * edges move to the device; the device carries `collapsed_count`.
 */
export function collapseEntities(nodes, links, { expanded = new Set(), keep = new Set() } = {}) {
  const foldedInto = collapsibleEntities(nodes, { expanded, keep });
  const counts = countByDevice(foldedInto);
  const kept = nodes
    .filter((node) => !foldedInto.has(node.node_id))
    .map((node) => (counts.has(node.node_id) ? { ...node, collapsed_count: counts.get(node.node_id) } : node));

  return { nodes: kept, links: rerouteLinks(links, foldedInto) };
}
