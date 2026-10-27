import { EDGE_FAMILY_COLORS, GRAPH, SEVERITY_COLORS } from "../shared/constants.js";
import { edgeFamily, endId } from "../shared/graph-model.js";
import { flowDirection, impactLayers } from "./graph-flow-data.js";

const waveDelay = (depth) => `${depth * GRAPH.wave.stepMs}ms`;
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export const GraphFlowView = (Base) =>
  class extends Base {
    _animationsActive() {
      return this._animations && !prefersReducedMotion();
    }

    _drawFlowLayer(g) {
      this._flowLayer = g.append("g").attr("class", "flow-layer");
      this._flowLinks = [];

      return this._flowLayer;
    }

    _setFlowNode(role, nodeId) {
      this._flowNodes = { ...this._flowNodes, [role]: nodeId };
      this._scene3d?.setFlowNodes(Object.values(this._flowNodes).filter(Boolean));
      this._renderFlow();
    }

    _renderFlow() {
      if (!this._flowLayer) {
        return;
      }

      const active = new Set(Object.values(this._flowNodes || {}).filter(Boolean));
      const touches = (link) => active.has(endId(link.source)) || active.has(endId(link.target));
      const links = this._animationsActive()
        ? (this._renderedLinks || []).filter(link => touches(link) && flowDirection(link) !== 0)
        : [];

      this._flowLinks = this._flowLayer.selectAll("path")
        .data(links)
        .join("path")
        .attr("class", d => flowDirection(d) < 0 ? "flow-path reverse" : "flow-path")
        .attr("stroke", d => EDGE_FAMILY_COLORS[edgeFamily(d.dependency_kind)])
        .attr("d", d => this._linkPath(d));
    }

    _updateFlowPaths() {
      if (this._flowLinks?.size?.()) {
        this._flowLinks.attr("d", d => this._linkPath(d));
      }
    }

    _playImpactWave(nodeId, severity) {
      if (!this._animationsActive() || !this._graph) {
        return;
      }

      if (this._is3d()) {
        this._playImpactWave3d(nodeId, severity);

        return;
      }

      const { layers, edges } = impactLayers(this._graph.edges, nodeId, GRAPH.wave.maxDepth);
      const svg = this._graphSvg();

      this._clearImpactWave();
      this._setWaveSeverity(svg, severity in SEVERITY_COLORS ? severity : "high");
      this._addWaveRings(svg, new Map(layers.flatMap((layer, depth) => layer.map(id => [id, depth]))));
      this._pulseWaveEdges(svg, edges);
      this._waveTimer = setTimeout(() => this._clearImpactWave(), layers.length * GRAPH.wave.stepMs + GRAPH.wave.ringMs);
    }

    _setWaveSeverity(svg, severity) {
      Object.keys(SEVERITY_COLORS).forEach(name => svg.classed(`sev-${name}`, name === severity));
    }

    _addWaveRings(svg, depthById) {
      svg.selectAll(".node-group")
        .filter(d => this._renderedNodeIds?.has(d.node_id) && depthById.has(d.node_id))
        .filter((d, i) => i < GRAPH.wave.maxNodes)
        .append("circle")
        .attr("class", "wave-ring")
        .attr("r", d => d._extent + 2)
        .style("--wave-delay", d => waveDelay(depthById.get(d.node_id)));
    }

    _pulseWaveEdges(svg, edges) {
      const depthByKey = new Map(edges.map(edge => [`${edge.source}|${edge.target}`, edge.depth]));
      const keyOf = (d) => `${endId(d.source)}|${endId(d.target)}`;

      svg.selectAll(".links path")
        .filter(d => depthByKey.has(keyOf(d)))
        .classed("wave-edge", true)
        .style("--wave-delay", d => waveDelay(depthByKey.get(keyOf(d))));
    }

    _clearImpactWave() {
      clearTimeout(this._waveTimer);

      if (!window.d3 || !this.shadowRoot.getElementById("graph-container")) {
        return;
      }

      const svg = this._graphSvg();
      svg.selectAll(".wave-ring").remove();
      svg.selectAll(".links path.wave-edge").classed("wave-edge", false).style("--wave-delay", null);
    }
  };
