/** Vendored D3 v7.9.0 (ISC licence, see d3.LICENSE.txt). */
export const D3_SCRIPT_URL = new URL("../vendor/d3.min.js", import.meta.url).href;

/** Bus events fired by the backend GraphBuilder (see const.py). */
export const EVENTS = {
  scanStarted: "entitymap_scan_started",
  graphUpdated: "entitymap_graph_updated",
};

export const PANEL_ICON = "mdi:graph-outline";

export const NODE_CONFIG = {
  device:     { icon: "mdi:chip",               color: "#42A5F5", shape: "rect" },
  entity:     { icon: "mdi:access-point",       color: "#66BB6A", shape: "circle" },
  automation: { icon: "mdi:robot",              color: "#FFA726", shape: "diamond" },
  script:     { icon: "mdi:script-text",        color: "#AB47BC", shape: "diamond" },
  scene:      { icon: "mdi:palette",            color: "#EC407A", shape: "rect" },
  helper:     { icon: "mdi:tools",              color: "#8D6E63", shape: "circle" },
  group:      { icon: "mdi:folder-multiple",    color: "#78909C", shape: "rect" },
  area:       { icon: "mdi:sofa",               color: "#26A69A", shape: "rect" },
  unknown:    { icon: "mdi:help-circle-outline", color: "#BDBDBD", shape: "circle" },
};

/**
 * Sixteen backend dependency kinds collapse into five families that the
 * graph can tell apart by color. Unknown kinds count as references.
 */
export const EDGE_FAMILIES = ["trigger", "condition", "action", "reference", "structure"];

export const EDGE_FAMILY_BY_KIND = {
  trigger: "trigger",
  device_trigger: "trigger",
  condition: "condition",
  device_condition: "condition",
  action: "action",
  device_action: "action",
  service_call: "action",
  target: "action",
  state_reference: "reference",
  template_reference: "reference",
  helper_reference: "reference",
  inferred: "reference",
  entity_of_device: "structure",
  device_in_area: "structure",
  scene_member: "structure",
  group_member: "structure",
};

/**
 * Colors are CSS tokens (see styles.js) so the colorblind palette and themes
 * can swap them; the hex fallback keeps PNG exports correct.
 */
export const EDGE_FAMILY_COLORS = {
  trigger:   "var(--em-edge-trigger, #F97316)",
  condition: "var(--em-edge-condition, #8B5CF6)",
  action:    "var(--em-edge-action, #0EA5E9)",
  reference: "var(--em-edge-reference, #14B8A6)",
  structure: "var(--em-edge-structure, #94A3B8)",
};

export const CONFIDENCE_LEVELS = ["high", "medium", "low"];

export const CONFIDENCE_STROKE = {
  high:   { width: 2, dash: null },
  medium: { width: 1.6, dash: "6,3" },
  low:    { width: 1.6, dash: "2,3" },
};

export const GRAPH_LAYOUTS = ["force", "rooms", "flow", "radial"];

export const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

export const SEVERITY_COLORS = {
  critical: "#d32f2f",
  high:     "#f57c00",
  medium:   "#fbc02d",
  low:      "#66bb6a",
  info:     "#42a5f5",
};

export const COLORBLIND_COLORS = {
  device:     "#0072B2",
  entity:     "#009E73",
  automation: "#E69F00",
  script:     "#CC79A7",
  scene:      "#D55E00",
  helper:     "#56B4E9",
  group:      "#999999",
  area:       "#F0E442",
  unknown:    "#BBBBBB",
};

/** Tunable graph layout/rendering behaviour (SVG drawing geometry stays inline). */
export const GRAPH = {
  maxNodes: 500, /* cap rendered nodes for performance */
  minimapRefreshEvery: 8,
  zoomExtent: [0.1, 5],
  zoomStep: 1.3,
  fitPadding: 40, /* px of slack when fitting the graph to view */
  fitMaxScale: 1.5, /* never zoom past this when auto-fitting */
  parallelEdgeOffset: 22, /* px a curved parallel edge bows out per rank */
  labelMaxChars: 22,
  labelTruncateTo: 20,
  force: {
    comfortable: { distance: 80, charge: -200, collide: 25 },
    compact: { distance: 45, charge: -120, collide: 18 },
  },
  edgeOpacity: 0.75, /* dimmed and emphasized states live in styles.js */
  animMs: { zoom: 200, fit: 300, settle: 500 },
  nodeSize: { base: 11, max: 22, growth: 2.4 }, /* radius grows with degree (importance) */
  focusDepth: 1, /* hops shown around a focused node */
  perfThreshold: 250, /* above N nodes, simplify rendering */
  searchStroke: "var(--em-search, #CA8A04)",
  missingStroke: "var(--em-missing, #db4437)",
  nodeOutline: "var(--em-node-outline, #ffffff)", /* separates nodes from edges in both themes */
  arrowGap: 2, /* px between an arrow tip and the node edge */
  label: { px: 10, minPx: 8, maxPx: 14, hideBelowZoom: 0.5, charHalfWidth: 2.6, gap: 4 },
  gravity: { connected: 0.03, isolated: 0.12 }, /* pull toward the center, stronger for loners */
  hullPadding: 26, /* px around the members of an area */
  glyphScale: 1.15, /* node icon size relative to the radius */
  wave: { stepMs: 220, ringMs: 900, maxDepth: 6, maxNodes: 200 },
  labelZoomThreshold: 1.1, /* perf mode: minor labels appear past this zoom */
  hubDegree: 6, /* perf mode: nodes this connected keep a label */
  seededShare: 0.8, /* reuse layout when this share of nodes has a position */
  reheatAlpha: 0.15, /* gentle re-settle for a reused layout */
  layoutPull: 0.3, /* structured layouts: pull toward the computed spot */
  layoutAlphaDecay: 0.045, /* ...settling in about a second */
};
