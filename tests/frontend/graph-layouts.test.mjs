import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { collapseEntities } from "../../custom_components/entitymap/frontend/graph/graph-collapse.js";
import { flowLayout, orderColumns } from "../../custom_components/entitymap/frontend/graph/layouts/flow-layout.js";
import { radialLayout } from "../../custom_components/entitymap/frontend/graph/layouts/radial-layout.js";
import { assignRooms, roomsLayout } from "../../custom_components/entitymap/frontend/graph/layouts/rooms-layout.js";

const NODES = [
  { node_id: "area.kitchen", node_type: "area", area_id: "kitchen", title: "Kitchen" },
  { node_id: "area.hall", node_type: "area", area_id: "hall", title: "Hall" },
  { node_id: "device.d", node_type: "device", device_id: "d", area_id: "kitchen", title: "Hub" },
  { node_id: "light.x", node_type: "entity", device_id: "d", title: "Light" },
  { node_id: "light.y", node_type: "entity", area_id: "hall", title: "Hall light" },
  { node_id: "sensor.m", node_type: "entity", title: "Motion" },
  { node_id: "automation.a", node_type: "automation", title: "Morning" },
  { node_id: "automation.b", node_type: "automation", title: "Both rooms" },
];
const LINKS = [
  { source: "device.d", target: "area.kitchen", dependency_kind: "device_in_area" },
  { source: "light.x", target: "device.d", dependency_kind: "entity_of_device" },
  { source: "automation.a", target: "light.x", dependency_kind: "action" },
  { source: "automation.a", target: "sensor.m", dependency_kind: "trigger" },
  { source: "automation.b", target: "light.x", dependency_kind: "action" },
  { source: "automation.b", target: "light.y", dependency_kind: "action" },
];
const BY_ID = new Map(NODES.map((node) => [node.node_id, node]));

describe("assignRooms", () => {
  describe("GIVEN a kitchen and a hall, a device in the kitchen and automations without an area", () => {
    describe("WHEN nodes are assigned to rooms", () => {
      let rooms;

      before(() => {
        rooms = assignRooms(NODES, LINKS, BY_ID);
      });

      it("THEN an entity without its own area joins its device's room", () => {
        assert.equal(rooms.get("light.x"), "kitchen");
      });

      it("THEN an automation joins the room it mostly controls", () => {
        assert.equal(rooms.get("automation.a"), "kitchen");
      });

      it("THEN an automation split evenly between rooms goes to the shared lane", () => {
        assert.equal(rooms.get("automation.b"), "shared");
      });

      it("THEN a node whose neighbors have no room is unassigned", () => {
        assert.equal(rooms.get("sensor.m"), "unassigned");
      });
    });
  });
});

describe("roomsLayout", () => {
  describe("GIVEN the same home", () => {
    describe("WHEN it is laid out by room", () => {
      let layout;

      before(() => {
        layout = roomsLayout(NODES, LINKS, BY_ID);
      });

      it("THEN every node gets a position", () => {
        assert.equal(layout.positions.size, NODES.length);
      });

      it("THEN rooms come first, then unassigned, then the shared lane", () => {
        assert.deepEqual(layout.groups.map((group) => group.key), ["kitchen", "hall", "unassigned", "shared"]);
      });

      it("THEN each node lies inside its room's block", () => {
        const kitchen = layout.groups.find((group) => group.key === "kitchen");
        const light = layout.positions.get("light.x");

        assert.ok(light.x > kitchen.x && light.x < kitchen.x + kitchen.width && light.y > kitchen.y && light.y < kitchen.y + kitchen.height);
      });
    });
  });
});

