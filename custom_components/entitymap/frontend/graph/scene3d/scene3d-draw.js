import { placeLabels } from "./scene3d-labels.js";
import { mixHex } from "./scene3d-style.js";

const FLOW_DOTS_PER_EDGE = 3;
const FLOW_SPEED = 0.45; /* edge lengths per second */
const DIMMED_ALPHA = 0.18;
const ARROW_AT = 0.56; /* where along an edge its arrowhead sits */
const LOD_SCALE = 0.35; /* below this, nodes draw as plain dots */
const LABEL_MIN_SCALE = 0.6;
const LABEL_MAX_CHARS = 22;
const LABEL_HEIGHT = 14;

/**
 * Canvas cannot read CSS variables, so "var(--token, #fallback)" is resolved
 * against the host element, falling back to the literal default.
 */
export function resolveCssColor(value, element) {
  const match = /^var\((--[\w-]+)\s*,\s*([^)]+)\)$/.exec(String(value).trim());

  if (!match) {
    return value;
  }

  const resolved = getComputedStyle(element).getPropertyValue(match[1]).trim();

  return resolved || match[2].trim();
}

const bothEnds = (view, link) => [view.projected.get(link.sourceId), view.projected.get(link.targetId)];

function offScreen(a, b, viewport) {
  return (a.x < 0 && b.x < 0) || (a.y < 0 && b.y < 0)
    || (a.x > viewport.width && b.x > viewport.width) || (a.y > viewport.height && b.y > viewport.height);
}

function drawArrowhead(ctx, a, b, size) {
  const x = a.x + (b.x - a.x) * ARROW_AT;
  const y = a.y + (b.y - a.y) * ARROW_AT;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);

  ctx.beginPath();
  ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
  ctx.lineTo(x + Math.cos(angle + 2.5) * size, y + Math.sin(angle + 2.5) * size);
  ctx.lineTo(x + Math.cos(angle - 2.5) * size, y + Math.sin(angle - 2.5) * size);
  ctx.closePath();
  ctx.fill();
}

export function drawEdges(ctx, scene, view, highlight) {
  for (const link of scene.links) {
    const [a, b] = bothEnds(view, link);

    if (!a || !b || offScreen(a, b, view.viewport)) {
      continue;
    }

    const emphasized = highlight?.edges?.has(link.key);
    const scale = Math.min(1.4, (a.scale + b.scale) / 2);
    const color = highlight?.pathEdges?.has(link.key) ? view.colors.path : link.color;

    ctx.globalAlpha = (highlight && !emphasized ? DIMMED_ALPHA : 0.85) * Math.min(a.fog, b.fog);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = (emphasized ? 2.5 : link.width) * scale;
    ctx.setLineDash(link.dash || []);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    drawArrowhead(ctx, a, b, Math.min(8, Math.max(3, 5 * scale)));
  }

  ctx.globalAlpha = 1;
}

