import { GRAPH } from "../shared/constants.js";
import { endId } from "../shared/graph-model.js";
import { flowLayout } from "./layouts/flow-layout.js";
import { radialLayout } from "./layouts/radial-layout.js";
import { SHARED_ROOM, UNASSIGNED_ROOM, roomsLayout } from "./layouts/rooms-layout.js";

const FRAME_RADIUS = 14;
const LABEL_INSET = { x: 14, y: 10 };
const SIDE_LABEL_OFFSET = 34;

export const GraphLayoutView = (Base) =>
  class extends Base {
    _layoutTargets(nodes, links) {
      const layouts = {
        rooms: () => roomsLayout(nodes, links, this._nodesById),
        flow: () => flowLayout(nodes, links),
        radial: () => radialLayout(nodes, links, this._radialCenter),
      };

      return layouts[this._graphLayout]?.() ?? null;
    }

    /**
     * In 3D the floors already split nodes by type, so the flow columns would
     * collapse into one thin line per floor; flow falls back to the free layout.
     */
    _layoutTargets3d(nodes, links) {
      return this._graphLayout === "flow" ? null : this._layoutTargets(nodes, links);
    }

    _waitingForRadialCenter() {
      return this._graphLayout === "radial" && !this._renderedNodeIds?.has(this._radialCenter);
    }

    _relayoutForSelection(nodeId) {
      if (this._graphLayout !== "radial" || nodeId === this._radialCenter || this._viewMode !== "graph") {
        return;
      }

      this._radialCenter = nodeId;
      this._resetViewport();
      this._renderGraph();
    }

    /**
     * A structured layout knows where every node will end up, so the view
     * fits its frames at once instead of waiting for the animation to settle.
     */
    _fitToLayout({ svg, g, zoom, size }, layout) {
      if (!layout?.groups.length || this._fitDone) {
        return;
      }

      this._fitDone = true;
      this._fitGraphToView(svg, g.select(".layout-groups"), zoom, size.width, size.height, GRAPH.animMs.fit);
    }

    /** Around selected: nodes off the rings fade, so the selected node's dependency tree stands out. */
    _fadeOutsideLayout({ link, node }, layout) {
      const related = layout?.related;

      if (!related) {
        return;
      }

      node.classed("layout-outside", d => !related.has(d.node_id));
      link.classed("layout-outside", d => !related.has(endId(d.source)) || !related.has(endId(d.target)));
    }

    _collapseOptions() {
      if (!this._collapseEntities) {
        return null;
      }

      const radialCenter = this._graphLayout === "radial" ? this._radialCenter : null;
      const keep = [this._selectedNode, this._focusNode, radialCenter, ...(this._pathNodes || [])];

      return { expanded: this._expandedDevices, keep: new Set(keep.filter(Boolean)) };
    }

    _toggleDeviceExpansion(deviceId) {
      if (this._expandedDevices.has(deviceId)) {
        this._expandedDevices.delete(deviceId);
      } else {
        this._expandedDevices.add(deviceId);
      }

      this._renderGraph();
      this._renderDetailPanel();
    }

    _drawLayoutGroups(g, layout) {
      const layer = g.append("g").attr("class", "layout-groups");
      const groups = layout?.groups || [];

      this._drawLayoutFrames(layer, groups.filter(group => group.kind !== "ring"));
      this._drawLayoutRings(layer, groups.filter(group => group.kind === "ring"));
    }

    _drawLayoutFrames(layer, frames) {
      const frame = layer.selectAll("g.layout-frame-group")
        .data(frames)
        .join("g")
        .attr("class", d => `layout-frame-group layout-${d.kind}`);

      frame.append("rect")
        .attr("class", "layout-frame")
        .attr("x", d => d.x).attr("y", d => d.y)
        .attr("width", d => d.width).attr("height", d => d.height)
        .attr("rx", FRAME_RADIUS);
      frame.append("text")
        .attr("class", "layout-label")
        .attr("x", d => d.x + LABEL_INSET.x).attr("y", d => d.y + LABEL_INSET.y)
        .attr("dominant-baseline", "hanging")
        .text(d => this._layoutGroupLabel(d));
    }

    _drawLayoutRings(layer, rings) {
      layer.selectAll("circle.layout-ring")
        .data(rings)
        .join("circle")
        .attr("class", "layout-ring")
        .attr("r", d => d.radius);
      layer.selectAll("text.layout-ring-label")
        .data(rings)
        .join("text")
        .attr("class", "layout-ring-label")
        .attr("text-anchor", "middle")
        .attr("y", d => -d.radius - 6)
        .text(d => this._tText("radial_hop", { count: d.hop }));
      this._drawRadialSides(layer, Math.max(0, ...rings.map(ring => ring.radius)));
    }

    _drawRadialSides(layer, radius) {
      if (!radius) {
        return;
      }

      const sides = [
        { x: radius * 0.55, anchor: "start", key: "radial_dependencies" },
        { x: -radius * 0.55, anchor: "end", key: "radial_dependents" },
      ];

      layer.selectAll("text.layout-side-label")
        .data(sides)
        .join("text")
        .attr("class", "layout-side-label")
        .attr("x", d => d.x).attr("y", -radius - SIDE_LABEL_OFFSET)
        .attr("text-anchor", d => d.anchor)
        .text(d => this._tText(d.key));
    }

    _layoutGroupLabel(group) {
      const labels = {
        room: () => this._roomLabel(group.key),
        column: () => this._tText(`flow_${group.key}`),
        unrelated: () => this._tText("radial_unrelated"),
      };

      return labels[group.kind]?.() ?? "";
    }

    _roomLabel(key) {
      if (key === UNASSIGNED_ROOM) {
        return this._tText("room_unassigned");
      }

      if (key === SHARED_ROOM) {
        return this._tText("room_shared");
      }

      return this._areaNames.get(key) || key;
    }
  };