describe("flowLayout", () => {
  describe("GIVEN a motion sensor triggering an automation that drives a light", () => {
    describe("WHEN the home is laid out as a flow", () => {
      let layout;

      before(() => {
        layout = flowLayout(NODES, LINKS);
      });

      it("THEN columns run sources, automations, controlled entities, devices, areas", () => {
        const column = (id) => layout.positions.get(id).x;

        assert.ok(column("sensor.m") < column("automation.a"));
        assert.ok(column("automation.a") < column("light.x"));
        assert.ok(column("light.x") < column("device.d"));
        assert.ok(column("device.d") < column("area.kitchen"));
      });

      it("THEN one labeled group exists per non-empty column", () => {
        assert.deepEqual(layout.groups.map((group) => group.key), ["sources", "logic", "targets", "devices", "areas"]);
      });
    });
  });

  describe("GIVEN two columns whose links cross", () => {
    const columns = [["a1", "a2"], ["b1", "b2"]];
    const links = [{ source: "a1", target: "b2" }, { source: "a2", target: "b1" }];

    describe("WHEN the columns are ordered", () => {
      let ordered;

      before(() => {
        ordered = orderColumns(columns, links);
      });

      it("THEN the second column follows its neighbors and the crossing disappears", () => {
        assert.deepEqual(ordered[1], ["b2", "b1"]);
      });
    });
  });
});

describe("radialLayout", () => {
  describe("GIVEN the light as the center", () => {
    describe("WHEN the home is laid out around it", () => {
      let layout;

      before(() => {
        layout = radialLayout(NODES, LINKS, "light.x");
      });

      it("THEN the light sits in the middle", () => {
        assert.deepEqual(layout.positions.get("light.x"), { x: 0, y: 0 });
      });

      it("THEN what the light depends on sits on the right", () => {
        assert.ok(layout.positions.get("device.d").x > 0);
      });

      it("THEN what depends on the light sits on the left", () => {
        assert.ok(layout.positions.get("automation.a").x < 0);
      });

      it("THEN each hop gets a ring and unrelated nodes get a grid", () => {
        assert.deepEqual(layout.groups.map((group) => group.kind), ["ring", "ring", "unrelated"]);
      });

      it("THEN the nodes on the rings are marked as related and the rest are not", () => {
        assert.ok(layout.related.has("light.x") && layout.related.has("device.d"));
        assert.equal(layout.related.has("sensor.m"), false);
      });
    });
  });

  describe("GIVEN a center that is not in view", () => {
    describe("WHEN the radial layout is requested", () => {
      let layout;

      before(() => {
        layout = radialLayout(NODES, LINKS, "light.missing");
      });

      it("THEN there is no layout", () => {
        assert.equal(layout, null);
      });
    });
  });
});

describe("collapseEntities", () => {
  describe("GIVEN an entity on a device and an automation driving the entity", () => {
    describe("WHEN entities are folded into their devices", () => {
      let view;

      before(() => {
        view = collapseEntities(NODES, LINKS);
      });

      it("THEN the entity disappears and the device counts it", () => {
        assert.equal(view.nodes.some((node) => node.node_id === "light.x"), false);
        assert.equal(view.nodes.find((node) => node.node_id === "device.d").collapsed_count, 1);
      });

      it("THEN the automation's edge moves to the device", () => {
        assert.ok(view.links.some((link) => link.source === "automation.a" && link.target === "device.d"));
      });

      it("THEN the entity-to-device edge is dropped instead of looping", () => {
        assert.equal(view.links.some((link) => link.source === link.target), false);
      });

      it("THEN entities without a device in view stay", () => {
        assert.ok(view.nodes.some((node) => node.node_id === "sensor.m"));
      });
    });

    describe("WHEN the device is expanded or the entity must stay visible", () => {
      let expanded;
      let kept;

      before(() => {
        expanded = collapseEntities(NODES, LINKS, { expanded: new Set(["device.d"]) });
        kept = collapseEntities(NODES, LINKS, { keep: new Set(["light.x"]) });
      });

      it("THEN an expanded device keeps its entities", () => {
        assert.ok(expanded.nodes.some((node) => node.node_id === "light.x"));
      });

      it("THEN a kept entity is not folded", () => {
        assert.ok(kept.nodes.some((node) => node.node_id === "light.x"));
      });
    });
  });
});
