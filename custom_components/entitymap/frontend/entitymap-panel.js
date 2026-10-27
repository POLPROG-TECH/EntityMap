/**
 * The EntityMap panel element.
 *
 * Features live in their own folders (graph/, findings/, detail/,
 * hierarchy/) and only import from shared/. The panel/ folder holds the shell
 * (layout, data sync, routing, state). This file is the one place that knows
 * every feature: it stacks their mixins and joins their stylesheets.
 */

import { NODE_CONFIG, COLORBLIND_COLORS, D3_SCRIPT_URL } from "./shared/constants.js";
import { escapeHtml, haIcon } from "./shared/html.js";
import { resolveLanguage, translate } from "./shared/i18n.js";
import { createPanelState } from "./panel/panel-state.js";
import { PANEL_STYLES } from "./panel/styles.js";
import { GRAPH_STYLES } from "./graph/styles.js";
import { FINDINGS_STYLES } from "./findings/styles.js";
import { DETAIL_STYLES } from "./detail/styles.js";
import { HIERARCHY_STYLES } from "./hierarchy/styles.js";
import { DataSyncView } from "./panel/data-sync.js";
import { RoutingView } from "./panel/routing.js";
import { LayoutView } from "./panel/layout.js";
import { ThemeSyncView } from "./panel/theme-sync.js";
import { HeaderView } from "./panel/header.js";
import { FilterBarView } from "./panel/filter-bar.js";
import { ScopePickerView } from "./panel/scope-picker.js";
import { ViewMenuView } from "./panel/view-menu.js";
import { GraphView } from "./graph/graph-view.js";
import { GraphRenderView } from "./graph/graph-render.js";
import { GraphDecorView } from "./graph/graph-decor.js";
import { GraphViewportView } from "./graph/graph-viewport.js";
import { GraphFlowView } from "./graph/graph-flow.js";
import { Graph3dView } from "./graph/graph-3d.js";
import { Graph3dControlsView } from "./graph/graph-3d-controls.js";
import { GraphLayoutView } from "./graph/graph-layout-view.js";
import { GraphInteractionsView } from "./graph/graph-interactions.js";
import { HierarchyView } from "./hierarchy/hierarchy-view.js";
import { HierarchyTreeView } from "./hierarchy/hierarchy-tree.js";
import { HierarchyFlowView } from "./hierarchy/hierarchy-flow.js";
import { FindingsView } from "./findings/findings-view.js";
import { DetailView } from "./detail/detail-view.js";

let sharedStyleSheet = null;

function panelStyleSheet() {
  if (!sharedStyleSheet) {
    sharedStyleSheet = new CSSStyleSheet();
    sharedStyleSheet.replaceSync([PANEL_STYLES, GRAPH_STYLES, FINDINGS_STYLES, DETAIL_STYLES, HIERARCHY_STYLES].join("\n"));
  }

  return sharedStyleSheet;
}

