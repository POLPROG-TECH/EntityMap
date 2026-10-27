import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  areaMembership,
  areaNamesById,
  countByType,
  directionalDegrees,
  edgeFamily,
  findPath,
} from "../../custom_components/entitymap/frontend/shared/graph-model.js";

describe("countByType", () => {
  describe("GIVEN two entities and one area", () => {
    const nodes = [{ node_type: "entity" }, { node_type: "entity" }, { node_type: "area" }];

    describe("WHEN they are counted by type", () => {
      let counts;

      before(() => {
        counts = countByType(nodes);
      });

      it("THEN each type has its count, in first seen order", () => {
        assert.deepEqual([...counts], [["entity", 2], ["area", 1]]);
      });
    });
  });
});

describe("edgeFamily", () => {
  describe("GIVEN a trigger, an action and a structural dependency kind", () => {
    describe("WHEN their families are looked up", () => {
      let trigger;
      let action;
      let structure;

      before(() => {
        trigger = edgeFamily("device_trigger");
        action = edgeFamily("service_call");
        structure = edgeFamily("device_in_area");
      });

      it("THEN the trigger kind maps to the trigger family", () => {
        assert.equal(trigger, "trigger");
      });

      it("THEN the action kind maps to the action family", () => {
        assert.equal(action, "action");
      });

      it("THEN the structural kind maps to the structure family", () => {
        assert.equal(structure, "structure");
      });
    });
  });

  describe("GIVEN a dependency kind the panel does not know", () => {
    const kind = "something_new";

    describe("WHEN its family is looked up", () => {
      let result;

      before(() => {
        result = edgeFamily(kind);
      });

      it("THEN it is treated as a reference", () => {
        assert.equal(result, "reference");
      });
    });
  });
});

describe("directionalDegrees", () => {
  describe("GIVEN an automation and a script that both use the same light", () => {
    const links = [
      { source: "automation.a", target: "light.x" },
      { source: "script.b", target: "light.x" },
    ];

    describe("WHEN the directional degrees are counted", () => {
      let dependsOn;
      let usedBy;

      before(() => {
        ({ dependsOn, usedBy } = directionalDegrees(links));
      });

      it("THEN dependencies count on the source", () => {
        assert.equal(dependsOn.get("automation.a"), 1);
      });

      it("THEN uses count on the target", () => {
        assert.equal(usedBy.get("light.x"), 2);
        assert.equal(usedBy.get("automation.a"), undefined);
      });
    });
  });
});

describe("areaMembership", () => {
  describe("GIVEN a kitchen device with an entity, an entity in the hall and an automation without an area", () => {
    const device = { node_id: "device.d1", node_type: "device", device_id: "d1", area_id: "kitchen" };
    const nodes = [
      { node_id: "area.kitchen", node_type: "area", area_id: "kitchen" },
      device,
      { node_id: "light.a", node_type: "entity", device_id: "d1" },
      { node_id: "light.b", node_type: "entity", area_id: "hall" },
      { node_id: "automation.c", node_type: "automation" },
    ];

    describe("WHEN area membership is computed", () => {
      let members;

      before(() => {
        members = areaMembership(nodes, new Map([["device.d1", device]]));
      });

      it("THEN the entity without its own area inherits its device's area", () => {
        assert.deepEqual(members.get("kitchen"), ["device.d1", "light.a"]);
      });

      it("THEN the entity with its own area is placed there", () => {
        assert.deepEqual(members.get("hall"), ["light.b"]);
      });

      it("THEN the automation belongs nowhere", () => {
        assert.equal(members.size, 2);
      });
    });
  });
});

describe("areaNamesById", () => {
  describe("GIVEN an area node and an entity in that area", () => {
    const nodes = [
      { node_id: "area.living_room", node_type: "area", area_id: "living_room", title: "Living Room" },
      { node_id: "light.lamp", node_type: "entity", area_id: "living_room", title: "Lamp" },
    ];

    describe("WHEN the area names are mapped", () => {
      let result;

      before(() => {
        result = areaNamesById(nodes);
      });

      it("THEN only the area node supplies a name for its area id", () => {
        assert.deepEqual([...result], [["living_room", "Living Room"]]);
      });
    });
  });

  describe("GIVEN no node list", () => {
    describe("WHEN the area names are mapped", () => {
      let result;

      before(() => {
        result = areaNamesById(undefined);
      });

      it("THEN the map is empty", () => {
        assert.equal(result.size, 0);
      });
    });
  });
});

describe("findPath", () => {
  describe("GIVEN a and c both linking to b", () => {
    const links = [
      { source: "a", target: "b" },
      { source: "c", target: "b" },
    ];

    describe("WHEN a path from a to c is searched", () => {
      let result;

      before(() => {
        result = findPath(links, "a", "c");
      });

      it("THEN the shortest path goes through b regardless of link direction", () => {
        assert.deepEqual(result, ["a", "b", "c"]);
      });
    });
  });

  describe("GIVEN a single link that does not reach z", () => {
    const links = [{ source: "a", target: "b" }];

    describe("WHEN a path from a to z is searched", () => {
      let result;

      before(() => {
        result = findPath(links, "a", "z");
      });

      it("THEN the path is empty", () => {
        assert.deepEqual(result, []);
      });
    });
  });
});
