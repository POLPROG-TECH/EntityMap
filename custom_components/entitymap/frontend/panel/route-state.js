/** Panel state to URL path and back, e.g. `/entitymap/graph/light.kitchen`. */

const URL_SEGMENTS = { graph: "graph", findings: "issues", hierarchy: "hierarchy" };
const DEFAULT_VIEW = "graph";

export function parseRoutePath(path) {
  const [segment = "", encodedNode = ""] = String(path || "").replace(/^\/+/, "").split("/");
  const view = Object.keys(URL_SEGMENTS).find((mode) => URL_SEGMENTS[mode] === segment);

  if (!view) {
    return { view: DEFAULT_VIEW, nodeId: null };
  }

  const nodeId = view === "graph" && encodedNode ? safeDecode(encodedNode) : null;

  return { view, nodeId };
}

export function buildRoutePath(prefix, view, nodeId) {
  const base = `${prefix}/${URL_SEGMENTS[view] || URL_SEGMENTS[DEFAULT_VIEW]}`;

  return view === "graph" && nodeId ? `${base}/${encodeURIComponent(nodeId)}` : base;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return null;
  }
}
