import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CAMERA_LIMITS,
  createCamera,
  fitDistance,
  floorOf,
  orbitCamera,
  pickNode,
  projectPoint,
  sortFarToNear,
  zoomCamera,
} from "../../custom_components/entitymap/frontend/graph/scene3d/scene3d-math.js";
import { layoutScene, LAYOUT_3D } from "../../custom_components/entitymap/frontend/graph/scene3d/scene3d-layout.js";

const VIEWPORT = { width: 800, height: 600 };
const FLAT = createCamera({ yaw: 0, pitch: 0, distance: 1000 });

describe("floorOf", () => {
  describe("GIVEN every known node type from areas up to automations", () => {
    const types = ["area", "device", "entity", "helper", "scene", "script", "automation"];

    describe("WHEN each type is assigned a floor", () => {
      let floors;

      before(() => {
        floors = types.map((type) => floorOf(type));
      });

      it("THEN the floors climb from areas through devices, entities, scenes and scripts to automations", () => {
        assert.deepEqual(floors, [0, 1, 2, 2, 3, 3, 4]);
      });
    });
  });

  describe("GIVEN a node type the view does not know", () => {
    const type = "something_new";

    describe("WHEN it is assigned a floor", () => {
      let result;

      before(() => {
        result = floorOf(type);
      });

      it("THEN it shares the entity floor", () => {
        assert.equal(result, floorOf("entity"));
      });
    });
  });
});

describe("projectPoint", () => {
  describe("GIVEN the orbit target at the origin", () => {
    const origin = { x: 0, y: 0, z: 0 };

    describe("WHEN it is projected through a flat camera", () => {
      let p;

      before(() => {
        p = projectPoint(origin, FLAT, VIEWPORT);
      });

      it("THEN it lands in the center of the viewport", () => {
        assert.deepEqual([p.x, p.y], [400, 300]);
      });
    });
  });

  describe("GIVEN one point to the right and one above the origin", () => {
    const rightPoint = { x: 100, y: 0, z: 0 };
    const upPoint = { x: 0, y: 100, z: 0 };

    describe("WHEN both are projected", () => {
      let right;
      let up;

      before(() => {
        right = projectPoint(rightPoint, FLAT, VIEWPORT);
        up = projectPoint(upPoint, FLAT, VIEWPORT);
      });

      it("THEN right maps to right of center", () => {
        assert.ok(right.x > 400);
      });

      it("THEN up maps to above center", () => {
        assert.ok(up.y < 300);
      });
    });
  });

  describe("GIVEN a point in front of the origin and one behind it", () => {
    const nearPoint = { x: 0, y: 0, z: -200 };
    const farPoint = { x: 0, y: 0, z: 200 };

    describe("WHEN both are projected", () => {
      let near;
      let far;

      before(() => {
        near = projectPoint(nearPoint, FLAT, VIEWPORT);
        far = projectPoint(farPoint, FLAT, VIEWPORT);
      });

      it("THEN the farther point is drawn smaller", () => {
        assert.ok(near.scale > far.scale);
      });

      it("THEN the near point is closer", () => {
        assert.ok(near.depth < far.depth);
      });
    });
  });

  describe("GIVEN a point behind the camera", () => {
    const behind = { x: 0, y: 0, z: -2000 };

    describe("WHEN it is projected", () => {
      let result;

      before(() => {
        result = projectPoint(behind, FLAT, VIEWPORT);
      });

      it("THEN it is dropped and not drawn", () => {
        assert.equal(result, null);
      });
    });
  });

  describe("GIVEN a camera turned half a turn and a point to the right of the origin", () => {
    const turned = { ...FLAT, yaw: Math.PI };
    const point = { x: 100, y: 0, z: 0 };

    describe("WHEN the point is projected", () => {
      let result;

      before(() => {
        result = projectPoint(point, turned, VIEWPORT);
      });

      it("THEN it swings around and appears left of center", () => {
        assert.ok(result.x < 400);
      });
    });
  });
});

