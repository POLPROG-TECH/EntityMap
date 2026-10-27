import { edgeFamily, endId } from "../shared/graph-model.js";

/**
 * Edges point from the dependent to its dependency. Events travel the other
 * way for triggers, conditions and state references (the entity's change
 * reaches the automation), and along the edge for actions (the automation
 * drives the entity). Structural edges carry no events.
 */
const FLOW_BY_FAMILY = { action: 1, trigger: -1, condition: -1, reference: -1, structure: 0 };

export function flowDirection(link) {
  return FLOW_BY_FAMILY[edgeFamily(link.dependency_kind)] ?? 0;
}

function dependentsIndex(edges) {
  const index = new Map();

  for (const edge of edges) {
    const target = endId(edge.target);
    index.set(target, [...(index.get(target) || []), endId(edge.source)]);
  }

  return index;
}

function expandLayer(layer, index, seen, depth) {
  const reached = layer.flatMap((target) =>
    (index.get(target) || []).map((source) => ({ source, target, depth }))
  );
  const fresh = reached.filter(({ source }) => {
    if (seen.has(source)) {
      return false;
    }

    seen.add(source);

    return true;
  });

  return { nodes: fresh.map(({ source }) => source), edges: fresh };
}

/**
 * Breadth-first over dependents: layer 0 is the node itself, layer N what
 * depends on it through N edges. Each node appears once, at its shortest
 * distance, with the edge that first reached it.
 */
export function impactLayers(edges, nodeId, maxDepth) {
  const index = dependentsIndex(edges);
  const seen = new Set([nodeId]);
  const layers = [[nodeId]];
  const waveEdges = [];

  for (let depth = 0; depth < maxDepth; depth++) {
    const next = expandLayer(layers[depth], index, seen, depth);

    if (next.nodes.length === 0) {
      break;
    }

    layers.push(next.nodes);
    waveEdges.push(...next.edges);
  }

  return { layers, edges: waveEdges };
}
