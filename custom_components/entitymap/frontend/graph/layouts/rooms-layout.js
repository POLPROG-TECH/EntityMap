/** One block per area. Nodes without an area of their own join the room their neighbors are in. */

import { areaMembership, endId } from "../../shared/graph-model.js";

export const ROOMS = { cellWidth: 156, cellHeight: 66, padding: 28, header: 30, gap: 56, shareThreshold: 0.6 };
export const UNASSIGNED_ROOM = "unassigned";
export const SHARED_ROOM = "shared";

const TYPE_ORDER = ["area", "device", "entity", "helper", "group", "scene", "script", "automation", "unknown"];

function directAreas(nodes, nodesById) {
  const areaNodes = nodes.filter((node) => node.node_type === "area").map((node) => [node.node_id, node.area_id]);
  const members = [...areaMembership(nodes, nodesById)].flatMap(([areaId, ids]) => ids.map((id) => [id, areaId]));

  return new Map([...areaNodes, ...members]);
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

function mostCommon(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));

  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0];
}

/**
 * Nodes without an area of their own (mostly automations and scripts) join
 * the room most of their neighbors are in; if no room clearly dominates they
 * go to the shared lane, and with no placed neighbors to the unassigned block.
 */
function roomByNeighbors(id, neighbors, direct) {
  const rooms = (neighbors.get(id) || []).map((other) => direct.get(other)).filter(Boolean);

  if (rooms.length === 0) {
    return UNASSIGNED_ROOM;
  }

  const [room, count] = mostCommon(rooms);

  return count / rooms.length >= ROOMS.shareThreshold ? room : SHARED_ROOM;
}

export function assignRooms(nodes, links, nodesById) {
  const direct = directAreas(nodes, nodesById);
  const neighbors = neighborIndex(links);

  return new Map(nodes.map((node) => [node.node_id, direct.get(node.node_id) || roomByNeighbors(node.node_id, neighbors, direct)]));
}

function roomBlock(room, nodes) {
  const ordered = [...nodes].sort((a, b) =>
    TYPE_ORDER.indexOf(a.node_type) - TYPE_ORDER.indexOf(b.node_type) || a.title.localeCompare(b.title)
  );
  const columns = Math.max(2, Math.ceil(Math.sqrt(ordered.length * 1.2)));
  const rows = Math.ceil(ordered.length / columns);

  return {
    room,
    ids: ordered.map((node) => node.node_id),
    columns,
    width: columns * ROOMS.cellWidth + 2 * ROOMS.padding,
    height: rows * ROOMS.cellHeight + 2 * ROOMS.padding + ROOMS.header,
  };
}

function groupByRoom(nodes, rooms) {
  const byRoom = new Map();

  for (const node of nodes) {
    const room = rooms.get(node.node_id);

    if (!byRoom.has(room)) {
      byRoom.set(room, []);
    }

    byRoom.get(room).push(node);
  }

  return byRoom;
}

function roomBlocks(nodes, rooms) {
  const byRoom = groupByRoom(nodes, rooms);
  const rank = (room) => (room === SHARED_ROOM ? 2 : room === UNASSIGNED_ROOM ? 1 : 0);

  return [...byRoom]
    .map(([room, members]) => roomBlock(room, members))
    .sort((a, b) => rank(a.room) - rank(b.room) || b.ids.length - a.ids.length);
}

/**
 * Shelf packing: blocks fill rows left to right up to a width that keeps
 * the overall arrangement roughly square.
 */
function shelfPack(blocks) {
  const area = blocks.reduce((sum, block) => sum + (block.width + ROOMS.gap) * (block.height + ROOMS.gap), 0);
  const maxWidth = Math.max(...blocks.map((block) => block.width), Math.sqrt(area) * 1.3);
  const cursor = { x: 0, y: 0, rowHeight: 0 };

  return blocks.map((block) => {
    if (cursor.x > 0 && cursor.x + block.width > maxWidth) {
      Object.assign(cursor, { x: 0, y: cursor.y + cursor.rowHeight + ROOMS.gap, rowHeight: 0 });
    }

    const placed = { ...block, x: cursor.x, y: cursor.y };
    Object.assign(cursor, { x: cursor.x + block.width + ROOMS.gap, rowHeight: Math.max(cursor.rowHeight, block.height) });

    return placed;
  });
}

function cellCenter(block, index) {
  return {
    x: block.x + ROOMS.padding + (index % block.columns) * ROOMS.cellWidth + ROOMS.cellWidth / 2,
    y: block.y + ROOMS.header + ROOMS.padding + Math.floor(index / block.columns) * ROOMS.cellHeight + ROOMS.cellHeight / 2,
  };
}

/**
 * Returns target positions and one group per room: { key, x, y, width,
 * height }, where key is an area id, "unassigned" or "shared".
 */
export function roomsLayout(nodes, links, nodesById) {
  const blocks = shelfPack(roomBlocks(nodes, assignRooms(nodes, links, nodesById)));

  return {
    positions: new Map(blocks.flatMap((block) => block.ids.map((id, index) => [id, cellCenter(block, index)]))),
    groups: blocks.map((block) => ({ kind: "room", key: block.room, x: block.x, y: block.y, width: block.width, height: block.height })),
  };
}
