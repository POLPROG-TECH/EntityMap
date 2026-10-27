const objectId = (nodeId) => nodeId.slice(nodeId.indexOf(".") + 1);
const navigate = (path, labelKey) => ({ kind: "navigate", path, labelKey });

/**
 * Automations and scenes open in their editor by the config `id` attribute,
 * which only UI-managed items have. Without it they fall back to more-info.
 */
const editorTarget = (domain, state, labelKey) => {
  const configId = state?.attributes?.id;

  return configId ? navigate(`/config/${domain}/edit/${encodeURIComponent(configId)}`, labelKey) : null;
};

const TARGET_BUILDERS = {
  device: (node) =>
    node.device_id ? navigate(`/config/devices/device/${encodeURIComponent(node.device_id)}`, "open_device") : null,
  area: (node) =>
    node.area_id ? navigate(`/config/areas/area/${encodeURIComponent(node.area_id)}`, "open_area") : null,
  automation: (node, state) => editorTarget("automation", state, "open_automation"),
  scene: (node, state) => editorTarget("scene", state, "open_scene"),
  script: (node, state) =>
    state ? navigate(`/config/script/edit/${encodeURIComponent(objectId(node.node_id))}`, "open_script") : null,
};

export function haTargetFor(node, states = {}) {
  if (!node) {
    return null;
  }

  const state = states[node.node_id];
  const builder = TARGET_BUILDERS[node.node_type];
  const target = builder ? builder(node, state) : null;

  if (target) {
    return target;
  }

  return state ? { kind: "more-info", entityId: node.node_id, labelKey: "open_entity" } : null;
}

/**
 * Mirrors the frontend's own navigate(): update history, then let the app
 * router pick the change up through `location-changed`.
 */
export function navigateTo(path, replace = false) {
  if (replace) {
    history.replaceState(null, "", path);
  } else {
    history.pushState(null, "", path);
  }

  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace } }));
}

export function openMoreInfo(element, entityId) {
  element.dispatchEvent(
    new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true })
  );
}
