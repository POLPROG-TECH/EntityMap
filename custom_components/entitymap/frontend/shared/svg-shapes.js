/**
 * `el` is a D3 selection of the node's <g>; the shape is centered on it.
 * `style`: { shape, fillColor, strokeColor, strokeWidth, dash }.
 */
export function appendNodeShape(el, r, style) {
  return appendShapeElement(el, style.shape, r)
    .attr("class", "node-shape")
    .attr("fill", style.fillColor)
    .attr("stroke", style.strokeColor)
    .attr("stroke-width", style.strokeWidth)
    .attr("stroke-dasharray", style.dash);
}

function appendShapeElement(el, shape, r) {
  if (shape === "rect") {
    return el.append("rect")
      .attr("width", r * 2).attr("height", r * 2)
      .attr("x", -r).attr("y", -r)
      .attr("rx", 4);
  }

  if (shape === "diamond") {
    const p = r + 2;

    return el.append("polygon").attr("points", `0,${-p} ${p},0 0,${p} ${-p},0`);
  }

  return el.append("circle").attr("r", r);
}
