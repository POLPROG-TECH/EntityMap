import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildPickGrid,
  createCamera,
  easeInOutCubic,
  lerpCamera,
  pickFromGrid,
  shortestAngle,
} from "../../custom_components/entitymap/frontend/graph/scene3d/scene3d-math.js";
import { fogAlpha, mixHex } from "../../custom_components/entitymap/frontend/graph/scene3d/scene3d-style.js";
import { placeLabels } from "../../custom_components/entitymap/frontend/graph/scene3d/scene3d-labels.js";
import { navigateNodes } from "../../custom_components/entitymap/frontend/graph/scene3d/scene3d-nav.js";
import { buildAdjacency, hoverHighlight, projectScene } from "../../custom_components/entitymap/frontend/graph/scene3d/scene3d-frame.js";
import {
  buildViewLink,
  formatCameraParam,
  parseCameraParam,
  readLinkedView,
} from "../../custom_components/entitymap/frontend/graph/graph-3d-link.js";

describe("camera motion", () => {
  describe("GIVEN the start, middle and end of an animation", () => {
    const progress = [0, 0.5, 1];

    describe("WHEN each point is eased", () => {
      let eased;

      before(() => {
        eased = progress.map((t) => easeInOutCubic(t));
      });

      it("THEN the endpoints and the midpoint are unchanged", () => {
        assert.deepEqual(eased, [0, 0.5, 1]);
      });
    });
  });

  describe("GIVEN a target angle just short of a full turn", () => {
    const target = 2 * Math.PI - 0.1;

    describe("WHEN the shortest turn from zero is computed", () => {
      let result;

      before(() => {
        result = shortestAngle(0, target);
      });

      it("THEN it turns slightly backwards instead of almost all the way round", () => {
        assert.ok(Math.abs(result - -0.1) < 1e-9);
      });
    });
  });

  describe("GIVEN two cameras differing in angle, distance and target", () => {
    const from = createCamera({ yaw: 0, pitch: 0.2, distance: 1000 });
    const to = createCamera({ yaw: 1, pitch: 0.6, distance: 500, target: { x: 100, y: 0, z: 0 } });

    describe("WHEN the camera is interpolated halfway", () => {
      let half;

      before(() => {
        half = lerpCamera(from, to, 0.5);
      });

      it("THEN angle, distance and target all lie halfway between the two", () => {
        assert.deepEqual([half.yaw, half.pitch, half.distance, half.target.x], [0.5, 0.4, 750, 50]);
      });
    });
  });
});

describe("colors and fog", () => {
  describe("GIVEN black and white hex colors, and an rgb color", () => {
    const rgb = "rgb(1, 2, 3)";

    describe("WHEN each is mixed halfway with white", () => {
      let gray;
      let untouched;

      before(() => {
        gray = mixHex("#000000", "#ffffff", 0.5);
        untouched = mixHex(rgb, "#ffffff", 0.5);
      });

      it("THEN the hex colors blend to gray", () => {
        assert.equal(gray, "#808080");
      });

      it("THEN the rgb color is returned as is", () => {
        assert.equal(untouched, "rgb(1, 2, 3)");
      });
    });
  });

  describe("GIVEN a depth range from 100 to 300 with a 0.5 minimum alpha", () => {
    const [near, far, minAlpha] = [100, 300, 0.5];

    describe("WHEN the fog alpha is computed at both ends and for a zero-width range", () => {
      let atNearest;
      let atFarthest;
      let flatRange;

      before(() => {
        atNearest = fogAlpha(100, near, far, minAlpha);
        atFarthest = fogAlpha(300, near, far, minAlpha);
        flatRange = fogAlpha(5, 5, 5, minAlpha);
      });

      it("THEN the nearest depth is fully opaque", () => {
        assert.equal(atNearest, 1);
      });

      it("THEN the farthest depth is at the minimum alpha", () => {
        assert.equal(atFarthest, 0.5);
      });

      it("THEN a flat range stays opaque", () => {
        assert.equal(flatRange, 1);
      });
    });
  });
});

