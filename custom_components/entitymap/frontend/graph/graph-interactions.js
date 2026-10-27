import { findPath } from "../shared/graph-model.js";
import { nodePassesFilters } from "./graph-filters.js";
import { downloadBlob } from "../shared/download.js";
import { haIcon } from "../shared/html.js";

export const GraphInteractionsView = (Base) =>
  class extends Base {
    _nodePassesFilters(node) {
      return nodePassesFilters(node, { hiddenTypes: this._filterTypes, scope: this._scopeFilter });
    }

    _enterFocus(nodeId) {
      this._focusNode = nodeId;
      this._pathMode = false;
      this._pathNodes = null;
      this._resetViewport();
      this._render();
      this._renderCurrentView();
    }

    _pickPathNode(nodeId) {
      this._pathEndpoints.push(nodeId);

      if (this._pathEndpoints.length < 2) {
        this._announce(this._tText("path_start", { node: this._nodeTitle(nodeId) }));
        this._updateGraphBanner();

        return;
      }

      const [from, to] = this._pathEndpoints;
      this._pathNodes = findPath(this._graph.edges, from, to);
      this._pathMode = false;
      this._pathEndpoints = [];
      this._announce(
        this._pathNodes.length
          ? this._tText("path_nodes", { count: this._pathNodes.length })
          : this._tText("no_path")
      );
      this._render();
      this._renderCurrentView();
    }

    _highlightPath() {
      if (!this._pathNodes || !window.d3) {
        return;
      }

      const order = new Map(this._pathNodes.map((id, i) => [id, i]));
      const onPath = (d) => adjacentOnPath(order, this._endId(d.source), this._endId(d.target));

      if (this._is3d()) {
        const pathEdges = this._scene3dLinkKeys(onPath);
        this._highlight3d({ nodes: new Set(order.keys()), edges: pathEdges, pathEdges });

        return;
      }

      const svg = this._graphSvg();

      svg.selectAll(".node-group").classed("dimmed", d => !order.has(d.node_id));
      svg.selectAll(".links path")
        .classed("dimmed", d => !onPath(d))
        .classed("on-path", onPath)
        .filter(onPath)
        .attr("marker-end", "url(#arrow-path)");
    }

    _downloadGraphImage(png) {
      downloadBlob(png, "entitymap-graph.png");
    }

    _exportGraphImage() {
      if (this._is3d() && this._scene3d) {
        this._exportScene3dImage();

        return;
      }

      const svgEl = this.shadowRoot.querySelector("#graph-container svg");

      if (svgEl) {
        this._exportSvgAsPng(svgEl);
      }
    }

    _exportSvgAsPng(svgEl) {
      const rect = svgEl.getBoundingClientRect();
      const size = { width: rect.width || 900, height: rect.height || 600 };
      const clone = svgEl.cloneNode(true);

      clone.setAttribute("width", size.width);
      clone.setAttribute("height", size.height);
      inlineComputedStyles(svgEl, clone);

      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        this._rasterize(image, size).toBlob((png) => this._downloadGraphImage(png));
      };
      image.src = url;
    }

    _rasterize(image, size) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = size.width;
      canvas.height = size.height;
      ctx.fillStyle = getComputedStyle(this).getPropertyValue("--card-background-color") || "#ffffff";
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.drawImage(image, 0, 0);

      return canvas;
    }

    _nodeTitle(nodeId) {
      return this._nodesById.get(nodeId)?.title || nodeId;
    }

    _updateGraphBanner() {
      const banner = this.shadowRoot.getElementById("graph-banner");

      if (!banner) {
        return;
      }

      const html = this._graphBannerMarkup();
      banner.innerHTML = html;
      banner.hidden = !html;
      banner.querySelector("#clear-modes")?.addEventListener("click", () => this._clearGraphModes());
    }

    _graphBannerMarkup() {
      return this._modeBannerMarkup() ?? this._layoutBannerMarkup();
    }

    _modeBannerMarkup() {
      const clearButton = (labelKey) =>
        `<button class="banner-clear" id="clear-modes">${haIcon("mdi:close")} ${this._t(labelKey)}</button>`;

      if (this._pathMode) {
        return `${haIcon("mdi:vector-polyline")} ${this._t("path_mode", { picked: this._pathEndpoints.length })} ${clearButton("cancel")}`;
      }

      if (this._focusNode) {
        const text = this._t("focused_on", { node: this._nodeTitle(this._focusNode) });

        return `${haIcon("mdi:target")} ${text} ${clearButton("clear")}`;
      }

      if (this._pathNodes) {
        const text = this._pathNodes.length
          ? this._t("path_nodes", { count: this._pathNodes.length })
          : this._t("no_path");

        return `${haIcon("mdi:vector-polyline")} ${text} ${clearButton("clear")}`;
      }

      return null;
    }

    _layoutBannerMarkup() {
      if (this._waitingForRadialCenter()) {
        return `${haIcon("mdi:radar")} ${this._t("radial_hint")}`;
      }

      const stats = this._graphStats || {};

      return stats.capped ? this._t("capped", { shown: stats.shown, total: stats.total }) : "";
    }
  };

/**
 * The exported SVG is rendered as a standalone image, outside the panel's
 * stylesheet and CSS variables, so every style that affects drawing is copied
 * onto the clone as resolved values.
 */
const EXPORTED_STYLES = [
  "fill", "fill-opacity", "stroke", "stroke-opacity", "stroke-width", "stroke-dasharray",
  "opacity", "display", "font-size", "font-family", "font-weight",
];

function inlineComputedStyles(source, clone) {
  const sourceElements = [source, ...source.querySelectorAll("*")];
  const cloneElements = [clone, ...clone.querySelectorAll("*")];

  sourceElements.forEach((element, index) => {
    const computed = getComputedStyle(element);
    const style = EXPORTED_STYLES.map(name => `${name}:${computed.getPropertyValue(name)}`).join(";");
    cloneElements[index].setAttribute("style", style);
  });
}

function adjacentOnPath(order, a, b) {
  return order.has(a) && order.has(b) && Math.abs(order.get(a) - order.get(b)) === 1;
}