function drawDotsAlong(ctx, a, b, positions, radius) {
  for (const t of positions) {
    ctx.beginPath();
    ctx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFlow(ctx, scene, view, flowNodes, now) {
  const phase = (now / 1000) * FLOW_SPEED;

  for (const link of scene.links) {
    const active = link.flow !== 0 && (flowNodes.has(link.sourceId) || flowNodes.has(link.targetId));
    const [a, b] = bothEnds(view, link);

    if (!active || !a || !b) {
      continue;
    }

    const positions = Array.from({ length: FLOW_DOTS_PER_EDGE }, (_, i) => {
      const progress = (phase + i / FLOW_DOTS_PER_EDGE) % 1;

      return link.flow > 0 ? progress : 1 - progress;
    });
    ctx.fillStyle = link.color;
    drawDotsAlong(ctx, a, b, positions, 2.6 * Math.max(0.7, (a.scale + b.scale) / 2));
  }
}

export function drawWaveEdges(ctx, view, wave, now) {
  if (!wave) {
    return;
  }

  ctx.fillStyle = wave.color;

  for (const edge of wave.edges) {
    const target = view.projected.get(edge.target);
    const source = view.projected.get(edge.source);
    const progress = (now - wave.start - edge.depth * wave.stepMs) / wave.stepMs;

    if (!target || !source || progress < 0 || progress > 1) {
      continue;
    }

    drawDotsAlong(ctx, target, source, [progress], 4 * Math.max(0.7, source.scale));
  }
}

function shapePath(ctx, shape, x, y, r) {
  ctx.beginPath();

  if (shape === "rect") {
    ctx.roundRect(x - r, y - r, r * 2, r * 2, Math.max(1, r * 0.3));

    return;
  }

  if (shape === "diamond") {
    const p = r * 1.15;
    ctx.moveTo(x, y - p);
    ctx.lineTo(x + p, y);
    ctx.lineTo(x, y + p);
    ctx.lineTo(x - p, y);
    ctx.closePath();

    return;
  }

  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function shadedFill(ctx, node, p) {
  const light = mixHex(node.color, "#ffffff", 0.45);
  const dark = mixHex(node.color, "#000000", 0.18);

  if (node.shape === "circle") {
    const gradient = ctx.createRadialGradient(p.x - p.radius * 0.35, p.y - p.radius * 0.35, p.radius * 0.1, p.x, p.y, p.radius);
    gradient.addColorStop(0, light);
    gradient.addColorStop(0.6, node.color);
    gradient.addColorStop(1, dark);

    return gradient;
  }

  const gradient = ctx.createLinearGradient(p.x - p.radius, p.y - p.radius, p.x + p.radius, p.y + p.radius);
  gradient.addColorStop(0, light);
  gradient.addColorStop(1, dark);

  return gradient;
}

function drawGrounding(ctx, view, p) {
  const flatten = Math.max(0.2, Math.sin(view.camera.pitch)) * 0.6;

  ctx.globalAlpha = 0.14 * p.fog;
  ctx.fillStyle = view.colors.text;
  ctx.beginPath();
  ctx.ellipse(p.shadow.x, p.shadow.y, p.radius, p.radius * flatten, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.3 * p.fog;
  ctx.strokeStyle = view.colors.textSecondary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.shadow.x, p.shadow.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function drawNodeRing(ctx, node, p, color, dashed) {
  shapePath(ctx, node.shape, p.x, p.y, p.radius + 3);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = color;
  ctx.setLineDash(dashed ? [3, 3] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDistantNode(ctx, node, p, dimmed) {
  ctx.globalAlpha = (dimmed ? DIMMED_ALPHA : 0.9) * p.fog;
  ctx.fillStyle = node.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(1.5, p.radius), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Far nodes are plain dots: too small for detail, and they dominate the
 * cost of a frame on large graphs.
 */
export function drawNodes(ctx, scene, view, state) {
  for (const p of view.ordered.filter((projected) => projected.onScreen)) {
    const node = scene.nodesById.get(p.id);
    const dimmed = Boolean(state.highlight?.nodes) && !state.highlight.nodes.has(p.id);

    if (p.scale < LOD_SCALE) {
      drawDistantNode(ctx, node, p, dimmed);

      continue;
    }

    drawNearNode(ctx, view, node, p, dimmed);
    drawNodeRings(ctx, view, node, p, state);
  }

  ctx.globalAlpha = 1;
}

function drawNearNode(ctx, view, node, p, dimmed) {
  drawGrounding(ctx, view, p);
  ctx.globalAlpha = (dimmed ? DIMMED_ALPHA + 0.12 : 1) * p.fog;
  shapePath(ctx, node.shape, p.x, p.y, p.radius);
  ctx.fillStyle = shadedFill(ctx, node, p);
  ctx.fill();
  ctx.lineWidth = node.missing ? 2.5 : 1.5;
  ctx.strokeStyle = node.missing ? view.colors.missing : view.colors.outline;
  ctx.setLineDash(node.missing ? [4, 2] : []);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawNodeRings(ctx, view, node, p, { highlight, hoverId, focusId }) {
  if (p.id === highlight?.primary || p.id === hoverId) {
    drawNodeRing(ctx, node, p, view.colors.primary, false);
  }

  if (p.id === focusId) {
    drawNodeRing(ctx, node, p, view.colors.text, true);
  }
}

export function drawWaves(ctx, view, wave, now) {
  if (!wave) {
    return;
  }

  ctx.strokeStyle = wave.color;
  ctx.lineWidth = 3;

  for (const [id, depth] of wave.depthById) {
    const p = view.projected.get(id);
    const progress = (now - wave.start - depth * wave.stepMs) / wave.ringMs;

    if (!p || progress < 0 || progress > 1) {
      continue;
    }

    ctx.globalAlpha = 0.9 * (1 - progress);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (1 + 1.4 * progress) + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function labelPriority(node, p, { highlight, hoverId, focusId }) {
  if (p.id === hoverId || p.id === focusId || p.id === highlight?.primary) {
    return 3;
  }

  if (highlight?.nodes?.has(p.id)) {
    return 2;
  }

  return node.hub ? 1 : 0;
}

function labelCandidate(ctx, font, { p, node, priority }) {
  const text = node.title.length > LABEL_MAX_CHARS ? `${node.title.slice(0, LABEL_MAX_CHARS - 2)}…` : node.title;
  const size = Math.round(Math.min(13, Math.max(9, 10 * p.scale)));
  ctx.font = font(size);

  return { id: p.id, x: p.x, y: p.y, radius: p.radius, width: ctx.measureText(text).width, height: LABEL_HEIGHT, priority, text, size, fog: p.fog };
}

/**
 * Important labels claim space first (hovered, focused, selected, then the
 * highlighted neighbors, then hubs, then nearer nodes); a label that would
 * overlap a placed one tries the other sides, else it is left out.
 */
export function drawLabels(ctx, scene, view, state) {
  const font = (size) => `500 ${size}px ${view.fontFamily}`;
  const hiddenByHighlight = (p, priority) => state.highlight?.nodes && !state.highlight.nodes.has(p.id) && priority < 3;
  const candidates = [...view.ordered].reverse()
    .filter((p) => p.onScreen)
    .map((p) => {
      const node = scene.nodesById.get(p.id);

      return { p, node, priority: labelPriority(node, p, state) };
    })
    .filter(({ p, priority }) => (priority > 0 || p.scale >= LABEL_MIN_SCALE) && !hiddenByHighlight(p, priority))
    .map((entry) => labelCandidate(ctx, font, entry));
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";

  for (const { id, rect, leader } of placeLabels(candidates)) {
    drawLabel(ctx, view, byId.get(id), rect, leader, font);
  }

  ctx.globalAlpha = 1;
}

function drawLabel(ctx, view, label, rect, leader, font) {
  ctx.globalAlpha = Math.max(0.55, label.fog);

  if (leader) {
    ctx.strokeStyle = view.colors.textSecondary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(label.x, label.y);
    ctx.lineTo(Math.min(Math.max(label.x, rect.x), rect.x + rect.width), Math.min(Math.max(label.y, rect.y), rect.y + rect.height));
    ctx.stroke();
  }

  ctx.font = font(label.size);
  ctx.lineWidth = 3;
  ctx.strokeStyle = view.colors.background;
  ctx.strokeText(label.text, rect.x, rect.y);
  ctx.fillStyle = view.colors.text;
  ctx.fillText(label.text, rect.x, rect.y);
}