describe("camera controls", () => {
  describe("GIVEN a flat camera", () => {
    const camera = FLAT;

    describe("WHEN it is orbited far down and far up", () => {
      let tooLow;
      let tooHigh;

      before(() => {
        tooLow = orbitCamera(camera, 0, -5);
        tooHigh = orbitCamera(camera, 0, 5);
      });

      it("THEN the pitch stops at looking along the floor", () => {
        assert.equal(tooLow.pitch, CAMERA_LIMITS.minPitch);
      });

      it("THEN the pitch stops at looking straight down", () => {
        assert.equal(tooHigh.pitch, CAMERA_LIMITS.maxPitch);
      });
    });
  });

  describe("GIVEN a flat camera at distance 1000", () => {
    const camera = FLAT;

    describe("WHEN it zooms in twice and then by a huge factor", () => {
      let doubled;
      let extreme;

      before(() => {
        doubled = zoomCamera(camera, 2);
        extreme = zoomCamera(camera, 1000);
      });

      it("THEN zooming in twice halves the distance", () => {
        assert.equal(doubled.distance, 500);
      });

      it("THEN the distance never goes below the minimum", () => {
        assert.equal(extreme.distance, CAMERA_LIMITS.minDistance);
      });
    });
  });

  describe("GIVEN a small scene and a big scene", () => {
    const smallScene = [{ x: 100, y: 0, z: 0 }];
    const bigScene = [{ x: 1000, y: 0, z: 0 }];

    describe("WHEN the fitting distance is computed for each", () => {
      let small;
      let big;

      before(() => {
        small = fitDistance(smallScene, FLAT, VIEWPORT);
        big = fitDistance(bigScene, FLAT, VIEWPORT);
      });

      it("THEN the bigger scene needs the camera to back off farther", () => {
        assert.ok(big > small);
      });
    });
  });
});

describe("pickNode", () => {
  const projected = [
    { id: "far", x: 100, y: 100, radius: 10, depth: 900 },
    { id: "near", x: 105, y: 100, radius: 10, depth: 500 },
  ];

  describe("GIVEN a pointer over two overlapping nodes", () => {
    const [x, y] = [102, 100];

    describe("WHEN a node is picked", () => {
      let result;

      before(() => {
        result = pickNode(projected, x, y);
      });

      it("THEN the nearer node under the pointer wins", () => {
        assert.equal(result, "near");
      });
    });
  });

  describe("GIVEN a pointer away from every node", () => {
    const [x, y] = [300, 300];

    describe("WHEN a node is picked", () => {
      let result;

      before(() => {
        result = pickNode(projected, x, y);
      });

      it("THEN nothing is picked over empty space", () => {
        assert.equal(result, null);
      });
    });
  });

  describe("GIVEN a far node listed before a near one", () => {
    const nodes = projected;

    describe("WHEN the nodes are sorted for painting", () => {
      let result;

      before(() => {
        result = sortFarToNear(nodes);
      });

      it("THEN the far node is painted first", () => {
        assert.deepEqual(result.map((p) => p.id), ["far", "near"]);
      });
    });
  });
});

describe("layoutScene", () => {
  const nodes = [
    { node_id: "area.a", node_type: "area" },
    { node_id: "light.x", node_type: "entity" },
    { node_id: "automation.y", node_type: "automation" },
  ];

  describe("GIVEN 2D positions for an area, an entity and an automation", () => {
    const positions = new Map([["area.a", { x: 100, y: 50 }], ["light.x", { x: 200, y: 50 }], ["automation.y", { x: 300, y: 200 }]]);

    describe("WHEN the 3D scene is laid out", () => {
      let placed;

      before(() => {
        placed = layoutScene(nodes, positions);
      });

      it("THEN the 2D floor plan is kept, centered, with the area on the bottom floor", () => {
        assert.deepEqual(placed.get("area.a"), { x: -100, y: -2 * LAYOUT_3D.floorGap, z: -50 });
      });

      it("THEN the entity sits on the middle floor", () => {
        assert.equal(placed.get("light.x").y, 0);
      });

      it("THEN the automation sits on the top floor", () => {
        assert.equal(placed.get("automation.y").y, 2 * LAYOUT_3D.floorGap);
      });
    });
  });

  describe("GIVEN no 2D positions at all", () => {
    const positions = new Map();

    describe("WHEN the 3D scene is laid out", () => {
      let light;

      before(() => {
        const placed = layoutScene(nodes, positions);
        light = placed.get("light.x");
      });

      it("THEN the node without a 2D position sits on the fallback ring", () => {
        assert.equal(Math.round(Math.hypot(light.x, light.z)), LAYOUT_3D.ringRadius);
      });
    });
  });
});
