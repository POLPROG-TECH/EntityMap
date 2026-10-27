/**
 * `nodes`: { id, floor, x } for the visible nodes, x in screen pixels.
 * Left and right walk a floor in screen order, up and down jump to the
 * nearest node on the next floor that has any, Home and End go to the
 * ends of the floor. With nothing focused, any key starts at the top floor.
 */
export function navigateNodes(nodes, currentId, key) {
  if (nodes.length === 0) {
    return null;
  }

  const current = nodes.find((node) => node.id === currentId);

  if (!current) {
    return startNode(nodes);
  }

  const floorNodes = nodes.filter((node) => node.floor === current.floor).sort((a, b) => a.x - b.x);
  const index = floorNodes.indexOf(current);
  const moves = {
    ArrowLeft: () => floorNodes[Math.max(0, index - 1)],
    ArrowRight: () => floorNodes[Math.min(floorNodes.length - 1, index + 1)],
    Home: () => floorNodes[0],
    End: () => floorNodes[floorNodes.length - 1],
    ArrowUp: () => nearestOnFloor(nodes, nextFloor(nodes, current.floor, 1), current.x) || current,
    ArrowDown: () => nearestOnFloor(nodes, nextFloor(nodes, current.floor, -1), current.x) || current,
  };

  return (moves[key]?.() || current).id;
}

function startNode(nodes) {
  const top = Math.max(...nodes.map((node) => node.floor));

  return nodes.filter((node) => node.floor === top).sort((a, b) => a.x - b.x)[0].id;
}

function nextFloor(nodes, floor, step) {
  const floors = [...new Set(nodes.map((node) => node.floor))].sort((a, b) => a - b);
  const candidates = step > 0 ? floors.filter((f) => f > floor) : floors.filter((f) => f < floor).reverse();

  return candidates[0];
}

function nearestOnFloor(nodes, floor, x) {
  if (floor === undefined) {
    return null;
  }

  return nodes
    .filter((node) => node.floor === floor)
    .reduce((best, node) => (!best || Math.abs(node.x - x) < Math.abs(best.x - x) ? node : best), null);
}
