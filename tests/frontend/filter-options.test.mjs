import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  activeFilterCount,
  buildScopeOptions,
  filterScopeOptions,
  parseScopeKey,
  scopeKey,
} from "../../custom_components/entitymap/frontend/panel/filter-options.js";

const NODES = [
  { node_id: "light.lamp", area_id: "living_room" },
  { node_id: "light.desk", area_id: "office" },
  { node_id: "sensor.temp", area_id: "living_room" },
  { node_id: "automation.wake" },
];
const AREA_NAMES = new Map([["living_room", "Salon"], ["office", "Biuro"]]);

describe("buildScopeOptions", () => {
  describe("GIVEN nodes in two named areas and three domains", () => {
    describe("WHEN the scope options are built", () => {
      let options;

      before(() => {
        options = buildScopeOptions(NODES, AREA_NAMES);
      });

      it("THEN areas come first by name, then domains, each with its node count", () => {
        assert.deepEqual(
          options.map((o) => `${o.kind}:${o.label}:${o.count}`),
          ["area:Biuro:1", "area:Salon:2", "domain:automation:1", "domain:light:2", "domain:sensor:1"],
        );
      });
    });
  });

  describe("GIVEN a node in an area without a display name", () => {
    const nodes = [{ node_id: "light.x", area_id: "attic" }];

    describe("WHEN the scope options are built", () => {
      let option;

      before(() => {
        [option] = buildScopeOptions(nodes, new Map());
      });

      it("THEN the option falls back to the area id as its label", () => {
        assert.equal(option.label, "attic");
      });
    });
  });
});

describe("filterScopeOptions", () => {
  const options = buildScopeOptions(NODES, AREA_NAMES);

  describe("GIVEN an upper case label fragment and a raw area id", () => {
    const labelFragment = "SAL";
    const rawValue = "office";

    describe("WHEN the options are filtered by each", () => {
      let byLabel;
      let byValue;

      before(() => {
        byLabel = filterScopeOptions(options, labelFragment);
        byValue = filterScopeOptions(options, rawValue);
      });

      it("THEN the label fragment finds its area, ignoring case", () => {
        assert.deepEqual(byLabel.map((o) => o.value), ["living_room"]);
      });

      it("THEN the raw value finds its area", () => {
        assert.deepEqual(byValue.map((o) => o.label), ["Biuro"]);
      });
    });
  });

  describe("GIVEN a query of only whitespace", () => {
    const query = "  ";

    describe("WHEN the options are filtered by it", () => {
      let result;

      before(() => {
        result = filterScopeOptions(options, query);
      });

      it("THEN every option is kept", () => {
        assert.equal(result.length, options.length);
      });
    });
  });
});

describe("scope keys", () => {
  describe("GIVEN an area scope whose value contains a colon", () => {
    const scope = { kind: "area", value: "a:b" };

    describe("WHEN it is turned into a key and parsed back", () => {
      let result;

      before(() => {
        result = parseScopeKey(scopeKey(scope));
      });

      it("THEN the original scope comes back", () => {
        assert.deepEqual(result, scope);
      });
    });
  });

  describe("GIVEN no scope and an empty key", () => {
    describe("WHEN each is converted", () => {
      let key;
      let scope;

      before(() => {
        key = scopeKey(null);
        scope = parseScopeKey("");
      });

      it("THEN no scope maps to the empty key", () => {
        assert.equal(key, "");
      });

      it("THEN the empty key maps back to no scope", () => {
        assert.equal(scope, null);
      });
    });
  });
});

describe("activeFilterCount", () => {
  describe("GIVEN filters with two hidden types and a scope, and filters with neither", () => {
    const filtered = { hiddenTypes: new Set(["script", "scene"]), scope: { kind: "area" } };
    const unfiltered = { hiddenTypes: new Set(), scope: null };

    describe("WHEN the active filters are counted", () => {
      let filteredCount;
      let unfilteredCount;

      before(() => {
        filteredCount = activeFilterCount(filtered);
        unfilteredCount = activeFilterCount(unfiltered);
      });

      it("THEN each hidden type and the scope count once", () => {
        assert.equal(filteredCount, 3);
      });

      it("THEN filters with neither count as zero", () => {
        assert.equal(unfilteredCount, 0);
      });
    });
  });
});
