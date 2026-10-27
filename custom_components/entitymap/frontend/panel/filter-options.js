import { nodeDomain } from "../shared/graph-model.js";

function bump(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

/**
 * Counts follow the scope filter's own rule (a node's own area_id, its
 * entity domain), so the number next to an option is what selecting it shows.
 */
export function buildScopeOptions(nodes, areaNames) {
  const areaCounts = new Map();
  const domainCounts = new Map();

  for (const node of nodes || []) {
    bump(domainCounts, nodeDomain(node.node_id));

    if (node.area_id) {
      bump(areaCounts, node.area_id);
    }
  }

  const byLabel = (a, b) => a.label.localeCompare(b.label);
  const areas = [...areaCounts].map(([value, count]) => ({
    kind: "area",
    value,
    label: areaNames.get(value) || value,
    count,
  }));
  const domains = [...domainCounts].map(([value, count]) => ({ kind: "domain", value, label: value, count }));

  return [...areas.sort(byLabel), ...domains.sort(byLabel)];
}

export function filterScopeOptions(options, query) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return options;
  }

  return options.filter(
    (option) => option.label.toLowerCase().includes(normalized) || option.value.toLowerCase().includes(normalized)
  );
}

export function scopeKey(scope) {
  return scope ? `${scope.kind}:${scope.value}` : "";
}

export function parseScopeKey(key) {
  const separator = key.indexOf(":");

  if (separator === -1) {
    return null;
  }

  return { kind: key.slice(0, separator), value: key.slice(separator + 1) };
}

export function activeFilterCount({ hiddenTypes, scope }) {
  return hiddenTypes.size + (scope ? 1 : 0);
}
