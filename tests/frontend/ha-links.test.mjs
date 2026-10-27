import { afterEach, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { haTargetFor, navigateTo, openMoreInfo } from "../../custom_components/entitymap/frontend/shared/ha-links.js";

describe("haTargetFor", () => {
  describe("GIVEN a device node", () => {
    const node = { node_id: "device.abc", node_type: "device", device_id: "abc" };

    describe("WHEN its Home Assistant target is resolved", () => {
      let result;

      before(() => {
        result = haTargetFor(node, {});
      });

      it("THEN it navigates to the device page", () => {
        assert.deepEqual(result, { kind: "navigate", path: "/config/devices/device/abc", labelKey: "open_device" });
      });
    });
  });

  describe("GIVEN an area node", () => {
    const node = { node_id: "area.living_room", node_type: "area", area_id: "living_room" };

    describe("WHEN its Home Assistant target is resolved", () => {
      let result;

      before(() => {
        result = haTargetFor(node, {});
      });

      it("THEN it navigates to the area page", () => {
        assert.equal(result.path, "/config/areas/area/living_room");
      });
    });
  });

  describe("GIVEN a UI automation whose state carries a config id", () => {
    const node = { node_id: "automation.lights", node_type: "automation" };
    const states = { "automation.lights": { attributes: { id: "1700000000" } } };

    describe("WHEN its Home Assistant target is resolved", () => {
      let result;

      before(() => {
        result = haTargetFor(node, states);
      });

      it("THEN it navigates to the automation editor for that id", () => {
        assert.deepEqual(result, {
          kind: "navigate",
          path: "/config/automation/edit/1700000000",
          labelKey: "open_automation",
        });
      });
    });
  });

  describe("GIVEN a YAML automation whose state has no config id", () => {
    const node = { node_id: "automation.yaml_only", node_type: "automation" };
    const states = { "automation.yaml_only": { attributes: {} } };

    describe("WHEN its Home Assistant target is resolved", () => {
      let result;

      before(() => {
        result = haTargetFor(node, states);
      });

      it("THEN it falls back to the more-info dialog", () => {
        assert.deepEqual(result, { kind: "more-info", entityId: "automation.yaml_only", labelKey: "open_entity" });
      });
    });
  });

  describe("GIVEN a script node that has a state", () => {
    const node = { node_id: "script.good_night", node_type: "script" };
    const states = { "script.good_night": { attributes: {} } };

    describe("WHEN its Home Assistant target is resolved", () => {
      let result;

      before(() => {
        result = haTargetFor(node, states);
      });

      it("THEN it navigates to the script editor for its object id", () => {
        assert.equal(result.path, "/config/script/edit/good_night");
      });
    });
  });

  describe("GIVEN a plain entity node that has a state", () => {
    const node = { node_id: "light.kitchen", node_type: "entity" };
    const states = { "light.kitchen": {} };

    describe("WHEN its Home Assistant target is resolved", () => {
      let result;

      before(() => {
        result = haTargetFor(node, states);
      });

      it("THEN it offers the more-info dialog", () => {
        assert.equal(result.kind, "more-info");
      });
    });
  });

  describe("GIVEN an entity node without a state, and no node at all", () => {
    const node = { node_id: "light.gone", node_type: "entity" };

    describe("WHEN their Home Assistant targets are resolved", () => {
      let missingEntity;
      let missingNode;

      before(() => {
        missingEntity = haTargetFor(node, {});
        missingNode = haTargetFor(null, {});
      });

      it("THEN the entity that no longer exists has no target", () => {
        assert.equal(missingEntity, null);
      });

      it("THEN the missing node has no target", () => {
        assert.equal(missingNode, null);
      });
    });
  });
});

describe("navigation helpers", () => {
  describe("GIVEN recording stubs for history and window", () => {
    const calls = [];

    /*
     * The stubs are globals, so they are installed and removed around every
     * test to keep other test files and suites free of them.
     */
    beforeEach(() => {
      calls.length = 0;
      globalThis.history = {
        pushState: (...args) => calls.push(["push", args[2]]),
        replaceState: (...args) => calls.push(["replace", args[2]]),
      };
      globalThis.window = { dispatchEvent: (event) => calls.push(["event", event.type, event.detail]) };
    });

    afterEach(() => {
      delete globalThis.history;
      delete globalThis.window;
    });

    describe("WHEN the panel navigates to a device page", () => {
      beforeEach(() => {
        navigateTo("/config/devices/device/abc");
      });

      it("THEN history is pushed and a location change is announced to the router", () => {
        assert.deepEqual(calls, [
          ["push", "/config/devices/device/abc"],
          ["event", "location-changed", { replace: false }],
        ]);
      });
    });

    describe("WHEN the panel navigates with replace requested", () => {
      beforeEach(() => {
        navigateTo("/entitymap/graph", true);
      });

      it("THEN history is replaced instead of pushed", () => {
        assert.deepEqual(calls[0], ["replace", "/entitymap/graph"]);
      });
    });
  });

  describe("GIVEN an element that records the events it dispatches", () => {
    const calls = [];
    const element = { dispatchEvent: (event) => calls.push([event.type, event.detail, event.bubbles, event.composed]) };

    describe("WHEN more-info is opened for an entity", () => {
      before(() => {
        openMoreInfo(element, "light.kitchen");
      });

      it("THEN Home Assistant is asked for the more-info dialog with a bubbling, composed event naming the entity", () => {
        assert.deepEqual(calls, [["hass-more-info", { entityId: "light.kitchen" }, true, true]]);
      });
    });
  });
});
