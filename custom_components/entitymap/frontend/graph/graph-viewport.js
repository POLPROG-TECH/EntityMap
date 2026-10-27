import { GRAPH } from "../shared/constants.js";
import { isEditableTarget } from "../shared/keyboard.js";
import { Minimap } from "./graph-minimap.js";

const ZOOM_SHORTCUTS = { "+": "in", "=": "in", "-": "out", "_": "out", "0": "reset", f: "fit", F: "fit" };

export const GraphViewportView = (Base) =>
  class extends Base {
    _handleGraphShortcut(event) {
      const action = ZOOM_SHORTCUTS[event.key];
      const modified = event.ctrlKey || event.metaKey || event.altKey;

      if (!action || modified || this._viewMode !== "graph" || isEditableTarget(event)) {
        return false;
      }

      const controls = this.shadowRoot.getElementById("graph-zoom-controls");
      const button = controls?.querySelector(`[data-zoom="${action}"]`);

      if (!button || controls.hidden) {
        return false;
      }

      button.click();

      return true;
    }

    _updateZoomLevel(k) {
      const level = this.shadowRoot.getElementById("zoom-level");

      if (level) {
        level.textContent = `${Math.round(k * 100)}%`;
      }
    }

    _seededShare(simNodes) {
      const seeded = simNodes.filter(n => Number.isFinite(n.x) && Number.isFinite(n.y)).length;

      return seeded / simNodes.length;
    }

    _restoreViewport(svg, zoom, reuseLayout) {
      if (!reuseLayout || !this._savedTransform) {
        return;
      }

      svg.call(zoom.transform, this._savedTransform);
      this._fitDone = true;
    }

    _resetViewport() {
      this._savedTransform = null;
    }

    _resetLayout() {
      this._positions.clear();
      this._savedTransform = null;
    }

    _rememberPositions(simNodes) {
      for (const n of simNodes) {
        this._positions.set(n.node_id, { x: n.x, y: n.y });
      }
    }

    _fitGraphToView(svg, g, zoom, width, height, duration = GRAPH.animMs.settle) {
      const d3 = window.d3;
      const bounds = g.node().getBBox();
      const fullWidth = bounds.width || width;
      const fullHeight = bounds.height || height;
      const scale = Math.min(
        width / (fullWidth + GRAPH.fitPadding),
        height / (fullHeight + GRAPH.fitPadding),
        GRAPH.fitMaxScale,
      );
      const tx = width / 2 - (bounds.x + fullWidth / 2) * scale;
      const ty = height / 2 - (bounds.y + fullHeight / 2) * scale;

      svg.transition().duration(duration).call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    }

    _wireZoomControls(svg, zoom, fitToView) {
      const zoomBy = (factor) => svg.transition().duration(GRAPH.animMs.zoom).call(zoom.scaleBy, factor);

      this._bindZoomButtons({
        in: () => zoomBy(GRAPH.zoomStep),
        out: () => zoomBy(1 / GRAPH.zoomStep),
        fit: () => fitToView(GRAPH.animMs.fit),
        reset: () => svg.transition().duration(GRAPH.animMs.fit).call(zoom.transform, window.d3.zoomIdentity),
      });
    }

    _bindZoomButtons(actions) {
      const controls = this.shadowRoot.getElementById("graph-zoom-controls");

      if (!controls) {
        return;
      }

      controls.hidden = false;
      controls.querySelectorAll("[data-zoom]").forEach(button => {
        button.onclick = actions[button.dataset.zoom];
      });
    }

    _setupMinimap(svg, simNodes, width, height) {
      const element = this.shadowRoot.getElementById("graph-minimap");

      if (!element) {
        this._mmViewport = null;

        return () => {};
      }

      const minimap = new Minimap(element, { width, height, colorOf: (type) => this._typeColor(type) });
      this._mmViewport = (transform) => minimap.showViewport(transform);

      return () => minimap.update(simNodes, window.d3.zoomTransform(svg.node()));
    }
  };