describe("placeLabels", () => {
  const label = (id, x, priority) => ({ id, x, y: 100, radius: 10, width: 60, height: 14, priority });

  describe("GIVEN two overlapping labels with different priorities", () => {
    const labels = [label("low", 100, 0), label("high", 105, 3)];

    describe("WHEN the labels are placed", () => {
      let placed;

      before(() => {
        placed = placeLabels(labels);
      });

      it("THEN the higher priority label is placed first", () => {
        assert.deepEqual(placed.map((p) => p.id), ["high", "low"]);
      });

      it("THEN the higher priority label sits in place without a leader line", () => {
        assert.equal(placed[0].leader, false);
      });

      it("THEN the clashing label is moved aside with a leader line", () => {
        assert.equal(placed[1].leader, true);
      });
    });
  });

  describe("GIVEN five labels on the same spot", () => {
    const crowd = [label("a", 100, 3), label("b", 100, 3), label("c", 100, 3), label("d", 100, 3), label("e", 100, 3)];

    describe("WHEN the labels are placed", () => {
      let placed;

      before(() => {
        placed = placeLabels(crowd);
      });

      it("THEN only four fit and the label that fits nowhere is dropped", () => {
        assert.equal(placed.length, 4);
      });
    });
  });
});

describe("navigateNodes", () => {
  const nodes = [
    { id: "a1", floor: 0, x: 10 }, { id: "a2", floor: 0, x: 200 },
    { id: "e1", floor: 2, x: 50 }, { id: "e2", floor: 2, x: 190 },
    { id: "au", floor: 4, x: 120 },
  ];

  describe("GIVEN no focused node", () => {
    const focused = null;

    describe("WHEN the right arrow is pressed", () => {
      let result;

      before(() => {
        result = navigateNodes(nodes, focused, "ArrowRight");
      });

      it("THEN focus starts at the top floor", () => {
        assert.equal(result, "au");
      });
    });
  });

  describe("GIVEN a floor with e1 on the left and e2 on the right", () => {
    const [left, right] = ["e1", "e2"];

    describe("WHEN stepping right from each end and pressing Home on the right end", () => {
      let fromLeft;
      let fromRight;
      let home;

      before(() => {
        fromLeft = navigateNodes(nodes, left, "ArrowRight");
        fromRight = navigateNodes(nodes, right, "ArrowRight");
        home = navigateNodes(nodes, right, "Home");
      });

      it("THEN focus moves right from the left end", () => {
        assert.equal(fromLeft, "e2");
      });

      it("THEN focus stays at the right end", () => {
        assert.equal(fromRight, "e2");
      });

      it("THEN Home returns to the left end", () => {
        assert.equal(home, "e1");
      });
    });
  });

  describe("GIVEN floors with an empty floor between each populated one", () => {
    const [entityRight, entityLeft, top] = ["e2", "e1", "au"];

    describe("WHEN moving down from e2, up from e1 and up from the top floor", () => {
      let down;
      let up;
      let aboveTop;

      before(() => {
        down = navigateNodes(nodes, entityRight, "ArrowDown");
        up = navigateNodes(nodes, entityLeft, "ArrowUp");
        aboveTop = navigateNodes(nodes, top, "ArrowUp");
      });

      it("THEN moving down jumps to the nearest node on the next populated floor", () => {
        assert.equal(down, "a2");
      });

      it("THEN moving up jumps to the nearest node on the next populated floor", () => {
        assert.equal(up, "au");
      });

      it("THEN focus stays put on the top floor", () => {
        assert.equal(aboveTop, "au");
      });
    });
  });
});

