import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  convexHull,
  hullPath,
  nodeExtent,
  trimmedLinkPath,
} from "../../custom_components/entitymap/frontend/graph/graph-geometry.js";

const numbers = (path) => path.match(/-?\d+(\.\d+)?(e[-+]?\d+)?/g).map(Number);

describe("nodeExtent", () => {
  describe("GIVEN a circle, a square and a diamond of radius 10", () => {
    const radius = 10;

    describe("WHEN their extents are measured", () => {
      let circle;
      let rect;
      let diamond;

      before(() => {
        circle = nodeExtent("circle", radius);
        rect = nodeExtent("rect", radius);
        diamond = nodeExtent("diamond", radius);
      });

      it("THEN the circle stays within its radius", () => {
        assert.equal(circle, 10);
      });

      it("THEN the square reaches past its radius", () => {
        assert.equal(rect, 12);
      });

      it("THEN the diamond reaches past its radius", () => {
        assert.equal(diamond, 12);
      });
    });
  });
});

describe("trimmedLinkPath", () => {
  describe("GIVEN two nodes 100 apart with gaps of 10 and 15", () => {
    const source = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };
    const options = { startGap: 10, endGap: 15 };

    describe("WHEN the edge path is built", () => {
      let path;

      before(() => {
        path = trimmedLinkPath(source, target, options);
      });

      it("THEN the straight edge starts and ends at the node outlines", () => {
        assert.equal(path, "M10,0L85,0");
      });
    });
  });

  describe("GIVEN two nodes closer than their combined gaps", () => {
    const source = { x: 0, y: 0 };
    const target = { x: 10, y: 0 };
    const options = { startGap: 6, endGap: 6 };

    describe("WHEN the edge path is built", () => {
      let path;

      before(() => {
        path = trimmedLinkPath(source, target, options);
      });

      it("THEN nothing is drawn because the path is empty", () => {
        assert.equal(path, "");
      });
    });
  });

  describe("GIVEN a curved edge between two nodes 100 apart", () => {
    const source = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };
    const options = { curve: 1, offset: 20, startGap: 10, endGap: 10 };

    describe("WHEN the edge path is built", () => {
      let path;
      let start;
      let control;
      let end;

      before(() => {
        path = trimmedLinkPath(source, target, options);
        const [x1, y1, cx, cy, x2, y2] = numbers(path);

        start = { x: x1, y: y1 };
        control = [cx, cy];
        end = { x: x2, y: y2 };
      });

      it("THEN it is a quadratic curve", () => {
        assert.match(path, /^M.*Q/);
      });

      it("THEN the parallel edge bows out to its control point", () => {
        assert.deepEqual(control, [50, 20]);
      });

      it("THEN its start sits one gap away from the source node along the end tangent", () => {
        assert.ok(Math.abs(Math.hypot(start.x, start.y) - 10) < 1e-9);
      });

      it("THEN its end sits one gap away from the target node along the end tangent", () => {
        assert.ok(Math.abs(Math.hypot(end.x - 100, end.y) - 10) < 1e-9);
      });
    });
  });
});

describe("convexHull", () => {
  describe("GIVEN the corners of a square and its center", () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }];

    describe("WHEN the convex hull is computed", () => {
      let hull;

      before(() => {
        hull = convexHull(points);
      });

      it("THEN only the four corners remain", () => {
        assert.equal(hull.length, 4);
      });

      it("THEN the interior point is dropped", () => {
        assert.ok(!hull.some((p) => p.x === 5 && p.y === 5));
      });
    });
  });
});

describe("hullPath", () => {
  describe("GIVEN a single member at the origin with a padding of 10", () => {
    const members = [{ x: 0, y: 0 }];
    const padding = 10;

    describe("WHEN the hull path is built", () => {
      let xs;

      before(() => {
        xs = numbers(hullPath(members, padding)).filter((_, i) => i % 2 === 0);
      });

      it("THEN the outline spans the padding on the right", () => {
        assert.equal(Math.round(Math.max(...xs)), 10);
      });

      it("THEN the outline spans the padding on the left", () => {
        assert.equal(Math.round(Math.min(...xs)), -10);
      });
    });
  });

  describe("GIVEN a member without a position", () => {
    const members = [{ x: undefined, y: undefined }];

    describe("WHEN the hull path is built", () => {
      let path;

      before(() => {
        path = hullPath(members, 10);
      });

      it("THEN the path is empty", () => {
        assert.equal(path, "");
      });
    });
  });
});
