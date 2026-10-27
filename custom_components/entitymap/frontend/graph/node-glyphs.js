/**
 * SVG text cannot host <ha-icon>, so the graph draws its own line glyphs on
 * a 24x24 grid, echoing the MDI icons used elsewhere in the panel.
 */
export const NODE_GLYPHS = {
  device: "M7 7h10v10H7z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4",
  entity: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M7.8 7.8a6 6 0 0 0 0 8.4 M16.2 7.8a6 6 0 0 1 0 8.4",
  automation: "M13 3L5 14h6l-1 7 8-11h-6z",
  script: "M9 8l-4 4 4 4 M15 8l4 4-4 4",
  scene: "M12 4l2.2 5.8L20 12l-5.8 2.2L12 20l-2.2-5.8L4 12l5.8-2.2z",
  helper: "M4 7h16 M4 17h16 M9 4v6 M15 14v6",
  group: "M4 9h11v11H4z M9 4h11v11",
  area: "M4 11l8-7 8 7 M6 9.5V20h12V9.5",
  unknown: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14 M12 18h.01",
};

export const GLYPH_GRID = 24;

const DARK_GLYPH = "rgba(0, 0, 0, 0.72)";
const LIGHT_GLYPH = "#ffffff";
const LUMINANCE_SPLIT = 0.5;

function channel(value) {
  const c = value / 255;

  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex));

  if (!match) {
    return 0;
  }

  const [r, g, b] = match.slice(1).map((part) => channel(parseInt(part, 16)));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function glyphColor(fillHex) {
  return relativeLuminance(fillHex) > LUMINANCE_SPLIT ? DARK_GLYPH : LIGHT_GLYPH;
}
