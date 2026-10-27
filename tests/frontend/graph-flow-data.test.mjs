import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { flowDirection, impactLayers } from "../../custom_components/entitymap/frontend/graph/graph-flow-data.js";

describe("flowDirection", () => {
  describe("GIVEN action and service call edges", () => {
    describe("WHEN their flow direction is read", () => {
      let action;
      let serviceCall;

      before(() => {
        action = flowDirection({ dependency_kind: "action" });
        serviceCall = flowDirection({ dependency_kind: "service_call" });
      });

      it("THEN events travel along an action edge: the automation drives the entity", () => {
        assert.equal(action, 1);
      });

      it("THEN events travel along a service call edge", () => {
        assert.equal(serviceCall, 1);
      });
    });
  });

  describe("GIVEN trigger, condition and template reference edges", () => {
    describe("WHEN their flow direction is read", () => {
      let trigger;
      let condition;
      let reference;

      before(() => {
        trigger = flowDirection({ dependency_kind: "trigger" });
        condition = flowDirection({ dependency_kind: "device_condition" });
        reference = flowDirection({ dependency_kind: "template_reference" });
      });

      it("THEN events travel against a trigger edge", () => {
        assert.equal(trigger, -1);
      });

      it("THEN events travel against a condition edge", () => {
        assert.equal(condition, -1);
      });

      it("THEN events travel against a template reference edge", () => {
        assert.equal(reference, -1);
      });
    });
  });

  describe("GIVEN device and area membership edges", () => {
    describe("WHEN their flow direction is read", () => {
      let entityOfDevice;
      let deviceInArea;

      before(() => {
        entityOfDevice = flowDirection({ dependency_kind: "entity_of_device" });
        deviceInArea = flowDirection({ dependency_kind: "device_in_area" });
      });

      it("THEN no events travel on the entity of device edge", () => {
        assert.equal(entityOfDevice, 0);
      });

      it("THEN no events travel on the device in area edge", () => {
        assert.equal(deviceInArea, 0);
      });
    });
  });
});

describe("impactLayers", () => {
  /** light <- automation <- script, and light <- scene; device <- light */
  const EDGES = [
    { source: "automation.a", target: "light.x" },
    { source: "script.s", target: "automation.a" },
    { source: "scene.z", target: "light.x" },
    { source: "light.x", target: "device.d" },
  ];

  describe("GIVEN a light used by an automation and a scene, the automation used by a script, and the light depending on a device", () => {
    describe("WHEN the impact of the light is computed", () => {
      let result;

      before(() => {
        result = impactLayers(EDGES, "light.x", 6);
      });

      it("THEN dependents are grouped by hop count", () => {
        assert.deepEqual(result.layers, [["light.x"], ["automation.a", "scene.z"], ["script.s"]]);
      });

      it("THEN only dependents are followed, so the device is not part of the impact", () => {
        assert.ok(!result.layers.flat().includes("device.d"));
      });

      it("THEN each reached node has the edge and hop that first reached it", () => {
        assert.deepEqual(result.edges, [
          { source: "automation.a", target: "light.x", depth: 0 },
          { source: "scene.z", target: "light.x", depth: 0 },
          { source: "script.s", target: "automation.a", depth: 1 },
        ]);
      });
    });

    describe("WHEN the impact is computed with a depth of one", () => {
      let limited;

      before(() => {
        limited = impactLayers(EDGES, "light.x", 1);
      });

      it("THEN the limit stops after one hop", () => {
        assert.equal(limited.layers.length, 2);
      });
    });
  });

  describe("GIVEN a copy of the chain where the light also depends on the script", () => {
    const cyclic = [...EDGES, { source: "light.x", target: "script.s" }];

    describe("WHEN the impact is computed on the cyclic graph", () => {
      let looped;

      before(() => {
        looped = impactLayers(cyclic, "light.x", 6);
      });

      it("THEN the cycle visits each node once", () => {
        assert.deepEqual(looped.layers.flat().sort(), ["automation.a", "light.x", "scene.z", "script.s"]);
      });
    });
  });

  describe("GIVEN a node that no edge points at", () => {
    const nodeId = "device.unused";

    describe("WHEN its impact is computed", () => {
      let result;

      before(() => {
        result = impactLayers(EDGES, nodeId, 6);
      });

      it("THEN only the node itself is returned", () => {
        assert.deepEqual(result, { layers: [["device.unused"]], edges: [] });
      });
    });
  });
});