describe("per-frame preparation", () => {
  const camera = createCamera({ yaw: 0, pitch: 0, distance: 1000 });
  const viewport = { width: 800, height: 600 };
  const nodes = [
    { id: "near", r: 10, world: { x: 0, y: 0, z: -300 } },
    { id: "far", r: 10, world: { x: 0, y: 0, z: 300 } },
  ];

  describe("GIVEN a near and a far node in front of a flat camera", () => {
    const scene = nodes;

    describe("WHEN the frame is projected", () => {
      let frame;
      let near;

      before(() => {
        frame = projectScene(scene, camera, viewport);
        near = frame.projected.get("near");
      });

      it("THEN nodes paint far to near", () => {
        assert.deepEqual(frame.ordered.map((p) => p.id), ["far", "near"]);
      });

      it("THEN the far node is foggier", () => {
        assert.ok(frame.projected.get("far").fog < near.fog);
      });

      it("THEN the near node is pickable", () => {
        assert.equal(pickFromGrid(frame.pickGrid, 48, near.x, near.y), "near");
      });
    });
  });

  describe("GIVEN a node just inside one cell of a 48 pixel grid", () => {
    const grid = buildPickGrid([{ id: "n", x: 47, y: 47, radius: 6, depth: 1 }], 48);

    describe("WHEN picking just across the cell border", () => {
      let result;

      before(() => {
        result = pickFromGrid(grid, 48, 50, 50);
      });

      it("THEN the node is still found through the pick grid", () => {
        assert.equal(result, "n");
      });
    });
  });

  describe("GIVEN two separate links and a selection on c", () => {
    const links = [{ key: "a|b", sourceId: "a", targetId: "b" }, { key: "c|d", sourceId: "c", targetId: "d" }];
    const selection = { primary: "c", nodes: new Set(["c"]) };

    describe("WHEN a is hovered, and when nothing is hovered", () => {
      let result;
      let cleared;

      before(() => {
        result = hoverHighlight("a", buildAdjacency(links), links, selection);
        cleared = hoverHighlight(null, new Map(), links, null);
      });

      it("THEN a and its neighbor light up", () => {
        assert.deepEqual([...result.nodes].sort(), ["a", "b"]);
      });

      it("THEN only the link between them lights up", () => {
        assert.deepEqual([...result.edges], ["a|b"]);
      });

      it("THEN the selection mark stays primary", () => {
        assert.equal(result.primary, "c");
      });

      it("THEN no hover means no highlight", () => {
        assert.equal(cleared, null);
      });
    });
  });
});

describe("view links", () => {
  describe("GIVEN a camera with more precision than the link keeps", () => {
    const camera = { yaw: -0.6123, pitch: 0.5, distance: 987.4 };

    describe("WHEN a view link is built, read back and the camera is formatted", () => {
      let link;
      let linked;
      let formatted;

      before(() => {
        link = buildViewLink({ origin: "http://ha.local:8123", pathname: "/entitymap/graph" }, camera);
        linked = readLinkedView(new URL(link).search);
        formatted = formatCameraParam(camera);
      });

      it("THEN the link carries a rounded camera and the 3D dimension", () => {
        assert.equal(link, "http://ha.local:8123/entitymap/graph?dim=3d&cam=-0.612%2C0.500%2C987");
      });

      it("THEN the link reads back as the 3D view with the rounded camera", () => {
        assert.deepEqual(linked, { dimension: "3d", camera: { yaw: -0.612, pitch: 0.5, distance: 987 } });
      });

      it("THEN the formatted camera parameter is rounded", () => {
        assert.equal(formatted, "-0.612,0.500,987");
      });
    });
  });

  describe("GIVEN too few values, non-numeric values, a negative distance and a 2D-only query", () => {
    const [tooFew, nonNumeric, negative] = ["1,2", "a,b,c", "0,0,-5"];
    const flatQuery = "?dim=2d";

    describe("WHEN each is parsed", () => {
      let results;
      let flatView;

      before(() => {
        results = [parseCameraParam(tooFew), parseCameraParam(nonNumeric), parseCameraParam(negative)];
        flatView = readLinkedView(flatQuery);
      });

      it("THEN too few values give no camera", () => {
        assert.equal(results[0], null);
      });

      it("THEN non-numeric values give no camera", () => {
        assert.equal(results[1], null);
      });

      it("THEN a negative distance gives no camera", () => {
        assert.equal(results[2], null);
      });

      it("THEN the 2D-only query reads no camera or 3D view", () => {
        assert.deepEqual(flatView, { dimension: null, camera: null });
      });
    });
  });
});
