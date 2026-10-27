import { EVENTS } from "../shared/constants.js";
import { areaNamesById } from "../shared/graph-model.js";

export const DataSyncView = (Base) =>
  class extends Base {
    /**
     * Concurrent callers share one in-flight request. A forced reload that
     * arrives mid-flight is queued, so a scan finishing during a load is not lost.
     */
    _loadData({ force = false } = {}) {
      if (!this._hass) {
        return Promise.resolve();
      }

      if (this._loadPromise) {
        this._reloadQueued = this._reloadQueued || force;

        return this._loadPromise;
      }

      this._loadPromise = this._fetchData().finally(() => this._finishLoad());

      return this._loadPromise;
    }

    _finishLoad() {
      this._loadPromise = null;

      if (!this._reloadQueued) {
        return;
      }

      this._reloadQueued = false;
      this._loadData();
    }

    async _fetchData() {
      try {
        const [graph, findings, hierarchy] = await Promise.all([
          this._hass.callWS({ type: "entitymap/graph" }),
          this._hass.callWS({ type: "entitymap/findings" }),
          this._hass.callWS({ type: "entitymap/hierarchy" }),
        ]);
        this._applyData(graph, findings, hierarchy);
      } catch (e) {
        console.error("EntityMap: Failed to load data", e);
        this._renderError(this._t("load_failed"));
      }
    }

    _applyData(graph, findings, hierarchy) {
      this._graph = graph;
      this._findings = findings;
      this._hierarchy = hierarchy;
      this._nodesById = new Map(graph.nodes.map((node) => [node.node_id, node]));
      this._areaNames = areaNamesById(graph.nodes);
      this._render();
      this._renderCurrentView();
      this._restoreSelection();
    }

    _restoreSelection() {
      if (!this._selectedNode) {
        return;
      }

      if (this._nodesById.has(this._selectedNode)) {
        this._selectNode(this._selectedNode, { updateRoute: false, announce: false });

        return;
      }

      this._closeDetail();
    }

    /**
     * Non-admin users may not subscribe to custom events; the panel then
     * still works, it just refreshes on a manual rescan only.
     */
    _subscribeGraphUpdates() {
      if (!this.isConnected || !this._hass?.connection || this._eventUnsubs) {
        return;
      }

      const connection = this._hass.connection;
      this._eventUnsubs = Promise.all([
        connection.subscribeEvents(() => this._onScanStarted(), EVENTS.scanStarted),
        connection.subscribeEvents(() => this._onGraphUpdated(), EVENTS.graphUpdated),
      ]).catch((e) => {
        console.warn("EntityMap: Live updates unavailable", e);

        return [];
      });
    }

    _unsubscribeGraphUpdates() {
      const pending = this._eventUnsubs;
      this._eventUnsubs = null;
      pending?.then((unsubs) => unsubs.forEach((unsub) => unsub()));
    }

    _onScanStarted() {
      this._setScanning(true);
    }

    async _onGraphUpdated() {
      /* A manual rescan reloads on its own once the WebSocket call returns. */
      if (this._manualScan) {
        return;
      }

      await this._loadData({ force: true });
      this._setScanning(false);
      this._announce(this._tText("announce_updated"));
    }

    async _triggerScan() {
      if (!this._hass || this._manualScan) {
        return;
      }

      this._manualScan = true;
      this._setScanning(true);

      try {
        await this._hass.callWS({ type: "entitymap/scan" });
        await this._loadData({ force: true });
      } catch (e) {
        console.error("EntityMap: Scan failed", e);
        this._renderError(this._t("scan_failed"));
      } finally {
        this._manualScan = false;
        this._setScanning(false);
      }
    }

    _setScanning(active) {
      this._scanning = active;
      const button = this.shadowRoot.querySelector(".scan-btn");

      if (!button) {
        return;
      }

      button.disabled = active;
      button.setAttribute("aria-busy", String(active));
      button.querySelector(".btn-label").textContent = this._tText(active ? "scanning" : "rescan");
    }

    async _selectNode(nodeId, { updateRoute = true, announce = true } = {}) {
      this._selectedNode = nodeId;
      this._detailState = "loading";
      this._userMovedGraph = true;
      this._relayoutForSelection(nodeId);
      this._renderDetailPanel();

      if (updateRoute) {
        this._syncRoute(true);
      }

      if (!this._hass) {
        return;
      }

      try {
        const [impact, neighborhood, migration] = await Promise.all([
          this._hass.callWS({ type: "entitymap/impact", node_id: nodeId }),
          this._hass.callWS({ type: "entitymap/neighborhood", node_id: nodeId, depth: 2 }),
          this._hass.callWS({ type: "entitymap/migration", node_id: nodeId }),
        ]);
        this._showNodeDetails(nodeId, { impact, neighborhood, migration }, announce);
      } catch (e) {
        this._showNodeError(nodeId, e);
      }
    }

    /** Responses for a node the user already moved away from are dropped. */
    _showNodeDetails(nodeId, { impact, neighborhood, migration }, announce) {
      if (this._selectedNode !== nodeId) {
        return;
      }

      this._selectedImpact = impact;
      this._selectedNeighborhood = neighborhood;
      this._selectedMigration = migration;
      this._detailState = "ready";
      this._renderDetailPanel();
      this._highlightNeighborhood(nodeId, neighborhood);

      if (!announce) {
        return;
      }

      this._playImpactWave(nodeId, impact.severity);

      const node = this._nodesById.get(nodeId);
      this._announce(this._tText("announce_selected", { node: node?.title || nodeId }));
    }

    _showNodeError(nodeId, error) {
      if (this._selectedNode !== nodeId) {
        return;
      }

      console.error("EntityMap: Failed to load node details", error);
      this._detailState = "error";
      this._renderDetailPanel();
    }
  };
