const textMatches = (query, ...values) => values.some((value) => String(value || "").toLowerCase().includes(query));
const entityMatches = (entity, query) => textMatches(query, entity.title, entity.node_id);
const deviceMatches = (device, query) =>
  textMatches(query, device.title, device.node_id, device.metadata?.manufacturer, device.metadata?.model);

function filterEntities(entities, query) {
  const kept = entities.filter((entity) => entityMatches(entity, query));

  return { kept, matches: kept.length };
}

/**
 * A matching device keeps all its entities; otherwise only matching
 * entities keep it in the tree.
 */
function filterDevice(device, query) {
  if (deviceMatches(device, query)) {
    return { kept: device, matches: 1 };
  }

  const { kept: entities, matches } = filterEntities(device.entities, query);

  return { kept: entities.length ? { ...device, entities } : null, matches };
}

function filterDevices(devices, query) {
  const results = devices.map((device) => filterDevice(device, query));

  return {
    kept: results.map((result) => result.kept).filter(Boolean),
    matches: results.reduce((sum, result) => sum + result.matches, 0),
  };
}

function filterArea(area, query) {
  if (textMatches(query, area.title, area.node_id)) {
    return { kept: area, matches: 1 };
  }

  const devices = filterDevices(area.devices, query);
  const entities = filterEntities(area.entities, query);
  const matches = devices.matches + entities.matches;

  if (!matches) {
    return { kept: null, matches: 0 };
  }

  const nestedEntities = devices.kept.reduce((sum, device) => sum + device.entities.length, 0);

  return {
    kept: {
      ...area,
      devices: devices.kept,
      entities: entities.kept,
      device_count: devices.kept.length,
      entity_count: entities.kept.length + nestedEntities,
    },
    matches,
  };
}

export function filterHierarchy(hierarchy, query) {
  const normalized = (query || "").trim().toLowerCase();

  if (!normalized) {
    return { hierarchy, matches: null };
  }

  const areas = hierarchy.areas.map((area) => filterArea(area, normalized));
  const devices = filterDevices(hierarchy.unassigned_devices, normalized);
  const entities = filterEntities(hierarchy.unassigned_entities, normalized);

  return {
    hierarchy: {
      areas: areas.map((area) => area.kept).filter(Boolean),
      unassigned_devices: devices.kept,
      unassigned_entities: entities.kept,
    },
    matches: areas.reduce((sum, area) => sum + area.matches, 0) + devices.matches + entities.matches,
  };
}
