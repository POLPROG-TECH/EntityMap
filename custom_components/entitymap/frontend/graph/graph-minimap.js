const SIZE = { width: 160, height: 110, padding: 6 };

export class Minimap {
  constructor(element, { width, height, colorOf }) {
    const svg = window.d3.select(element).attr("viewBox", `0 0 ${SIZE.width} ${SIZE.height}`);

    element.toggleAttribute("hidden", false);
    svg.selectAll("*").remove();
    this.view = { width, height };
    this.colorOf = colorOf;
    this.dots = svg.append("g");
    this.frame = svg.append("rect").attr("class", "minimap-viewport");
    this.bounds = { scale: 1, minX: 0, minY: 0 };
  }

  update(nodes, transform) {
    this.bounds = fitBounds(nodes);
    this.dots.selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 1.6)
      .attr("cx", d => this._x(d.x))
      .attr("cy", d => this._y(d.y))
      .attr("fill", d => this.colorOf(d.node_type));
    this.showViewport(transform);
  }

  showViewport(transform) {
    const k = transform.k || 1;
    const { scale } = this.bounds;

    this.frame
      .attr("x", this._x(-transform.x / k))
      .attr("y", this._y(-transform.y / k))
      .attr("width", Math.max(0, (this.view.width / k) * scale))
      .attr("height", Math.max(0, (this.view.height / k) * scale));
  }

  _x(value) {
    return SIZE.padding + (value - this.bounds.minX) * this.bounds.scale;
  }

  _y(value) {
    return SIZE.padding + (value - this.bounds.minY) * this.bounds.scale;
  }
}

function fitBounds(nodes) {
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1;
  const spanY = Math.max(...ys) - minY || 1;
  const scale = Math.min((SIZE.width - 2 * SIZE.padding) / spanX, (SIZE.height - 2 * SIZE.padding) / spanY);

  return { scale, minX, minY };
}
