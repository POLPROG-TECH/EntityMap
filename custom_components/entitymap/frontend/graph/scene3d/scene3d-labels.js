const GAP = 4;
const SIDE_GAP = 6;

const SLOTS = [
  (c) => ({ x: c.x - c.width / 2, y: c.y + c.radius + GAP }),
  (c) => ({ x: c.x - c.width / 2, y: c.y - c.radius - GAP - c.height }),
  (c) => ({ x: c.x + c.radius + SIDE_GAP, y: c.y - c.height / 2 }),
  (c) => ({ x: c.x - c.radius - SIDE_GAP - c.width, y: c.y - c.height / 2 }),
];

const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function placeOne(candidate, taken) {
  const rects = SLOTS.map((slot) => ({ ...slot(candidate), width: candidate.width, height: candidate.height }));
  const free = rects.findIndex((rect) => !taken.some((other) => overlaps(rect, other)));

  if (free === -1) {
    return null;
  }

  return { id: candidate.id, rect: rects[free], leader: free > 0 };
}

export function placeLabels(candidates) {
  const ordered = candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => b.candidate.priority - a.candidate.priority || a.index - b.index)
    .map(({ candidate }) => candidate);
  const taken = [];
  const placed = [];

  for (const candidate of ordered) {
    const result = placeOne(candidate, taken);

    if (!result) {
      continue;
    }

    taken.push(result.rect);
    placed.push(result);
  }

  return placed;
}
