import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildRoutePath, parseRoutePath } from "../../custom_components/entitymap/frontend/panel/route-state.js";

describe("parseRoutePath", () => {
  describe("GIVEN an empty path and a missing path", () => {
    const emptyPath = "";
    const missingPath = undefined;

    describe("WHEN each path is parsed", () => {
      let fromEmpty;
      let fromMissing;

      before(() => {
        fromEmpty = parseRoutePath(emptyPath);
        fromMissing = parseRoutePath(missingPath);
      });

      it("THEN the empty path defaults to the graph with nothing selected", () => {
        assert.deepEqual(fromEmpty, { view: "graph", nodeId: null });
      });

      it("THEN the missing path defaults to the graph with nothing selected", () => {
        assert.deepEqual(fromMissing, { view: "graph", nodeId: null });
      });
    });
  });

  describe("GIVEN a graph path with a node segment", () => {
    const path = "/graph/light.kitchen";

    describe("WHEN the path is parsed", () => {
      let result;

      before(() => {
        result = parseRoutePath(path);
      });

      it("THEN the node is selected in the graph view", () => {
        assert.deepEqual(result, { view: "graph", nodeId: "light.kitchen" });
      });
    });
  });

  describe("GIVEN the issues path", () => {
    const path = "/issues";

    describe("WHEN the path is parsed", () => {
      let result;

      before(() => {
        result = parseRoutePath(path);
      });

      it("THEN the issues segment maps to the findings view", () => {
        assert.deepEqual(result, { view: "findings", nodeId: null });
      });
    });
  });

  describe("GIVEN a hierarchy path with a node segment", () => {
    const path = "/hierarchy/light.kitchen";

    describe("WHEN the path is parsed", () => {
      let result;

      before(() => {
        result = parseRoutePath(path);
      });

      it("THEN the hierarchy view opens and the node segment is ignored", () => {
        assert.deepEqual(result, { view: "hierarchy", nodeId: null });
      });
    });
  });

  describe("GIVEN an unknown view segment, with and without a node", () => {
    const bareSegment = "/nope";
    const segmentWithNode = "/nope/light.kitchen";

    describe("WHEN each path is parsed", () => {
      let withoutNode;
      let withNode;

      before(() => {
        withoutNode = parseRoutePath(bareSegment);
        withNode = parseRoutePath(segmentWithNode);
      });

      it("THEN the bare segment falls back to the graph with no node selected", () => {
        assert.deepEqual(withoutNode, { view: "graph", nodeId: null });
      });

      it("THEN the segment with a node falls back to the graph with no node selected", () => {
        assert.deepEqual(withNode, { view: "graph", nodeId: null });
      });
    });
  });

  describe("GIVEN a graph path whose node segment is badly percent-encoded", () => {
    const path = "/graph/%E0%A4%A";

    describe("WHEN the path is parsed", () => {
      let result;

      before(() => {
        result = parseRoutePath(path);
      });

      it("THEN the graph opens with no node selected instead of throwing", () => {
        assert.deepEqual(result, { view: "graph", nodeId: null });
      });
    });
  });
});

describe("buildRoutePath", () => {
  describe("GIVEN a node id with a slash and a space", () => {
    const nodeId = "device.a/b c";

    describe("WHEN a graph path is built and parsed back", () => {
      let path;
      let parsed;

      before(() => {
        path = buildRoutePath("/entitymap", "graph", nodeId);
        parsed = parseRoutePath(path.replace("/entitymap", ""));
      });

      it("THEN the path is encoded", () => {
        assert.equal(path, "/entitymap/graph/device.a%2Fb%20c");
      });

      it("THEN parsing restores the original id", () => {
        assert.deepEqual(parsed, { view: "graph", nodeId: "device.a/b c" });
      });
    });
  });

  describe("GIVEN the findings view with a node id", () => {
    const nodeId = "light.kitchen";

    describe("WHEN the path is built", () => {
      let result;

      before(() => {
        result = buildRoutePath("/entitymap", "findings", nodeId);
      });

      it("THEN the path names only the issues view and omits the node", () => {
        assert.equal(result, "/entitymap/issues");
      });
    });
  });
});
