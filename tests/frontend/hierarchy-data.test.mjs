import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { filterHierarchy } from "../../custom_components/entitymap/frontend/hierarchy/hierarchy-data.js";

const lamp = { node_id: "light.lamp", title: "Floor lamp" };
const tv = { node_id: "media_player.tv", title: "TV" };
const HIERARCHY = {
  areas: [
    {
      node_id: "area.living_room",
      title: "Living Room",
      devices: [
        { node_id: "device.hue", title: "Hue Bridge", metadata: { manufacturer: "Signify", model: "BSB002" }, entities: [lamp] },
        { node_id: "device.tv", title: "Television", metadata: {}, entities: [tv] },
      ],
      entities: [{ node_id: "sensor.temp", title: "Temperature" }],
      device_count: 2,
      entity_count: 3,
    },
  ],
  unassigned_devices: [],
  unassigned_entities: [{ node_id: "light.porch", title: "Porch lamp" }],
};

describe("filterHierarchy", () => {
  describe("GIVEN a whitespace-only query", () => {
    const query = "  ";

    describe("WHEN the hierarchy is filtered", () => {
      let result;

      before(() => {
        result = filterHierarchy(HIERARCHY, query);
      });

      it("THEN the original hierarchy comes back untouched with no match count", () => {
        assert.deepEqual(result, { hierarchy: HIERARCHY, matches: null });
      });
    });
  });

  describe("GIVEN a query matching only the floor lamp entity", () => {
    const query = "floor";

    describe("WHEN the hierarchy is filtered", () => {
      let hierarchy;
      let matches;
      let area;

      before(() => {
        ({ hierarchy, matches } = filterHierarchy(HIERARCHY, query));
        [area] = hierarchy.areas;
      });

      it("THEN there is one match", () => {
        assert.equal(matches, 1);
      });

      it("THEN only the lamp's device stays in its area", () => {
        assert.deepEqual(area.devices.map((d) => d.node_id), ["device.hue"]);
      });

      it("THEN the area counts shrink to match", () => {
        assert.deepEqual([area.device_count, area.entity_count], [1, 1]);
      });

      it("THEN no unassigned entity is kept", () => {
        assert.deepEqual(hierarchy.unassigned_entities, []);
      });
    });
  });

  describe("GIVEN a query matching the Hue Bridge manufacturer", () => {
    const query = "signify";

    describe("WHEN the hierarchy is filtered", () => {
      let hierarchy;

      before(() => {
        ({ hierarchy } = filterHierarchy(HIERARCHY, query));
      });

      it("THEN the device keeps all of its entities", () => {
        assert.deepEqual(hierarchy.areas[0].devices[0].entities, [lamp]);
      });
    });
  });

  describe("GIVEN a query matching the area title", () => {
    const query = "living";

    describe("WHEN the hierarchy is filtered", () => {
      let hierarchy;
      let matches;

      before(() => {
        ({ hierarchy, matches } = filterHierarchy(HIERARCHY, query));
      });

      it("THEN the area counts as one match", () => {
        assert.equal(matches, 1);
      });

      it("THEN the whole area is kept as is", () => {
        assert.equal(hierarchy.areas[0], HIERARCHY.areas[0]);
      });
    });
  });

  describe("GIVEN a query matching an unassigned entity and a query matching nothing", () => {
    const porchQuery = "porch";
    const missingQuery = "zzz";

    describe("WHEN the hierarchy is filtered with each query", () => {
      let porch;
      let missing;

      before(() => {
        porch = filterHierarchy(HIERARCHY, porchQuery);
        missing = filterHierarchy(HIERARCHY, missingQuery);
      });

      it("THEN the unassigned entity is found once", () => {
        assert.equal(porch.matches, 1);
      });

      it("THEN the unknown query reports zero matches", () => {
        assert.equal(missing.matches, 0);
      });
    });
  });
});
