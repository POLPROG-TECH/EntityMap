import { COLORBLIND_COLORS, NODE_CONFIG, SEVERITY_COLORS } from "../shared/constants.js";

const declarations = (prefix, colors) =>
  Object.entries(colors).map(([name, color]) => `--em-${prefix}-${name}: ${color};`).join(" ");

const pointers = (classPrefix, variable, tokenPrefix, names) =>
  names.map((name) => `.${classPrefix}-${name} { ${variable}: var(--em-${tokenPrefix}-${name}); }`).join("\n      ");

const TYPE_COLORS = Object.fromEntries(Object.entries(NODE_CONFIG).map(([type, cfg]) => [type, cfg.color]));

/**
 * Node type and severity colors as tokens, so markup picks a color with a
 * class (`type-device`, `sev-high`) instead of an inline style. The tokens
 * are generated from the same constants the graph draws with, and the
 * colorblind palette swaps them in one place.
 */
export const COLOR_TOKEN_STYLES = `
      .entitymap-container { ${declarations("type", TYPE_COLORS)} ${declarations("severity", SEVERITY_COLORS)} }
      .entitymap-container.colorblind { ${declarations("type", COLORBLIND_COLORS)} }
      ${pointers("type", "--type-color", "type", Object.keys(TYPE_COLORS))}
      ${pointers("sev", "--sev-color", "severity", Object.keys(SEVERITY_COLORS))}
`;
