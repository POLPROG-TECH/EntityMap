import { NODE_CONFIG } from "../shared/constants.js";
import { appendNodeShape } from "../shared/svg-shapes.js";

const TREE = {
  nodeSpacing: 28,
  minWidth: 600,
  minHeight: 400,
  margin: { left: 40, top: 40, right: 200 },
  zoomExtent: [0.05, 3],
  fitMaxScale: 1.2,
  readableScale: 0.6,
  levelGap: 140,
  labelCharWidth: 7,
  rootInset: 90,
  neutralColor: "#78909C",
};

export const HierarchyTreeView = (Base) =>
  class extends Base {
    _renderHierarchyTree(content, h) {
      if (!window.d3) {
        content.innerHTML = `<div class="empty-state">${this._t("tree_loading")}</div>`;
        this._loadD3().then(() => this._renderHierarchyTree(content, h));

        return;
      }

      const treeData = buildTreeData(h, { home: this._tText("home"), unassigned: this._tText("unassigned") });

      if (treeData.children.length === 0) {
        content.innerHTML = `<div class="empty-state">${this._t("no_hierarchy")}</div>`;

        return;
      }

      this._drawTree(content, window.d3.hierarchy(treeData), this._treeOrientation === "vertical");
    }

    _drawTree(content, root, isVertical) {
      const dims = this._treeDimensions(root, isVertical, content);

      this._layoutTree(root, isVertical, dims);

      const { svg, g, zoom } = this._createTreeSvg(content);
      const linkGen = this._treeLinkGenerator(isVertical);

      this._drawTreeLinks(g, root, linkGen);
      this._drawTreeFlowLayer(g, linkGen);
      this._drawTreeNodes(svg, g, root, isVertical);
      this._fitTree(svg, g, zoom, root, isVertical);
      this._playTreeIntro(svg);
    }

    _treeDimensions(root, isVertical, content) {
      const baseWidth = content.parentElement.getBoundingClientRect().width || 900;
      const leaves = root.leaves().length;
      const margin = TREE.margin;

      if (isVertical) {
        return {
          width: Math.max(TREE.minWidth, leaves * TREE.nodeSpacing + 120),
          height: Math.max(TREE.minHeight, (root.height + 1) * 120 + 80),
          margin,
        };
      }

      return {
        width: baseWidth,
        height: Math.max(TREE.minHeight, leaves * TREE.nodeSpacing + 80),
        margin,
      };
    }

    /**
     * Vertical trees use a fixed spacing that widens between siblings whose
     * horizontal labels would collide; fitting them into a set width would
     * squeeze the labels together instead.
     */
    _layoutTree(root, isVertical, dims) {
      const d3 = window.d3;
      const innerWidth = dims.width - dims.margin.left - dims.margin.right;
      const layout = isVertical
        ? d3.tree().nodeSize([TREE.nodeSpacing, TREE.levelGap]).separation(verticalSeparation)
        : d3.tree().size([dims.height - 80, innerWidth]);

      layout(root);
    }

    _createTreeSvg(content) {
      const d3 = window.d3;
      content.innerHTML = "";
      content.classList.add("tree-mode");

      const svg = d3.select(content).append("svg").attr("class", "hierarchy-svg");
      const g = svg.append("g");
      const zoom = d3.zoom()
        .scaleExtent(TREE.zoomExtent)
        .on("zoom", (event) => g.attr("transform", event.transform));

      svg.call(zoom);

      return { svg, g, zoom };
    }

    _treeLinkGenerator(isVertical) {
      const d3 = window.d3;

      return isVertical
        ? d3.linkVertical().x(d => d.x).y(d => d.y)
        : d3.linkHorizontal().x(d => d.y).y(d => d.x);
    }

    /** pathLength 1 lets the intro grow every link with the same dash values. */
    _drawTreeLinks(g, root, linkGen) {
      g.selectAll(".tree-link")
        .data(root.links())
        .join("path")
        .attr("class", "tree-link")
        .attr("pathLength", 1)
        .style("--depth", d => d.source.depth)
        .attr("d", linkGen);
    }

    _drawTreeNodes(svg, g, root, isVertical) {
      const node = g.selectAll(".tree-node")
        .data(root.descendants())
        .join("g")
        .attr("class", "tree-node")
        .style("--depth", d => d.depth)
        .attr("transform", d => isVertical ? `translate(${d.x},${d.y})` : `translate(${d.y},${d.x})`);

      this._drawTreeNodeShapes(node);
      this._drawTreeNodeLabels(node, isVertical);
      this._wireTreeNodeEvents(svg, node);
    }

    _drawTreeNodeShapes(node) {
      const d3 = window.d3;
      node.each(function(d) {
        const color = d.data._color || TREE.neutralColor;
        appendNodeShape(d3.select(this), d.children ? 6 : 5, {
          shape: d.data._shape || "circle",
          fillColor: color,
          strokeColor: d3.color(color).darker(0.5),
          strokeWidth: 1.5,
          dash: null,
        });
      });
    }

    _drawTreeNodeLabels(node, isVertical) {
      node.append("text")
        .each(function(d) {
          const place = labelPlacement(d, isVertical);

          window.d3.select(this).attr("x", place.x).attr("dy", place.dy).attr("text-anchor", place.anchor).attr("transform", place.rotate);
        })
        .attr("class", d => d.children ? "tree-label branch-label" : "tree-label")
        .text(d => {
          const maxLen = d.children ? 30 : 35;

          return d.data.name.length > maxLen ? d.data.name.substring(0, maxLen - 1) + "…" : d.data.name;
        });
    }

    _wireTreeNodeEvents(svg, node) {
      node
        .on("mouseenter focus", (event, d) => this._showTreeBranch(svg, d))
        .on("mouseleave blur", () => this._clearTreeBranch(svg));
      node.filter(d => d.data._nodeId)
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("aria-label", d => `${this._typeLabel(d.data._type)}: ${d.data.name}`)
        .on("click", (event, d) => {
          event.stopPropagation();
          this._openNodeInGraph(d.data._nodeId);
        })
        .on("keydown", (event, d) => this._onTreeNodeKey(event, d));
    }

    _onTreeNodeKey(event, d) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      this._openNodeInGraph(d.data._nodeId);
    }

    /**
     * A tree that fits at a readable size is shown whole. A large one opens at
     * normal size on the root instead, since fitting it would shrink the text
     * past reading; drag and zoom reach the rest.
     */
    _fitTree(svg, g, zoom, root, isVertical) {
      const view = svg.node().getBoundingClientRect();
      const size = { width: view.width || 900, height: view.height || 600 };
      const bounds = g.node().getBBox();
      const fit = Math.min(size.width / (bounds.width + 60), size.height / (bounds.height + 60), TREE.fitMaxScale);
      const transform = fit >= TREE.readableScale
        ? centeredTransform(bounds, size, fit)
        : rootTransform(root, size, isVertical);

      svg.call(zoom.transform, transform);
    }
  };

