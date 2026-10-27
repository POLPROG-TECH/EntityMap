import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  assignEdgeCurvature,
  buildVisibleGraph,
  capSubgraph,
  focusSubgraph,
  nodePassesFilters,
  searchSubgraph,
} from "../../custom_components/entitymap/frontend/graph/graph-filters.js";

const node = (node_id, node_type = "entity", extra = {}) => ({ node_id, node_type, title: node_id, ...extra });
const NODES = [
  node("automation.wake", "automation"),
  node("light.kitchen", "entity", { area_id: "kitchen" }),
  node("device.d1", "device", { area_id: "kitchen" }),
  node("area.kitchen", "area", { area_id: "kitchen" }),
  node("sensor.lonely"),
];
const LINKS = [
  { source: "automation.wake", target: "light.kitchen" },
  { source: "light.kitchen", target: "device.d1" },
  { source: "device.d1", target: "area.kitchen" },
];
const ids = (view) => view.nodes.map((n) => n.node_id);

describe("nodePassesFilters", () => {
  describe("GIVEN filters that hide automations", () => {
    const filters = { hiddenTypes: new Set(["automation"]), scope: null };

    describe("WHEN an automation node is checked", () => {
      let result;

      before(() => {
        result = nodePassesFilters(NODES[0], filters);
      });

      it("THEN the filtered node type does not pass", () => {
        assert.equal(result, false);
      });
    });
  });

  describe("GIVEN a kitchen area scope and a sensor domain scope", () => {
    const area = { hiddenTypes: new Set(), scope: { kind: "area", value: "kitchen" } };
    const domain = { hiddenTypes: new Set(), scope: { kind: "domain", value: "sensor" } };

    describe("WHEN nodes inside and outside each scope are checked", () => {
      let kitchenLight;
      let automation;
      let sensor;

      before(() => {
        kitchenLight = nodePassesFilters(NODES[1], area);
        automation = nodePassesFilters(NODES[0], area);
        sensor = nodePassesFilters(NODES[4], domain);
      });

      it("THEN the node inside the chosen area passes", () => {
        assert.equal(kitchenLight, true);
      });

      it("THEN the node outside the chosen area does not pass", () => {
        assert.equal(automation, false);
      });

      it("THEN the node inside the chosen domain passes", () => {
        assert.equal(sensor, true);
      });
    });
  });
});

describe("focusSubgraph", () => {
  describe("GIVEN a chain of nodes focused on the kitchen light", () => {
    describe("WHEN the subgraph is taken at depth one and depth two", () => {
      let depthOne;
      let depthTwo;

      before(() => {
        depthOne = focusSubgraph(NODES, LINKS, "light.kitchen", 1);
        depthTwo = focusSubgraph(NODES, LINKS, "light.kitchen", 2);
      });

      it("THEN depth one keeps the focused node and its direct neighbors", () => {
        assert.deepEqual(ids(depthOne), ["automation.wake", "light.kitchen", "device.d1"]);
      });

      it("THEN depth two reaches one more hop of neighbors", () => {
        assert.equal(depthTwo.nodes.length, 4);
      });
    });
  });

  describe("GIVEN a focus on the automation at the end of the chain", () => {
    describe("WHEN the subgraph is taken at depth one", () => {
      let result;

      before(() => {
        result = focusSubgraph(NODES, LINKS, "automation.wake", 1);
      });

      it("THEN links that leave the focused set are dropped, so only the link inside it remains", () => {
        assert.equal(result.links.length, 1);
      });
    });
  });
});

describe("searchSubgraph", () => {
  describe("GIVEN a query matching only the automation", () => {
    const query = "wake";

    describe("WHEN the graph is searched", () => {
      let result;

      before(() => {
        result = searchSubgraph(NODES, LINKS, query);
      });

      it("THEN the match is kept together with its direct neighbor", () => {
        assert.deepEqual(ids(result), ["automation.wake", "light.kitchen"]);
      });
    });
  });
});

describe("capSubgraph", () => {
  describe("GIVEN five nodes and a cap of two", () => {
    const cap = 2;

    describe("WHEN the graph is capped", () => {
      let view;

      before(() => {
        view = capSubgraph(NODES, LINKS, cap);
      });

      it("THEN the view reports the cut and keeps only the one link between kept nodes", () => {
        assert.deepEqual({ total: view.total, capped: view.capped, links: view.links.length }, { total: 5, capped: true, links: 1 });
      });
    });
  });
});

describe("buildVisibleGraph", () => {
  describe("GIVEN devices hidden and a depth two focus on the kitchen light", () => {
    const options = { hiddenTypes: new Set(["device"]), scope: null, focusNode: "light.kitchen", query: "", focusDepth: 2, maxNodes: 500 };

    describe("WHEN the visible graph is built", () => {
      let view;

      before(() => {
        view = buildVisibleGraph({ nodes: NODES, edges: LINKS }, options);
      });

      it("THEN type filters apply before focus, so the hidden device also cuts off the area behind it", () => {
        assert.deepEqual(ids(view), ["automation.wake", "light.kitchen"]);
      });
    });
  });
});

describe("assignEdgeCurvature", () => {
  describe("GIVEN three edges between a and b in both directions, and one edge to c", () => {
    const links = [
      { source: "a", target: "b" },
      { source: "b", target: "a" },
      { source: "a", target: "b" },
      { source: "a", target: "c" },
    ];

    describe("WHEN curvature is assigned", () => {
      let result;

      before(() => {
        result = assignEdgeCurvature(links);
      });

      it("THEN the shared pair fans out and the single edge stays straight", () => {
        assert.deepEqual(result.map((l) => l._curve), [-1, 0, 1, 0]);
      });
    });
  });
});
