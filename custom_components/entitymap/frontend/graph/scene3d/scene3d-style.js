const HEX = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function parseHex(hex) {
  const match = HEX.exec(String(hex).trim());

  return match ? match.slice(1).map((part) => parseInt(part, 16)) : null;
}

export function mixHex(hex, otherHex, amount) {
  const a = parseHex(hex);
  const b = parseHex(otherHex);

  if (!a || !b) {
    return hex;
  }

  const mixed = a.map((channel, i) => Math.round(channel + (b[i] - channel) * amount));

  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function fogAlpha(depth, nearDepth, farDepth, strength) {
  if (farDepth <= nearDepth) {
    return 1;
  }

  const t = Math.min(1, Math.max(0, (depth - nearDepth) / (farDepth - nearDepth)));

  return 1 - strength * t;
}
