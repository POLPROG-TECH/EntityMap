import { GRAPH_LAYOUTS } from "../shared/constants.js";
import { THEME_PREFERENCES } from "./theme-sync.js";
import { FALLBACK_LANGUAGE } from "../shared/i18n.js";

const PREFERENCE_KEYS = {
  density: "entitymap-density",
  colorblind: "entitymap-colorblind",
  animations: "entitymap-animations",
  dimension: "entitymap-dimension",
  layout: "entitymap-layout",
  collapse: "entitymap-collapse",
  theme: "entitymap-theme",
};

/**
 * Storage can be unavailable (private mode, blocked site data); preferences
 * then fall back to their defaults instead of breaking the panel.
 */
function readPreference(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export function savePreferences(state) {
  try {
    localStorage.setItem(PREFERENCE_KEYS.density, state._density);
    localStorage.setItem(PREFERENCE_KEYS.colorblind, state._colorblind ? "1" : "0");
    localStorage.setItem(PREFERENCE_KEYS.animations, state._animations ? "1" : "0");
    localStorage.setItem(PREFERENCE_KEYS.dimension, state._graphDimension);
    localStorage.setItem(PREFERENCE_KEYS.layout, state._graphLayout);
    localStorage.setItem(PREFERENCE_KEYS.collapse, state._collapseEntities ? "1" : "0");
    localStorage.setItem(PREFERENCE_KEYS.theme, state._themePreference);
  } catch (e) {
    /* Preferences are a convenience; the current session keeps them in memory. */
  }
}

/**
 * Every mixin reads and writes these fields on the element, so this is the
 * shared contract between the feature modules.
 */
export function createPanelState() {
  return {
    ...homeAssistantState(),
    ...dataState(),
    ...viewState(),
    ...toolbarState(),
    ...graphState(),
    ...animationState(),
    ...scene3dState(),
    ...preferenceState(),
  };
}

function homeAssistantState() {
  return { _hass: null, _narrow: false, _route: null, _lang: FALLBACK_LANGUAGE };
}

function dataState() {
  return {
    _graph: null,
    _findings: null,
    _hierarchy: null,
    _nodesById: new Map(),
    _areaNames: new Map(),
    _scanning: false,
  };
}

function viewState() {
  return {
    _viewMode: "graph", /* "graph" | "findings" | "hierarchy" */
    _selectedNode: null,
    _detailState: "idle", /* "idle" | "loading" | "ready" | "error" */
    _searchQuery: "",
    _filterTypes: new Set(),
    _scopeFilter: null, /* { kind: "area" | "domain", value } */
    _findingsSeverity: "",
    _findingsSort: "severity",
    _hierarchyMode: "list", /* "list" | "tree" */
    _treeOrientation: "horizontal", /* "horizontal" | "vertical" */
    _themeKey: null,
  };
}

function toolbarState() {
  return {
    _filtersOpen: false,
    _openPopup: null, /* null | "scope" | "view-menu" */
    _scopeOptions: [],
    _scopeEntries: [],
    _scopeActive: 0,
    _searchTimer: null,
    _scanAgeTimer: null,
  };
}

function graphState() {
  return {
    _expandedDevices: new Set(),
    _radialCenter: null,
    _focusNode: null,
    _pathMode: false,
    _pathEndpoints: [],
    _pathNodes: null,
    _d3Loaded: false,
    _simulation: null,
    _positions: new Map(),
    _savedTransform: null,
    _mmViewport: null,
  };
}

function animationState() {
  return { _flowNodes: {}, _renderedLinks: [], _flowLayer: null, _waveTimer: null };
}

function scene3dState() {
  return {
    _scene3d: null,
    _camera3d: null,
    _pendingCamera3d: null,
    _scene3dModules: null,
    _scene3dInteracted: false,
    _floorGap3d: 170,
  };
}

function preferenceState() {
  return {
    _density: readPreference(PREFERENCE_KEYS.density) === "compact" ? "compact" : "comfortable",
    _colorblind: readPreference(PREFERENCE_KEYS.colorblind) === "1",
    _animations: readPreference(PREFERENCE_KEYS.animations) !== "0",
    _graphDimension: readPreference(PREFERENCE_KEYS.dimension) === "3d" ? "3d" : "2d",
    _graphLayout: GRAPH_LAYOUTS.includes(readPreference(PREFERENCE_KEYS.layout)) ? readPreference(PREFERENCE_KEYS.layout) : "force",
    _collapseEntities: readPreference(PREFERENCE_KEYS.collapse) === "1",
    _themePreference: THEME_PREFERENCES.includes(readPreference(PREFERENCE_KEYS.theme)) ? readPreference(PREFERENCE_KEYS.theme) : "auto",
  };
}
