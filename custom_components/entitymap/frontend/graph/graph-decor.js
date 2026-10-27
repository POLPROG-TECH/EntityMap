import { GRAPH } from "../shared/constants.js";
import { areaMembership, endId } from "../shared/graph-model.js";
import { hullPath } from "./graph-geometry.js";
import { escapeHtml } from "../shared/html.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const GraphDecorView = (Base) =>
  class extends Base {
    _drawAreaHulls(g, simNodes) {
      const byId = new Map(simNodes.map(n => [n.node_id, n]));
      const members = areaMembership(simNodes, this._nodesById);
      const hulls = simNodes
        .filter(n => n.node_type === "area")
        .map(area => ({
          area,
          points: [area, ...(members.get(area.area_id) || []).map(id => byId.get(id)).filter(Boolean)],
        }))
        .filter(hull => hull.points.length > 1);

      const color = this._typeColor("area");

      return g.append("g")
        .attr("class", "area-hulls")
        .selectAll("path")
        .data(hulls)
        .join("path")
        .attr("class", "area-hull")
        .attr("fill", color)
        .attr("fill-opacity", 0.08)
        .attr("stroke", color)
        .attr("stroke-opacity", 0.45)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "6,4");
    }

    _updateAreaHulls(hulls) {
      hulls.attr("d", d => hullPath(d.points, GRAPH.hullPadding));
    }

    /**
     * Labels live inside the zoomed group, so their font is set in user
     * units that keep the on-screen size between minPx and maxPx.
     */
    _applyLabelScale(g, k, perf) {
      const { px, minPx, maxPx, hideBelowZoom } = GRAPH.label;
      const screenPx = clamp(px * k, minPx, maxPx);
      const hideMinor = k < hideBelowZoom || (perf && k < GRAPH.labelZoomThreshold);

      g.style("--em-label-size", `${screenPx / k}px`);
      g.classed("hide-minor-labels", hideMinor);
    }

    _buildAdjacency(simLinks) {
      const adjacency = new Map();
      const connect = (a, b) => {
        if (!adjacency.has(a)) {
          adjacency.set(a, new Set());
        }

        adjacency.get(a).add(b);
      };

      for (const link of simLinks) {
        connect(endId(link.source), endId(link.target));
        connect(endId(link.target), endId(link.source));
      }

      return adjacency;
    }

    _graphSvg() {
      return window.d3.select(this.shadowRoot.getElementById("graph-container")).select("svg");
    }

    _startHover(element, d) {
      const near = new Set(this._adjacency?.get(d.node_id) || []);
      near.add(d.node_id);
      const touches = (link) => endId(link.source) === d.node_id || endId(link.target) === d.node_id;
      const svg = this._graphSvg();

      svg.classed("hovering", true);
      svg.selectAll(".node-group")
        .classed("hover-near", n => near.has(n.node_id))
        .classed("hover-self", n => n.node_id === d.node_id);
      svg.selectAll(".links path").classed("hover-link", touches);
      this._setFlowNode("hover", d.node_id);
      this._showTooltip(element, d);
    }

    _endHover() {
      const svg = this._graphSvg();

      svg.classed("hovering", false);
      svg.selectAll(".node-group").classed("hover-near", false).classed("hover-self", false);
      svg.selectAll(".links path").classed("hover-link", false);
      this._setFlowNode("hover", null);
      this._hideTooltip();
    }

    _showTooltip(element, d) {
      const tooltip = this.shadowRoot.getElementById("graph-tooltip");
      const area = this.shadowRoot.querySelector(".graph-area");

      if (!tooltip || !area) {
        return;
      }

      tooltip.innerHTML = this._tooltipMarkup(d);
      tooltip.hidden = false;

      const anchor = element.getBoundingClientRect();
      const bounds = area.getBoundingClientRect();
      const left = clamp(anchor.right - bounds.left + 8, 8, bounds.width - tooltip.offsetWidth - 8);
      const top = clamp(anchor.top - bounds.top - tooltip.offsetHeight - 8, 8, bounds.height - tooltip.offsetHeight - 8);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }

    _hideTooltip() {
      const tooltip = this.shadowRoot.getElementById("graph-tooltip");

      if (tooltip) {
        tooltip.hidden = true;
      }
    }

    _tooltipMarkup(d) {
      const areaName = d.area_id ? this._areaNames.get(d.area_id) || d.area_id : null;
      const dependsOn = this._directional?.dependsOn.get(d.node_id) || 0;
      const usedBy = this._directional?.usedBy.get(d.node_id) || 0;
      const status = d.available ? "" : `<div class="tooltip-status">${this._t("missing")}</div>`;
      const folded = d.collapsed_count ? `<span>${this._t("tooltip_collapsed", { count: d.collapsed_count })}</span>` : "";

      return `
        <div class="tooltip-type">${escapeHtml(this._typeLabel(d.node_type))}${areaName ? ` · ${escapeHtml(areaName)}` : ""}</div>
        <div class="tooltip-title">${escapeHtml(d.title)}</div>
        <code class="tooltip-id">${escapeHtml(d.node_id)}</code>
        <div class="tooltip-stats">
          <span>${this._t("tooltip_depends_on", { count: dependsOn })}</span>
          <span>${this._t("tooltip_used_by", { count: usedBy })}</span>
          ${folded}
        </div>
        ${status}`;
    }

    _highlightNeighborhood(nodeId, neighborhood) {
      if (!window.d3 || !this.shadowRoot.getElementById("graph-container")) {
        return;
      }

      const neighborIds = new Set(neighborhood.nodes.map(n => n.node_id));
      neighborIds.add(nodeId);
      const inNeighborhood = (link) => neighborIds.has(endId(link.source)) && neighborIds.has(endId(link.target));
      this._setFlowNode("selected", nodeId);

      if (this._is3d()) {
        this._highlight3d({ primary: nodeId, nodes: neighborIds, edges: this._scene3dLinkKeys(inNeighborhood) });

        return;
      }

      const svg = this._graphSvg();

      svg.selectAll(".node-group")
        .classed("dimmed", d => !neighborIds.has(d.node_id))
        .classed("selected", d => d.node_id === nodeId);
      svg.selectAll(".links path")
        .classed("dimmed", d => !inNeighborhood(d))
        .classed("emphasized", inNeighborhood);
    }

    _resetHighlight() {
      if (!window.d3 || !this.shadowRoot.getElementById("graph-container")) {
        return;
      }

      if (this._is3d()) {
        this._highlight3d(null);
        this._setFlowNode("selected", null);

        return;
      }

      const svg = this._graphSvg();
      svg.selectAll(".node-group").classed("dimmed", false).classed("selected", false);
      svg.selectAll(".links path").classed("dimmed", false).classed("emphasized", false);
      this._setFlowNode("selected", null);
      this._clearImpactWave();
    }
  };
