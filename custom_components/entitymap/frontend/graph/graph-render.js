import {
  CONFIDENCE_STROKE,
  EDGE_FAMILIES,
  EDGE_FAMILY_COLORS,
  GRAPH,
  NODE_CONFIG,
} from "../shared/constants.js";
import { edgeFamily, nodeMatchesQuery } from "../shared/graph-model.js";
import { trimmedLinkPath } from "./graph-geometry.js";
import { GLYPH_GRID, NODE_GLYPHS, glyphColor } from "./node-glyphs.js";
import { appendNodeShape } from "../shared/svg-shapes.js";

const ARROW_PATH = "M0,-5L10,0L0,5";

export const GraphRenderView = (Base) =>
  class extends Base {
    /**
     * One marker per edge family plus one for a highlighted path, so an
     * arrowhead always matches its line. userSpaceOnUse keeps arrows the same
     * size whatever the stroke width; refX 10 puts the tip on the path end.
     */
    _appendArrowMarkers(svg) {
      const markers = [
        ...EDGE_FAMILIES.map(family => ({ id: `arrow-${family}`, color: EDGE_FAMILY_COLORS[family] })),
        { id: "arrow-path", color: "var(--em-path, #E91E63)" },
      ];

      svg.append("defs").selectAll("marker")
        .data(markers)
        .join("marker")
        .attr("id", d => d.id)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", ARROW_PATH)
        .attr("fill", d => d.color);
    }

    /**
     * A reused layout skips the centering force: removing nodes moves the
     * centroid, and re-centering would slide the whole graph under the user.
     * The weak x/y gravity keeps isolated nodes from drifting to the edges,
     * where they would force the fitted view to zoom far out.
     */
    _createSimulation(simNodes, simLinks, width, height, reuseLayout) {
      const d3 = window.d3;
      const force = this._density === "compact" ? GRAPH.force.compact : GRAPH.force.comfortable;
      const gravity = (d) => d._degree ? GRAPH.gravity.connected : GRAPH.gravity.isolated;
      const simulation = d3.forceSimulation(simNodes)
        .force("link", d3.forceLink(simLinks).id(d => d.id).distance(force.distance))
        .force("charge", d3.forceManyBody().strength(force.charge))
        .force("collision", d3.forceCollide().radius(d => Math.max(force.collide, d._extent + 6, d._labelHalf)))
        .force("x", d3.forceX(width / 2).strength(gravity))
        .force("y", d3.forceY(height / 2).strength(gravity));

      if (reuseLayout) {
        return simulation.alpha(GRAPH.reheatAlpha);
      }

      return simulation.force("center", d3.forceCenter(width / 2, height / 2));
    }

    /**
     * Structured layouts pull every node to its computed spot, so nodes glide
     * from where they were. The zero-strength link force only resolves edge
     * endpoints to node objects for drawing.
     */
    _createTargetSimulation(simNodes, simLinks, positions) {
      const d3 = window.d3;
      const target = (d) => positions.get(d.node_id) || { x: 0, y: 0 };

      simNodes.filter(node => !Number.isFinite(node.x)).forEach(node => Object.assign(node, target(node)));

      return d3.forceSimulation(simNodes)
        .force("link", d3.forceLink(simLinks).id(d => d.id).strength(0))
        .force("x", d3.forceX(d => target(d).x).strength(GRAPH.layoutPull))
        .force("y", d3.forceY(d => target(d).y).strength(GRAPH.layoutPull))
        .alphaDecay(GRAPH.layoutAlphaDecay);
    }

    _drawLinks(g, simLinks) {
      const link = g.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(simLinks)
        .join("path")
        .attr("fill", "none")
        .attr("stroke", d => EDGE_FAMILY_COLORS[edgeFamily(d.dependency_kind)])
        .attr("stroke-width", d => this._confidenceStroke(d).width)
        .attr("stroke-dasharray", d => this._confidenceStroke(d).dash)
        .attr("marker-end", d => `url(#arrow-${edgeFamily(d.dependency_kind)})`)
        .attr("opacity", GRAPH.edgeOpacity);

      link.append("title").text(d => this._edgeTitle(d));

      return link;
    }

    _confidenceStroke(d) {
      return CONFIDENCE_STROKE[d.confidence] || CONFIDENCE_STROKE.high;
    }

    _edgeTitle(d) {
      const family = this._tText(`edge_${edgeFamily(d.dependency_kind)}`);
      const confidence = this._tText(`confidence_${CONFIDENCE_STROKE[d.confidence] ? d.confidence : "high"}`);
      const summary = `${family} (${confidence})`;

      return d.notes ? `${summary}: ${d.notes}` : summary;
    }

    _nodeRadius(degree) {
      const { base, max, growth } = GRAPH.nodeSize;

      return Math.min(max, base + Math.sqrt(degree) * growth);
    }

    _drawNodes(g, simNodes, simulation, perf) {
      const self = this;
      const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(simNodes)
        .join("g")
        .attr("class", "node-group")
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("aria-label", d => this._nodeAriaLabel(d))
        .call(this._nodeDrag(simulation));

      node.each(function(d) {
        self._drawNodeContent(window.d3.select(this), d, perf);
      });
      this._wireNodeEvents(node);

      return node;
    }

    _drawNodeContent(el, d, perf) {
      const style = this._nodeStyle(d);

      appendNodeShape(el, d._r, style);
      this._drawNodeGlyph(el, d, style.fillColor);

      if (d.collapsed_count) {
        this._drawCollapsedBadge(el, d);
      }

      this._drawNodeLabel(el, d, perf && d._degree < GRAPH.hubDegree);

      if (style.isMissing) {
        this._drawMissingBadge(el, d._r);
      }
    }

    _nodeDrag(simulation) {
      return window.d3.drag()
        .on("start", (event, d) => this._onDragStart(event, d, simulation))
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => this._onDragEnd(event, d, simulation));
    }

    _onDragStart(event, d, simulation) {
      this._userMovedGraph = true;
      this._hideTooltip();

      if (!event.active) {
        simulation.alphaTarget(0.3).restart();
      }

      d.fx = d.x;
      d.fy = d.y;
    }

    _onDragEnd(event, d, simulation) {
      if (!event.active) {
        simulation.alphaTarget(0);
      }

      d.fx = null;
      d.fy = null;
      this._positions.set(d.node_id, { x: d.x, y: d.y });
    }

    _wireNodeEvents(node) {
      node
        .on("click", (event, d) => this._onNodeClick(event, d))
        .on("dblclick", (event, d) => {
          event.stopPropagation();
          this._enterFocus(d.node_id);
        })
        .on("keydown", (event, d) => this._onNodeKeyDown(event, d))
        .on("mouseenter focus", (event, d) => this._startHover(event.currentTarget, d))
        .on("mouseleave blur", () => this._endHover());
    }

    _onNodeClick(event, d) {
      event.stopPropagation();

      if (this._pathMode) {
        this._pickPathNode(d.node_id);

        return;
      }

      this._selectNode(d.node_id);
    }

    _onNodeKeyDown(event, d) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      this._selectNode(d.node_id);
    }

    _nodeStyle(d) {
      const cfg = NODE_CONFIG[d.node_type] || NODE_CONFIG.unknown;
      const isMissing = !d.available;
      const matches = Boolean(this._searchQuery) && nodeMatchesQuery(d, this._searchQuery);

      return {
        shape: cfg.shape,
        isMissing,
        fillColor: this._typeColor(d.node_type),
        strokeColor: matches ? GRAPH.searchStroke : (isMissing ? GRAPH.missingStroke : GRAPH.nodeOutline),
        strokeWidth: matches || isMissing ? 3 : 1.5,
        dash: isMissing && !matches ? "4,2" : null,
      };
    }

    _drawNodeGlyph(el, d, fillColor) {
      const glyph = NODE_GLYPHS[d.node_type] || NODE_GLYPHS.unknown;
      const size = d._r * GRAPH.glyphScale;

      el.append("path")
        .attr("class", "node-glyph")
        .attr("d", glyph)
        .attr("transform", `translate(${-size / 2},${-size / 2}) scale(${size / GLYPH_GRID})`)
        .attr("fill", "none")
        .attr("stroke", glyphColor(fillColor))
        .attr("stroke-width", 2.2)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("pointer-events", "none");
    }

    /**
     * Size and halo come from CSS (--em-label-size), which the zoom handler
     * keeps readable at any zoom level. "hanging" anchors the text top just
     * below the node, so a larger font never overlaps the shape.
     */
    _drawNodeLabel(el, d, minor) {
      el.append("text")
        .attr("class", minor ? "node-label minor" : "node-label")
        .attr("dy", d._extent + GRAPH.label.gap)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "hanging")
        .attr("paint-order", "stroke")
        .attr("stroke-linejoin", "round")
        .text(
          d.title.length > GRAPH.labelMaxChars
            ? d.title.substring(0, GRAPH.labelTruncateTo) + "…"
            : d.title
        );
    }

    _nodeAriaLabel(d) {
      const label = `${this._typeLabel(d.node_type)}: ${d.title}`;

      return d.collapsed_count ? `${label}, ${this._tText("tooltip_collapsed", { count: d.collapsed_count })}` : label;
    }

    /**
     * A pill under the device: how many entities are folded into it. Clicking
     * it unfolds them without selecting the device.
     */
    _drawCollapsedBadge(el, d) {
      const text = `+${d.collapsed_count}`;
      const width = 12 + text.length * 6;
      const badge = el.append("g")
        .attr("class", "collapsed-badge")
        .attr("transform", `translate(${d._r * 0.7},${d._r * 0.7})`)
        .on("click", (event) => {
          event.stopPropagation();
          this._toggleDeviceExpansion(d.node_id);
        });

      badge.append("rect").attr("x", -width / 2).attr("y", -8).attr("width", width).attr("height", 16).attr("rx", 8);
      badge.append("text").attr("text-anchor", "middle").attr("dominant-baseline", "central").text(text);
    }

    _drawMissingBadge(el, r) {
      const cx = r * 0.8;
      const cy = -r * 0.8;

      el.append("circle")
        .attr("class", "missing-badge")
        .attr("cx", cx).attr("cy", cy).attr("r", 7);
      el.append("text")
        .attr("class", "missing-badge-mark")
        .attr("x", cx).attr("y", cy)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .text("!");
    }

    _linkPath(d) {
      return trimmedLinkPath(d.source, d.target, {
        curve: d._curve,
        offset: GRAPH.parallelEdgeOffset,
        startGap: d.source._extent || 0,
        endGap: (d.target._extent || 0) + GRAPH.arrowGap,
      });
    }
  };
