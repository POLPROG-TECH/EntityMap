const HULL_RING_POINTS = 8;

/**
 * Distance from a node's center to its outline, good enough for every
 * direction: a square's sides and corners average out near 1.2 r, and the
 * diamond's tips sit 2px beyond r.
 */
export function nodeExtent(shape, radius) {
  if (shape === "rect") {
    return radius * 1.2;
  }

  if (shape === "diamond") {
    return radius + 2;
  }

  return radius;
}

function stepToward(from, to, distance) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance };
}

/**
 * Edges stop at the node outlines instead of the centers, so an arrow tip
 * lands on the target's edge whatever the node's size. Curved (parallel)
 * edges are trimmed along their end tangents. Overlapping nodes get no path.
 */
export function trimmedLinkPath(source, target, { curve = 0, offset = 0, startGap = 0, endGap = 0 } = {}) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= startGap + endGap) {
    return "";
  }

  if (!curve) {
    const start = stepToward(source, target, startGap);
    const end = stepToward(target, source, endGap);

    return `M${start.x},${start.y}L${end.x},${end.y}`;
  }

  const bow = curve * offset;
  const control = {
    x: (source.x + target.x) / 2 - (dy / distance) * bow,
    y: (source.y + target.y) / 2 + (dx / distance) * bow,
  };
  const start = stepToward(source, control, startGap);
  const end = stepToward(target, control, endGap);

  return `M${start.x},${start.y}Q${control.x},${control.y} ${end.x},${end.y}`;
}

function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function buildHalf(points) {
  const half = [];

  for (const point of points) {
    while (half.length >= 2 && cross(half[half.length - 2], half[half.length - 1], point) <= 0) {
      half.pop();
    }

    half.push(point);
  }

  half.pop();

  return half;
}

/** Andrew's monotone chain; returns the hull counter-clockwise. */
export function convexHull(points) {
  if (points.length < 3) {
    return [...points];
  }

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

  return [...buildHalf(sorted), ...buildHalf([...sorted].reverse())];
}

/**
 * Each member contributes a small ring of points, so the hull of the rings
 * is a padded outline with softened corners, even for one or two members.
 */
export function paddedHull(points, padding) {
  const finite = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const ring = finite.flatMap((p) =>
    Array.from({ length: HULL_RING_POINTS }, (_, i) => {
      const angle = (2 * Math.PI * i) / HULL_RING_POINTS;

      return { x: p.x + Math.cos(angle) * padding, y: p.y + Math.sin(angle) * padding };
    })
  );

  return convexHull(ring);
}

export function hullPath(points, padding) {
  const hull = paddedHull(points, padding);

  if (hull.length === 0) {
    return "";
  }

  return `M${hull.map((p) => `${p.x},${p.y}`).join("L")}Z`;
}
