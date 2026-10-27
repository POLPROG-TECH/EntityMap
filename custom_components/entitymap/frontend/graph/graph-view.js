import { GRAPH, NODE_CONFIG } from "../shared/constants.js";
import { computeDegrees, directionalDegrees, endId, nodeMatchesQuery } from "../shared/graph-model.js";
import { assignEdgeCurvature, buildVisibleGraph } from "./graph-filters.js";
import { nodeExtent } from "./graph-geometry.js";
import { haIcon } from "../shared/html.js";

export const GraphView = (Base) =>
  class extends Base {
    _renderGraph() {
      const container = this._graphContainer();

      if (!container) {
        return;
      }

      container.innerHTML = "";
      this._teardown3d();
      const view = this._buildGraphData();

      if (view.nodes.length === 0) {
        this._renderEmptyGraph(container);

        return;
      }

      if (this._is3d()) {
        this._render3dGraph(container, view);

        return;
      }

      this._render2dGraph(container, view);
    }

    _graphContainer() {
      if (!this._graph || !window.d3) {
        return null;
      }

      return this.shadowRoot.getElementById("graph-container");
    }

    _render2dGraph(container, view) {
      const rect = container.getBoundingClientRect();
      const size = { width: rect.width || 900, height: rect.height || 600 };
      const model = this._simulationModel(view);
      const { svg, g, zoom } = this._createGraphSvg(container, size, model.perf);
      const simulation = this._startSimulation(model, size);
      const layers = this._drawGraphLayers(svg, g, model, simulation);
      const fitToView = (duration) => this._fitGraphToView(svg, g, zoom, size.width, size.height, duration);
      const updateMinimap = this._setupMinimap(svg, model.simNodes, size.width, size.height);

      this._runSimulation(simulation, model.simNodes, layers, updateMinimap, fitToView);
      this._wireZoomControls(svg, zoom, fitToView);
      this._restoreViewport(svg, zoom, model.reuseLayout);
      this._fitToLayout({ svg, g, zoom, size }, model.layout);
      this._finishGraphRender(model.simNodes, view);
    }

    _simulationModel(view) {
      const simLinks = view.links.map(l => ({ ...l }));
      const degrees = computeDegrees(simLinks);
      const simNodes = view.nodes.map(n => this._simNode(n, degrees.get(n.node_id) || 0));

      assignEdgeCurvature(simLinks);
      this._adjacency = this._buildAdjacency(simLinks);
      this._directional = directionalDegrees(simLinks);

      return {
        simNodes,
        simLinks,
        layout: this._layoutTargets(simNodes, simLinks),
        perf: simNodes.length > GRAPH.perfThreshold,
        reuseLayout: this._seededShare(simNodes) >= GRAPH.seededShare,
      };
    }

    _createGraphSvg(container, size, perf) {
      const svg = window.d3.select(container)
        .append("svg")
        .attr("class", "graph-svg")
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", [0, 0, size.width, size.height]);
      const g = svg.append("g");
      const zoom = this._createZoom(g, perf);

      this._applyLabelScale(g, 1, perf);
      this._mmViewport = null;
      this._userMovedGraph = false;
      this._fitDone = false;
      svg.call(zoom);
      this._appendArrowMarkers(svg);

      return { svg, g, zoom };
    }

    _createZoom(g, perf) {
      return window.d3.zoom()
        .scaleExtent(GRAPH.zoomExtent)
        .on("zoom", (event) => this._onGraphZoom(event, g, perf));
    }

    _onGraphZoom(event, g, perf) {
      g.attr("transform", event.transform);
      this._applyLabelScale(g, event.transform.k, perf);
      this._updateZoomLevel(event.transform.k);
      this._savedTransform = event.transform;
      this._userMovedGraph = this._userMovedGraph || Boolean(event.sourceEvent);
      this._mmViewport?.(event.transform);
    }

    _startSimulation(model, size) {
      this._simulation?.stop();
      this._simulation = model.layout
        ? this._createTargetSimulation(model.simNodes, model.simLinks, model.layout.positions)
        : this._createSimulation(model.simNodes, model.simLinks, size.width, size.height, model.reuseLayout);

      return this._simulation;
    }

    _drawGraphLayers(svg, g, model, simulation) {
      this._drawLayoutGroups(g, model.layout);
      const hulls = this._drawAreaHulls(g, this._graphLayout === "force" ? model.simNodes : []);
      const link = this._drawLinks(g, this._visibleLinks(model.simLinks, hulls));

      this._renderedLinks = link.data();
      this._drawFlowLayer(g);
      const node = this._drawNodes(g, model.simNodes, simulation, model.perf);

      this._fadeOutsideLayout({ link, node }, model.layout);
      svg.on("click", () => this._closeDetail());
      svg.on("mouseleave", () => this._endHover());

      return { link, node, hulls };
    }

    _finishGraphRender(simNodes, view) {
      this._renderedNodeIds = new Set(simNodes.map(n => n.node_id));
      this._setSearchCount(this._searchMatchCount());
      this._graphStats = { shown: simNodes.length, total: view.total, capped: view.capped };
      this._updateGraphBanner();
      this._reapplyHighlights();
    }

    _searchMatchCount() {
      if (!this._searchQuery) {
        return null;
      }

      return this._graph.nodes
        .filter(node => this._nodePassesFilters(node) && nodeMatchesQuery(node, this._searchQuery))
        .length;
    }

    _simNode(node, degree) {
      const shape = (NODE_CONFIG[node.node_type] || NODE_CONFIG.unknown).shape;
      const r = this._nodeRadius(degree);
      const labelChars = Math.min(node.title.length, GRAPH.labelMaxChars);

      return {
        ...node,
        ...this._positions.get(node.node_id),
        id: node.node_id,
        _degree: degree,
        _r: r,
        _extent: nodeExtent(shape, r),
        _labelHalf: labelChars * GRAPH.label.charHalfWidth,
      };
    }

    /**
     * With area outlines drawn, the device-to-area spokes add only clutter.
     * They stay in the simulation so devices still cluster by area.
     */
    _visibleLinks(simLinks, hulls) {
      const outlinedAreas = new Set(hulls.data().map(hull => hull.area.node_id));
      const spokeHidden = (link) => this._graphLayout === "rooms" || outlinedAreas.has(endId(link.target));

      return simLinks.filter(l => l.dependency_kind !== "device_in_area" || !spokeHidden(l));
    }

    _reapplyHighlights() {
      if (this._pathNodes) {
        this._highlightPath();

        return;
      }

      if (this._selectedNode && this._selectedNeighborhood && this._detailState === "ready") {
        this._highlightNeighborhood(this._selectedNode, this._selectedNeighborhood);
      }
    }

    _runSimulation(simulation, simNodes, { link, node, hulls }, updateMinimap, fitToView) {
      let tickCount = 0;
      simulation.on("tick", () => {
        link.attr("d", d => this._linkPath(d));
        node.attr("transform", d => `translate(${d.x},${d.y})`);
        this._updateAreaHulls(hulls);
        this._updateFlowPaths();

        if (++tickCount % GRAPH.minimapRefreshEvery === 0) {
          updateMinimap();
          this._rememberPositions(simNodes);
        }
      });

      simulation.on("end", () => {
        updateMinimap();
        this._rememberPositions(simNodes);

        if (this._userMovedGraph || this._fitDone) {
          return;
        }

        this._fitDone = true;
        fitToView(GRAPH.animMs.settle);
      });
    }

    _buildGraphData() {
      return buildVisibleGraph(this._graph, {
        hiddenTypes: this._filterTypes,
        scope: this._scopeFilter,
        focusNode: this._focusNode,
        query: this._searchQuery,
        focusDepth: GRAPH.focusDepth,
        maxNodes: GRAPH.maxNodes,
        collapse: this._collapseOptions(),
      });
    }

    _endId(end) {
      return endId(end);
    }

    _renderEmptyGraph(container) {
      this._renderedNodeIds = new Set();
      this._setSearchCount(this._searchMatchCount());
      container.innerHTML = this._emptyGraphMarkup();
      container.querySelector(".empty-scan-btn")?.addEventListener("click", () => this._triggerScan());
      this.shadowRoot.getElementById("graph-zoom-controls")?.toggleAttribute("hidden", true);
      this.shadowRoot.getElementById("graph-minimap")?.toggleAttribute("hidden", true);
    }

    _emptyGraphMarkup() {
      if (this._graph.nodes.length === 0) {
        return `<div class="empty-state">
             ${haIcon("mdi:graph-outline", "empty-illustration")}
             <p>${this._t("no_scan")}</p>
             <button class="btn btn-primary empty-scan-btn">${haIcon("mdi:refresh")} ${this._t("scan_now")}</button>
           </div>`;
      }

      return `<div class="empty-state">
             ${haIcon("mdi:magnify", "empty-illustration")}
             <p>${this._t("no_match")}</p>
           </div>`;
    }
  };
