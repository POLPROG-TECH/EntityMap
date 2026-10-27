import { endId, nodeDomain, nodeMatchesQuery } from "../shared/graph-model.js";
import { collapseEntities } from "./graph-collapse.js";

export function nodePassesFilters(node, { hiddenTypes, scope }) {
  if (hiddenTypes.has(node.node_type)) {
    return false;
  }

  if (!scope) {
    return true;
  }

  if (scope.kind === "area") {
    return node.area_id === scope.value;
  }

  return nodeDomain(node.node_id) === scope.value;
}

function linksWithin(links, ids) {
  return links.filter((link) => ids.has(endId(link.source)) && ids.has(endId(link.target)));
}

function subgraph(nodes, links, ids) {
  const kept = nodes.filter((node) => ids.has(node.node_id));

  return { nodes: kept, links: linksWithin(links, new Set(kept.map((node) => node.node_id))) };
}

function neighborsOf(ids, links) {
  const next = new Set();

  for (const link of links) {
    const source = endId(link.source);
    const target = endId(link.target);

    if (ids.has(source)) {
      next.add(target);
    }

    if (ids.has(target)) {
      next.add(source);
    }
  }

  return next;
}

export function focusSubgraph(nodes, links, focusId, depth) {
  let keep = new Set([focusId]);

  for (let hop = 0; hop < depth; hop++) {
    keep = new Set([...keep, ...neighborsOf(keep, links)]);
  }

  return subgraph(nodes, links, keep);
}

export function searchSubgraph(nodes, links, query) {
  const matchIds = new Set(nodes.filter((node) => nodeMatchesQuery(node, query)).map((node) => node.node_id));

  return subgraph(nodes, links, new Set([...matchIds, ...neighborsOf(matchIds, links)]));
}

export function capSubgraph(nodes, links, maxNodes) {
  if (nodes.length <= maxNodes) {
    return { nodes, links, total: nodes.length, capped: false };
  }

  const limited = nodes.slice(0, maxNodes);

  return {
    nodes: limited,
    links: linksWithin(links, new Set(limited.map((node) => node.node_id))),
    total: nodes.length,
    capped: true,
  };
}

/**
 * Order matters: filters, then focus and search on the full entity detail,
 * then folding entities into devices, then the node cap.
 */
export function buildVisibleGraph(graph, options) {
  const { hiddenTypes, scope, focusNode, query, focusDepth, maxNodes, collapse } = options;
  const filtered = graph.nodes.filter((node) => nodePassesFilters(node, { hiddenTypes, scope }));
  let view = { nodes: filtered, links: linksWithin(graph.edges, new Set(filtered.map((node) => node.node_id))) };

  if (focusNode) {
    view = focusSubgraph(view.nodes, view.links, focusNode, focusDepth);
  }

  if (query) {
    view = searchSubgraph(view.nodes, view.links, query);
  }

  if (collapse) {
    view = collapseEntities(view.nodes, view.links, collapse);
  }

  return capSubgraph(view.nodes, view.links, maxNodes);
}

/**
 * Edges between the same two nodes (either direction) fan out symmetrically:
 * ranks -1, 0, 1 for three edges, 0 for a lone edge.
 */
export function assignEdgeCurvature(links) {
  const groups = new Map();

  for (const link of links) {
    const [a, b] = [endId(link.source), endId(link.target)].sort();
    const key = `${a}|${b}`;
    groups.set(key, [...(groups.get(key) || []), link]);
  }

  for (const group of groups.values()) {
    const last = group.length - 1;
    group.forEach((link, index) => {
      link._curve = last === 0 ? 0 : index - last / 2;
    });
  }

  return links;
}
