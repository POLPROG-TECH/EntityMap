import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { branchNodes } from "../../custom_components/entitymap/frontend/hierarchy/hierarchy-flow.js";
import { buildTreeData } from "../../custom_components/entitymap/frontend/hierarchy/hierarchy-tree.js";

const d3 = createRequire(import.meta.url)("../../custom_components/entitymap/frontend/vendor/d3.min.js");
const HIERARCHY = {
  areas: [
    {
      node_id: "area.kitchen",
      title: "Kitchen",
      devices: [
        { node_id: "device.hue", title: "Hue Bridge", entities: [{ node_id: "light.ceiling", title: "Ceiling", node_type: "entity" }] },
        { node_id: "device.oven", title: "Oven", entities: [{ node_id: "sensor.oven", title: "Oven temperature", node_type: "entity" }] },
      ],
      entities: [],
    },
  ],
  unassigned_devices: [],
  unassigned_entities: [{ node_id: "light.porch", title: "Porch", node_type: "entity" }],
};

function treeNode(root, nodeId) {
  return root.descendants().find((node) => node.data._nodeId === nodeId);
}

const idsOf = (nodes) => [...nodes].map((node) => node.data._nodeId ?? node.data._type).sort();

describe("branchNodes", () => {
  describe("GIVEN a home with a kitchen holding two devices and an unassigned porch light", () => {
    const root = d3.hierarchy(buildTreeData(HIERARCHY, { home: "Home", unassigned: "No area" }));

    describe("WHEN the Hue Bridge branch is traced", () => {
      let branch;

      before(() => {
        branch = branchNodes(treeNode(root, "device.hue"));
      });

      it("THEN it holds the bridge, its light, and every ancestor up to the root", () => {
        assert.deepEqual(idsOf(branch), ["area.kitchen", "device.hue", "light.ceiling", "root"]);
      });

      it("THEN sibling devices and other rooms stay out of it", () => {
        assert.equal(branch.has(treeNode(root, "device.oven")), false);
        assert.equal(branch.has(treeNode(root, "light.porch")), false);
      });
    });

    describe("WHEN the root is traced", () => {
      let branch;

      before(() => {
        branch = branchNodes(root);
      });

      it("THEN the whole tree is lit", () => {
        assert.equal(branch.size, root.descendants().length);
      });
    });
  });
});