/**
 * Leaves of a vertical tree sit one node spacing apart, too close for
 * horizontal text, so their labels run downward instead.
 */
function labelPlacement(d, isVertical) {
  if (!isVertical) {
    return d.children
      ? { x: -12, dy: -12, anchor: "end", rotate: null }
      : { x: 12, dy: "0.35em", anchor: "start", rotate: null };
  }

  return d.children
    ? { x: 0, dy: -14, anchor: "middle", rotate: null }
    : { x: 12, dy: "0.35em", anchor: "start", rotate: "rotate(90)" };
}

/** Leaf labels run downward and take no width; branch labels are horizontal. */
function labelWidth(d) {
  return d.children ? d.data.name.length * TREE.labelCharWidth + 16 : 0;
}

function verticalSeparation(a, b) {
  const base = a.parent === b.parent ? 1 : 1.5;

  return Math.max(base, (labelWidth(a) + labelWidth(b)) / 2 / TREE.nodeSpacing);
}

function centeredTransform(bounds, size, scale) {
  const tx = size.width / 2 - (bounds.x + bounds.width / 2) * scale;
  const ty = size.height / 2 - (bounds.y + bounds.height / 2) * scale;

  return window.d3.zoomIdentity.translate(tx, ty).scale(scale);
}

/** Horizontal trees grow right from the root, vertical ones down, so the root sits at that edge, centered across. */
function rootTransform(root, size, isVertical) {
  const d3 = window.d3;

  if (isVertical) {
    return d3.zoomIdentity.translate(size.width / 2 - root.x, TREE.rootInset - root.y);
  }

  return d3.zoomIdentity.translate(TREE.rootInset - root.y, size.height / 2 - root.x);
}

export function buildTreeData(h, labels) {
  const root = { name: labels.home, _shape: "rect", _color: TREE.neutralColor, _type: "root", children: [] };

  for (const area of h.areas) {
    const areaNode = _areaNode(area);

    if (areaNode.children.length > 0) {
      root.children.push(areaNode);
    }
  }

  if (h.unassigned_devices.length > 0 || h.unassigned_entities.length > 0) {
    root.children.push(_unassignedNode(h, labels.unassigned));
  }

  return root;
}

function _leafNode(item) {
  const cfg = NODE_CONFIG[item.node_type] || NODE_CONFIG.entity;

  return {
    name: item.title,
    _shape: cfg.shape,
    _color: cfg.color,
    _type: item.node_type,
    _nodeId: item.node_id,
  };
}

function _deviceNode(dev) {
  return {
    name: dev.title,
    _shape: NODE_CONFIG.device.shape,
    _color: NODE_CONFIG.device.color,
    _type: "device",
    _nodeId: dev.node_id,
    children: dev.entities.map(_leafNode),
  };
}

function _areaNode(area) {
  return {
    name: area.title,
    _shape: NODE_CONFIG.area.shape,
    _color: NODE_CONFIG.area.color,
    _type: "area",
    _nodeId: area.node_id,
    children: [...area.devices.map(_deviceNode), ...area.entities.map(_leafNode)],
  };
}

function _unassignedNode(h, name) {
  return {
    name,
    _shape: "rect",
    _color: "#9E9E9E",
    _type: "unassigned",
    children: [...h.unassigned_devices.map(_deviceNode), ...h.unassigned_entities.map(_leafNode)],
  };
}
