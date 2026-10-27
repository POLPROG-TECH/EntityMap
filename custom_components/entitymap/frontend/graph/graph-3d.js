import { CONFIDENCE_STROKE, EDGE_FAMILY_COLORS, GRAPH, NODE_CONFIG, SEVERITY_COLORS } from "../shared/constants.js";
import { areaMembership, computeDegrees, edgeFamily, endId } from "../shared/graph-model.js";
import { haIcon } from "../shared/html.js";
import { flowDirection, impactLayers } from "./graph-flow-data.js";
import { readLinkedView } from "./graph-3d-link.js";

const DEFAULT_CAMERA_DISTANCE = 1100;
const NODE_SIZE_3D = 0.9;

const linkKey = (link) => `${endId(link.source)}|${endId(link.target)}`;

/**
 * The renderer and its layout load on first use, so the 2D panel never
 * downloads them.
 */
async function loadScene3dModules() {
  const [renderer, layout, draw, math] = await Promise.all([
    import("./scene3d/scene3d-renderer.js"),
    import("./scene3d/scene3d-layout.js"),
    import("./scene3d/scene3d-draw.js"),
    import("./scene3d/scene3d-math.js"),
  ]);

  return { Scene3D: renderer.Scene3D, layout, draw, math };
}

export const Graph3dView = (Base) =>
  class extends Base {
    _is3d() {
      return this._graphDimension === "3d";
    }

    async _render3dGraph(container, view) {
      this._hideMinimap();
      container.innerHTML = this._scene3dStatusMarkup("loading");

      try {
        this._scene3dModules = await loadScene3dModules();
      } catch (error) {
        this._showScene3dLoadError(container, error);

        return;
      }

      if (!this._is3d() || !container.isConnected) {
        return;
      }

      container.innerHTML = "";
      this._teardown3d();
      this._flowLayer = null;
      this._ensurePositions(view);
      this._scene3d = this._createScene3d(container, view);
      this._appendScene3dControls(container, view);
      this._afterScene3dRender(view, this._scene3d);
    }

    _createScene3d(container, view) {
      const { Scene3D, layout, math } = this._scene3dModules;
      const linkedCamera = this._pendingCamera3d ? math.createCamera(this._pendingCamera3d) : null;
      const scene = new Scene3D(container, {
        camera: this._camera3d || linkedCamera,
        ariaLabel: this._tText("scene3d_label", { count: view.nodes.length }),
        callbacks: this._scene3dCallbacks(),
      });

      scene.autoRotate = !this._scene3dInteracted && !linkedCamera;
      scene.setAnimations(this._animationsActive());
      scene.setData(this._scene3dData(view, layout.layoutScene(view.nodes, this._positions), container));
      this._placeInitialCamera(container, scene, linkedCamera);

      return scene;
    }

    _placeInitialCamera(container, scene, linkedCamera) {
      if (!this._camera3d && !linkedCamera) {
        scene.fit();
        this._appendScene3dHint(container);
      }

      this._pendingCamera3d = null;
      this._camera3d = scene.camera;
    }

    _applyLinkedView() {
      const linked = readLinkedView(window.location.search);

      if (linked.dimension) {
        this._graphDimension = linked.dimension;
      }

      this._pendingCamera3d = linked.camera;
    }

    /** Positions left by the 2D flow layout are columns, not a free layout. */
    _canReusePositions(view) {
      const seeded = view.nodes.filter(node => this._positions.has(node.node_id)).length;

      return this._graphLayout !== "flow" && seeded / view.nodes.length >= GRAPH.seededShare;
    }

    _ensurePositions(view) {
      const layout = this._layoutTargets3d(view.nodes, view.links);

      if (layout) {
        layout.positions.forEach((position, id) => this._positions.set(id, position));

        return;
      }

      if (this._canReusePositions(view)) {
        return;
      }

      const computed = this._scene3dModules.layout.headlessPositions(window.d3, view.nodes, view.links);
      computed.forEach((position, id) => this._positions.set(id, position));
    }

    _scene3dData(view, placed, container) {
      const { math } = this._scene3dModules;
      const degrees = computeDegrees(view.links);

      return {
        nodes: view.nodes.map(node => this._scene3dNode(node, degrees.get(node.node_id) || 0, placed.get(node.node_id))),
        links: view.links.map(link => this._scene3dLink(link, container)),
        areas: this._scene3dAreas(view, container),
        floorLabels: Object.fromEntries(math.FLOORS.map(floor => [floor, this._tText(`floor_${floor}`)])),
        floorGap: this._floorGap3d,
      };
    }

    _scene3dNode(node, degree, position) {
      return {
        id: node.node_id,
        title: node.title,
        floor: this._scene3dModules.math.floorOf(node.node_type),
        plan: { x: position.x, z: position.z },
        r: this._nodeRadius(degree) * NODE_SIZE_3D,
        color: this._typeColor(node.node_type),
        shape: (NODE_CONFIG[node.node_type] || NODE_CONFIG.unknown).shape,
        missing: !node.available,
        hub: degree >= GRAPH.hubDegree,
      };
    }

    _scene3dLink(link, container) {
      const stroke = CONFIDENCE_STROKE[link.confidence] || CONFIDENCE_STROKE.high;
      const color = EDGE_FAMILY_COLORS[edgeFamily(link.dependency_kind)];

      return {
        key: linkKey(link),
        sourceId: endId(link.source),
        targetId: endId(link.target),
        color: this._scene3dModules.draw.resolveCssColor(color, container),
        width: stroke.width,
        dash: stroke.dash ? stroke.dash.split(",").map(Number) : null,
        flow: flowDirection(link),
      };
    }

    _scene3dAreas(view, container) {
      const members = areaMembership(view.nodes, this._nodesById);
      const color = this._scene3dModules.draw.resolveCssColor(this._typeColor("area"), container);

      return view.nodes
        .filter(node => node.node_type === "area")
        .map(area => ({ id: area.node_id, color, memberIds: [area.node_id, ...(members.get(area.area_id) || [])] }))
        .filter(area => area.memberIds.length > 1);
    }

    _scene3dCallbacks() {
      return {
        onSelect: (id) => this._onScene3dSelect(id),
        onFocus: (id) => this._enterFocus(id),
        onInteract: () => {
          this._scene3dInteracted = true;
          this.shadowRoot.querySelector(".scene3d-hint")?.remove();
        },
        onHover: (id, anchor) => this._onScene3dHover(id, anchor),
        onKeyFocus: (id, anchor) => this._onScene3dKeyFocus(id, anchor),
        onCameraChange: (camera) => {
          this._camera3d = camera;
          this._updateZoomLevel(DEFAULT_CAMERA_DISTANCE / camera.distance);
        },
      };
    }

    _onScene3dSelect(id) {
      if (!id) {
        this._closeDetail();

        return;
      }

      if (this._pathMode) {
        this._pickPathNode(id);

        return;
      }

      this._selectNode(id);
      this._scene3d?.flyTo(id);
    }

    _onScene3dKeyFocus(id, anchor) {
      this._setFlowNode("hover", id);

      if (!id) {
        this._hideTooltip();

        return;
      }

      const node = this._nodesById.get(id);
      const floor = this._tText(`floor_${this._floorNameOf(node)}`);
      this._announce(this._tText("scene3d_focus", { type: this._typeLabel(node.node_type), name: node.title, floor }));
      this._showTooltip(anchor, node);
    }

    _onScene3dHover(id, anchor) {
      this._setFlowNode("hover", id);

      if (!id) {
        this._hideTooltip();

        return;
      }

      this._showTooltip(anchor, this._nodesById.get(id));
    }

    _appendScene3dHint(container) {
      const hint = document.createElement("div");
      hint.className = "scene3d-hint";
      hint.textContent = this._tText("scene3d_hint");
      container.appendChild(hint);
    }

    _afterScene3dRender(view, scene) {
      this._renderedNodeIds = new Set(view.nodes.map(node => node.node_id));
      this._renderedLinks = view.links;
      this._directional = null;
      this._graphStats = { shown: view.nodes.length, total: view.total, capped: view.capped };
      this._wireScene3dZoom(scene);
      this._updateZoomLevel(DEFAULT_CAMERA_DISTANCE / scene.camera.distance);
      this._setSearchCount(this._searchMatchCount());
      this._updateGraphBanner();
      this._reapplyHighlights();
      this._hideMinimap();
    }

    /** The minimap is an <svg>, whose `hidden` property does nothing. */
    _hideMinimap() {
      this.shadowRoot.getElementById("graph-minimap")?.toggleAttribute("hidden", true);
    }

    /**
     * A failed download (offline, server restarting) would otherwise leave
     * an empty canvas area with no explanation.
     */
    _showScene3dLoadError(container, error) {
      if (!this._is3d() || !container.isConnected) {
        return;
      }

      console.warn("EntityMap: the 3D view could not be loaded", error);
      container.innerHTML = this._scene3dStatusMarkup("error");
      container.querySelector("#retry-3d")?.addEventListener("click", () => this._renderGraph());
      container.querySelector("#back-to-2d")?.addEventListener("click", () => this._setGraphDimension("2d"));
    }

    _scene3dStatusMarkup(state) {
      if (state === "loading") {
        return `<div class="loading-state"><div class="spinner"></div><p>${this._t("scene3d_loading")}</p></div>`;
      }

      return `
        <div class="error-state" role="alert">
          ${haIcon("mdi:cube-off-outline")}
          <p>${this._t("scene3d_load_failed")}</p>
          <div class="error-actions">
            <button class="btn btn-sm" id="retry-3d">${haIcon("mdi:refresh")} ${this._t("retry")}</button>
            <button class="btn btn-sm" id="back-to-2d">${this._t("back_to_2d")}</button>
          </div>
        </div>`;
    }

    _wireScene3dZoom(scene) {
      this._bindZoomButtons({
        in: () => scene.zoomBy(GRAPH.zoomStep),
        out: () => scene.zoomBy(1 / GRAPH.zoomStep),
        fit: () => scene.fit(),
        reset: () => scene.resetCamera(),
      });
    }

    _highlight3d(highlight) {
      this._scene3d?.setHighlight(highlight?.nodes ? highlight : null);
    }

    _scene3dLinkKeys(predicate) {
      return new Set((this._renderedLinks || []).filter(predicate).map(linkKey));
    }

    _playImpactWave3d(nodeId, severity) {
      if (!this._scene3d) {
        return;
      }

      const { layers, edges } = impactLayers(this._graph.edges, nodeId, GRAPH.wave.maxDepth);
      const depthById = new Map(layers.flatMap((layer, depth) => layer.map(id => [id, depth])));

      this._scene3d.playWave({
        depthById,
        edges,
        color: SEVERITY_COLORS[severity] || SEVERITY_COLORS.high,
        stepMs: GRAPH.wave.stepMs,
        ringMs: GRAPH.wave.ringMs,
      });
    }

    _exportScene3dImage() {
      this._scene3d.toBlob((png) => this._downloadGraphImage(png));
    }

    _teardown3d() {
      this._scene3d?.destroy();
      this._scene3d = null;
    }
  };
