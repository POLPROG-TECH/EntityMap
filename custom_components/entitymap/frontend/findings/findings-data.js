import { SEVERITY_ORDER } from "../shared/constants.js";

export const FINDING_SORTS = ["severity", "type", "node"];

const CSV_COLUMNS = ["severity", "fragility_type", "node_id", "related_node_ids", "rationale", "remediation"];

const severityRank = (finding) => {
  const rank = SEVERITY_ORDER.indexOf(finding.severity);

  return rank === -1 ? SEVERITY_ORDER.length : rank;
};

const SORTERS = {
  severity: (a, b) => severityRank(a) - severityRank(b) || a.node_id.localeCompare(b.node_id),
  type: (a, b) => a.fragility_type.localeCompare(b.fragility_type) || severityRank(a) - severityRank(b),
  node: (a, b) => a.node_id.localeCompare(b.node_id) || severityRank(a) - severityRank(b),
};

function findingMatches(finding, query) {
  const haystack = [
    finding.node_id,
    finding.fragility_type,
    finding.rationale,
    ...(finding.related_node_ids || []),
  ];

  return haystack.some((value) => String(value || "").toLowerCase().includes(query));
}

export function selectFindings(findings, options = {}) {
  const { severity = "", query = "", hiddenTypes = new Set(), nodeTypeById = new Map(), sort = "severity" } = options;
  const normalizedQuery = query.toLowerCase();

  return (findings || [])
    .filter((f) => !severity || f.severity === severity)
    .filter((f) => !hiddenTypes.has(nodeTypeById.get(f.node_id)))
    .filter((f) => !normalizedQuery || findingMatches(f, normalizedQuery))
    .sort(SORTERS[sort] || SORTERS.severity);
}

export function countBySeverity(findings) {
  const counts = Object.fromEntries(SEVERITY_ORDER.map((severity) => [severity, 0]));

  for (const finding of findings || []) {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
  }

  return counts;
}

/**
 * Spreadsheet apps execute cells starting with these characters as formulas,
 * so they get a leading apostrophe (OWASP CSV injection guidance).
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" ") : String(value ?? "");
  const safe = FORMULA_PREFIX.test(text) ? `'${text}` : text;

  return `"${safe.replace(/"/g, '""')}"`;
}

export function findingsToCsv(findings) {
  const rows = (findings || []).map((finding) => CSV_COLUMNS.map((column) => csvCell(finding[column])).join(","));

  return [CSV_COLUMNS.join(","), ...rows].join("\r\n");
}
