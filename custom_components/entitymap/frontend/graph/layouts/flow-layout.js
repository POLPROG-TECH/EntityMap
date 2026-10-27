/** Columns follow an event: source, automation or script, controlled entity, device, area. */

import { endId } from "../../shared/graph-model.js";
import { flowDirection } from "../graph-flow-data.js";

export const FLOW = { columnGap: 300, rowGap: 44, headerHeight: 40, padding: 30, sweeps: 4 };
export const FLOW_COLUMNS = ["sources", "logic", "targets", "devices", "areas"];

const COLUMN_BY_TYPE = { automation: 1, script: 1, scene: 1, device: 3, area: 4 };

/**
 * An entity is a source when an automation listens to it (trigger,
 * condition, reference) and a target when one drives it; driven wins.
 */
function eventRoles(links) {
  const roles = { sources: new Set(), targets: new Set() };

  for (const link of links) {
    const direction = flowDirection(link);
    const entity = endId(link.target);

    if (direction > 0) {
      roles.targets.add(entity);
    }

    if (direction < 0) {
      roles.sources.add(entity);
    }
  }

  return roles;
}

export function flowColumnOf(node, roles) {
  if (node.node_type in COLUMN_BY_TYPE) {
    return COLUMN_BY_TYPE[node.node_type];
  }

  return roles.sources.has(node.node_id) && !roles.targets.has(node.node_id) ? 0 : 2;
}

function initialColumns(nodes, roles) {
  const columns = FLOW_COLUMNS.map(() => []);
  const sorted = [...nodes].sort((a, b) => a.title.localeCompare(b.title));

  sorted.forEach((node) => columns[flowColumnOf(node, roles)].push(node.node_id));

  return columns;
}

function neighborIndex(links) {
  const neighbors = new Map();
  const add = (a, b) => neighbors.set(a, [...(neighbors.get(a) || []), b]);

  for (const link of links) {
    add(endId(link.source), endId(link.target));
    add(endId(link.target), endId(link.source));
  }

  return neighbors;
}

/**
 * Barycenter heuristic: each node moves to the average position of its
 * neighbors in the reference column; nodes without such neighbors keep
 * their current position, and the sort is stable.
 */
function reorderColumn(column, reference, neighbors) {
  const position = new Map(reference.map((id, index) => [id, index]));
  const barycenter = (id, index) => {
    const placed = (neighbors.get(id) || []).filter((other) => position.has(other)).map((other) => position.get(other));

    return placed.length ? placed.reduce((sum, value) => sum + value, 0) / placed.length : index;
  };

  return column
    .map((id, index) => ({ id, key: barycenter(id, index) }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.id);
}

/**
 * Alternating left-to-right and right-to-left sweeps, as in layered
 * (Sugiyama-style) graph drawing.
 */
function sweepSteps(columnCount, sweeps) {
  const forward = Array.from({ length: columnCount - 1 }, (_, i) => ({ column: i + 1, reference: i }));
  const backward = Array.from({ length: columnCount - 1 }, (_, i) => ({ column: columnCount - 2 - i, reference: columnCount - 1 - i }));

  return Array.from({ length: sweeps }, () => [...forward, ...backward]).flat();
}

export function orderColumns(columns, links, sweeps = FLOW.sweeps) {
  const neighbors = neighborIndex(links);
  const ordered = columns.map((column) => [...column]);

  for (const { column, reference } of sweepSteps(ordered.length, sweeps)) {
    ordered[column] = reorderColumn(ordered[column], ordered[reference], neighbors);
  }

  return ordered;
}

function columnGroup(index, column, tallest) {
  return {
    kind: "column",
    key: FLOW_COLUMNS[index],
    x: index * FLOW.columnGap - FLOW.columnGap / 2 + FLOW.padding,
    y: -FLOW.headerHeight - FLOW.padding,
    width: FLOW.columnGap - 2 * FLOW.padding,
    height: tallest * FLOW.rowGap + FLOW.headerHeight + 2 * FLOW.padding,
    empty: column.length === 0,
  };
}

export function flowLayout(nodes, links) {
  const columns = orderColumns(initialColumns(nodes, eventRoles(links)), links);
  const tallest = Math.max(1, ...columns.map((column) => column.length));
  const positions = columns.flatMap((column, index) => column.map((id, row) => [id, {
    x: index * FLOW.columnGap,
    y: (row + 0.5) * FLOW.rowGap + ((tallest - column.length) * FLOW.rowGap) / 2,
  }]));

  return {
    positions: new Map(positions),
    groups: columns.map((column, index) => columnGroup(index, column, tallest)).filter((group) => !group.empty),
  };
}
