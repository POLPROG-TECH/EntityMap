import { NODE_CONFIG, SEVERITY_COLORS } from "./constants.js";
import { escapeHtml, haIcon } from "./html.js";

/** Color classes from panel/color-tokens.js; unknown values from the backend fall back instead of becoming class names. */
export const typeClass = (type) => `type-${type in NODE_CONFIG ? type : "unknown"}`;
export const severityClass = (severity) => `sev-${severity in SEVERITY_COLORS ? severity : "info"}`;

/** `t` is the panel's markup-safe translate function (it escapes variables). */

export function severityLabel(t, severity) {
  return t(`severity_${severity}`);
}

export function fragilityLabel(t, type) {
  const key = `fragility_${type}`;
  const label = t(key);

  return label === key ? escapeHtml(String(type).replace(/_/g, " ")) : label;
}

export function nodeRefMarkup(t, nodeId, inGraph) {
  const code = `<code>${escapeHtml(nodeId)}</code>`;

  if (!inGraph) {
    return code;
  }

  return `<button class="node-ref" data-goto="${escapeHtml(nodeId)}" title="${t("show_in_graph")}">${code}</button>`;
}

export function calloutMarkup(icon, text, variant = "") {
  return `<p class="callout ${variant}">${haIcon(icon, "callout-icon")}<span>${escapeHtml(text)}</span></p>`;
}
