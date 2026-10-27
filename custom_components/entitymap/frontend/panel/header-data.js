import { SEVERITY_ORDER } from "../shared/constants.js";

const UNITS = [
  { unit: "day", seconds: 86400 },
  { unit: "hour", seconds: 3600 },
  { unit: "minute", seconds: 60 },
];

export function relativeTime(isoTimestamp, now, language) {
  const then = Date.parse(isoTimestamp);

  if (Number.isNaN(then)) {
    return null;
  }

  const elapsed = Math.max(0, (now - then) / 1000);
  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const match = UNITS.find(({ seconds }) => elapsed >= seconds);

  if (!match) {
    return format.format(0, "second");
  }

  return format.format(-Math.floor(elapsed / match.seconds), match.unit);
}

export function worstSeverity(findings) {
  const present = new Set((findings || []).map((finding) => finding.severity));

  return SEVERITY_ORDER.find((severity) => present.has(severity)) || null;
}
