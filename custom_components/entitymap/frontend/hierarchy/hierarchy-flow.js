/** A tree node's branch: its ancestors up to the root and everything beneath it. */
export function branchNodes(node) {
  return new Set([...node.ancestors(), ...node.descendants()]);
}

export const HierarchyFlowView = (Base) =>
  class extends Base {
    _treeAnimationsActive() {
      return this._animationsActive();
    }

    /**
     * The intro plays once per data set and orientation, so typing in the
     * search box or switching tabs does not replay it on every redraw.
     */
    _playTreeIntro(svg) {
      if (!this._treeAnimationsActive() || this._treeIntroPlayed()) {
        return;
      }

      this._treeIntro = { data: this._hierarchy, orientation: this._treeOrientation };
      svg.classed("tree-intro", true);
    }

    _treeIntroPlayed() {
      return this._treeIntro?.data === this._hierarchy && this._treeIntro.orientation === this._treeOrientation;
    }

    _drawTreeFlowLayer(g, linkGen) {
      this._treeFlow = { layer: g.append("g").attr("class", "tree-flow"), linkGen };
    }

    _showTreeBranch(svg, node) {
      const branch = branchNodes(node);
      const links = svg.selectAll(".tree-link").filter((link) => branch.has(link.source) && branch.has(link.target));

      svg.classed("tracing", true);
      svg.selectAll(".tree-node").classed("branch", (d) => branch.has(d));
      svg.selectAll(".tree-link").classed("branch", false);
      links.classed("branch", true);
      this._drawTreeFlowPaths(this._treeAnimationsActive() ? links.data() : []);
    }

    _clearTreeBranch(svg) {
      svg.classed("tracing", false);
      svg.selectAll(".tree-link.branch, .tree-node.branch").classed("branch", false);
      this._drawTreeFlowPaths([]);
    }

    _drawTreeFlowPaths(links) {
      if (!this._treeFlow) {
        return;
      }

      this._treeFlow.layer.selectAll("path")
        .data(links)
        .join("path")
        .attr("class", "tree-flow-path")
        .attr("d", this._treeFlow.linkGen);
    }
  };