class EntityMapPanel extends ThemeSyncView(HeaderView(ViewMenuView(ScopePickerView(FilterBarView(LayoutView(
  DetailView(
    FindingsView(
      HierarchyFlowView(HierarchyTreeView(
        HierarchyView(
          GraphInteractionsView(
            GraphLayoutView(Graph3dControlsView(Graph3dView(GraphFlowView(GraphDecorView(GraphViewportView(GraphRenderView(GraphView(RoutingView(DataSyncView(HTMLElement)))))))))),
          ),
        ),
      )),
    ),
  ),
)))))) {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [panelStyleSheet()];
    Object.assign(this, createPanelState());
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onWindowKeyDown = this._onWindowKeyDown.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._translateMarkup = this._t.bind(this);
  }

  /** Home Assistant sets `hass` on every state change, so this stays cheap. */
  set hass(value) {
    this._hass = value;
    this._syncLanguage();
    this._syncTheme();
    this._syncMenuButton();
    this._subscribeGraphUpdates();

    if (!this._graph) {
      this._loadData();
    }
  }

  set narrow(value) {
    if (value === this._narrow) {
      return;
    }

    this._narrow = value;
    this._syncMenuButton();
  }

  set panel(value) { this._panel = value; }

  connectedCallback() {
    this.shadowRoot.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keydown", this._onWindowKeyDown);
    document.addEventListener("pointerdown", this._onPointerDown);
    this._applyLinkedView();
    this._startScanAgeTicker();
    this._render();
    this._subscribeGraphUpdates();
    this._loadD3()
      .then(() => this._loadData())
      .catch((e) => {
        console.error("EntityMap: Failed to load D3", e);
        this._renderError(this._t("load_failed"));
      });
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keydown", this._onWindowKeyDown);
    document.removeEventListener("pointerdown", this._onPointerDown);
    this._stopHeaderTimers();
    clearTimeout(this._waveTimer);
    this._teardown3d();
    this._unsubscribeGraphUpdates();
    this._simulation?.stop();
  }

  _syncLanguage() {
    const language = resolveLanguage(this._hass);

    if (language === this._lang) {
      return;
    }

    this._lang = language;

    if (!this.isConnected) {
      return;
    }

    this._render();
    this._renderCurrentView();
  }

  _syncMenuButton() {
    const menuButton = this.shadowRoot.querySelector("ha-menu-button");

    if (!menuButton) {
      return;
    }

    menuButton.hass = this._hass;
    menuButton.narrow = this._narrow;
  }

  /** Markup-safe translation: variables are escaped, message text is trusted. */
  _t(key, vars = {}) {
    const safeVars = Object.fromEntries(Object.entries(vars).map(([name, value]) => [name, escapeHtml(value)]));

    return translate(this._lang, key, safeVars);
  }

  _tText(key, vars = {}) {
    return translate(this._lang, key, vars);
  }

  _typeLabel(type) {
    return this._tText(`type_${NODE_CONFIG[type] ? type : "unknown"}`);
  }

  _onKeyDown(e) {
    if (e.key !== "Escape") {
      return;
    }

    if (this._closeInnermostLayer()) {
      e.stopPropagation();
    }
  }

  _closeInnermostLayer() {
    const layers = [
      [() => this._openPopup, () => this._closePopups({ focusTrigger: true })],
      [() => this._filtersOpen, () => this._setFiltersOpen(false)],
      [() => this._focusNode || this._pathMode || this._pathNodes, () => this._clearGraphModes()],
      [() => this._selectedNode, () => this._closeDetail()],
    ];
    const open = layers.find(([isOpen]) => isOpen());

    open?.[1]();

    return Boolean(open);
  }

  /**
   * Graph shortcuts work while focus is in the panel or nowhere in
   * particular, never while another dialog or a text field has it.
   */
  _onWindowKeyDown(e) {
    const path = e.composedPath();
    const focusedElsewhere = !path.includes(this) && path[0] !== document.body;

    if (focusedElsewhere || this._openPopup) {
      return;
    }

    if (this._handleSearchShortcut(e) || this._handleGraphShortcut(e)) {
      e.preventDefault();
    }
  }

  _onPointerDown(e) {
    if (!this._openPopup) {
      return;
    }

    const insidePopup = e.composedPath().some(el => el instanceof Element && el.hasAttribute("data-popup-root"));

    if (!insidePopup) {
      this._closePopups();
    }
  }

  _closePopups({ focusTrigger = false } = {}) {
    const open = this._openPopup;
    this._closeViewMenu({ focusTrigger: focusTrigger && open === "view-menu" });
    this._closeScopePicker({ focusTrigger: focusTrigger && open === "scope" });
  }

  _clearGraphModes() {
    this._focusNode = null;
    this._pathMode = false;
    this._pathEndpoints = [];
    this._pathNodes = null;
    this._resetViewport();
    this._render();
    this._renderCurrentView();
  }

  _announce(message) {
    const live = this.shadowRoot.getElementById("em-live");

    if (live) {
      live.textContent = message;
    }
  }

  _typeColor(type) {
    if (this._colorblind) {
      return COLORBLIND_COLORS[type] || COLORBLIND_COLORS.unknown;
    }

    return (NODE_CONFIG[type] || NODE_CONFIG.unknown).color;
  }

  _renderCurrentView() {
    if (this._viewMode === "graph" && this._d3Loaded && this._graph) {
      requestAnimationFrame(() => this._renderGraph());
    } else if (this._viewMode === "findings") {
      this._renderFindingsList();
    } else if (this._viewMode === "hierarchy") {
      this._renderHierarchy();
    }
  }

  async _loadD3() {
    if (this._d3Loaded || window.d3) {
      this._d3Loaded = true;

      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = D3_SCRIPT_URL;
      script.onload = () => { this._d3Loaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  _render() {
    const root = this.shadowRoot;
    this._openPopup = null;
    this._teardown3d();
    root.innerHTML = this._shellMarkup();
    this._syncMenuButton();

    this._wireHeader(root);
    this._wireFilterBar(root);
    this._wireViewMenu(root);

    if (this._selectedNode && this._viewMode === "graph") {
      this._renderDetailPanel();
    }
  }

  _renderError(message) {
    const container = this.shadowRoot.getElementById("graph-container");

    if (container) {
      container.innerHTML = `<div class="error-state" role="alert">${haIcon("mdi:alert-circle-outline")} ${message}</div>`;
    }
  }
}

customElements.define("entitymap-panel", EntityMapPanel);
