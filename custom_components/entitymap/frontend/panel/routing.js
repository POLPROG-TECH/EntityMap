import { navigateTo } from "../shared/ha-links.js";
import { buildRoutePath, parseRoutePath } from "./route-state.js";

export const RoutingView = (Base) =>
  class extends Base {
    set route(value) {
      this._route = value;
      this._applyRoute(parseRoutePath(value?.path));
    }

    get route() {
      return this._route;
    }

    /**
     * Runs for browser back/forward and shared links. Changes the panel made
     * itself arrive here too, and are no-ops because the state already matches.
     */
    _applyRoute({ view, nodeId }) {
      const viewChanged = view !== this._viewMode;
      const nodeChanged = nodeId !== this._selectedNode;

      if (!viewChanged && !nodeChanged) {
        return;
      }

      this._viewMode = view;

      if (!this.isConnected || !this._graph) {
        this._selectedNode = nodeId;

        return;
      }

      if (viewChanged) {
        this._render();
        this._renderCurrentView();
      }

      if (nodeChanged) {
        this._applyRoutedSelection(nodeId);
      }
    }

    _applyRoutedSelection(nodeId) {
      if (nodeId) {
        this._selectNode(nodeId, { updateRoute: false });

        return;
      }

      this._closeDetail({ updateRoute: false });
    }

    _syncRoute(replace = false) {
      const prefix = this._route?.prefix;

      if (!prefix) {
        return;
      }

      const nodeId = this._viewMode === "graph" ? this._selectedNode : null;
      const path = buildRoutePath(prefix, this._viewMode, nodeId);

      if (window.location.pathname === path) {
        return;
      }

      navigateTo(path, replace);
    }

    _setViewMode(mode) {
      if (mode === this._viewMode) {
        return;
      }

      this._viewMode = mode;
      this._syncRoute();
      this._render();
      this._renderCurrentView();
    }

    _openNodeInGraph(nodeId) {
      const node = this._nodesById.get(nodeId);

      if (!node) {
        return;
      }

      const needsRender = this._viewMode !== "graph" || !this._renderedNodeIds?.has(nodeId);
      const viewChanged = this._viewMode !== "graph";
      this._viewMode = "graph";
      this._selectedNode = nodeId;

      if (needsRender) {
        this._revealNode(node);
        this._render();
        this._renderGraph();
      }

      this._syncRoute(!viewChanged);
      this._selectNode(nodeId, { updateRoute: false });
    }

    _wireNodeRefs(root) {
      root.querySelectorAll("[data-goto]").forEach(button => {
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          this._openNodeInGraph(button.dataset.goto);
        });
      });
    }

    _revealNode(node) {
      this._filterTypes.delete(node.node_type);
      this._searchQuery = "";
      this._focusNode = null;
      this._pathNodes = null;
      this._expandFoldedEntity(node);

      if (this._scopeFilter && !this._nodePassesFilters(node)) {
        this._scopeFilter = null;
        this._resetViewport();
      }
    }

    _expandFoldedEntity(node) {
      if (!this._collapseEntities || node.node_type !== "entity" || !node.device_id) {
        return;
      }

      this._expandedDevices.add(`device.${node.device_id}`);
    }
  };
