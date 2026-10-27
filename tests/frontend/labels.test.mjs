import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { fragilityLabel, nodeRefMarkup, severityClass, severityLabel, typeClass } from "../../custom_components/entitymap/frontend/shared/labels.js";

const t = (key) => ({ severity_high: "High", fragility_missing_entity: "Missing entity", show_in_graph: "Show" })[key] ?? key;

describe("severityLabel and fragilityLabel", () => {
  describe("GIVEN a known severity and a known fragility type", () => {
    const severity = "high";
    const fragility = "missing_entity";

    describe("WHEN both are labeled", () => {
      let severityText;
      let fragilityText;

      before(() => {
        severityText = severityLabel(t, severity);
        fragilityText = fragilityLabel(t, fragility);
      });

      it("THEN the severity uses its translated label", () => {
        assert.equal(severityText, "High");
      });

      it("THEN the fragility type uses its translated label", () => {
        assert.equal(fragilityText, "Missing entity");
      });
    });
  });

  describe("GIVEN an untranslated fragility type containing markup", () => {
    const fragility = "new_<kind>";

    describe("WHEN it is labeled", () => {
      let result;

      before(() => {
        result = fragilityLabel(t, fragility);
      });

      it("THEN underscores become spaces and the markup is escaped", () => {
        assert.equal(result, "new &lt;kind&gt;");
      });
    });
  });
});

describe("nodeRefMarkup", () => {
  describe("GIVEN a node id that is either in the graph or not", () => {
    const nodeId = "light.a";

    describe("WHEN its reference markup is rendered for both cases", () => {
      let inGraph;
      let outsideGraph;

      before(() => {
        inGraph = nodeRefMarkup(t, nodeId, true);
        outsideGraph = nodeRefMarkup(t, nodeId, false);
      });

      it("THEN the node in the graph gets a jump button", () => {
        assert.match(inGraph, /^<button class="node-ref" data-goto="light.a"/);
      });

      it("THEN the node outside the graph is plain code text", () => {
        assert.equal(outsideGraph, "<code>light.a</code>");
      });
    });
  });

  describe("GIVEN a node id that tries to inject an image tag", () => {
    const nodeId = '"><img>';

    describe("WHEN its jump button is rendered", () => {
      let result;

      before(() => {
        result = nodeRefMarkup(t, nodeId, true);
      });

      it("THEN no raw image tag reaches the attribute or the text", () => {
        assert.doesNotMatch(result, /<img>/);
      });
    });
  });
});

describe("typeClass and severityClass", () => {
  describe("GIVEN a known node type and a known severity", () => {
    describe("WHEN their color classes are built", () => {
      let classes;

      before(() => {
        classes = [typeClass("device"), severityClass("critical")];
      });

      it("THEN each names its own color token", () => {
        assert.deepEqual(classes, ["type-device", "sev-critical"]);
      });
    });
  });

  describe("GIVEN values the panel does not know, including one carrying markup", () => {
    describe("WHEN their color classes are built", () => {
      let classes;

      before(() => {
        classes = [typeClass('x" onclick="alert(1)'), typeClass(undefined), severityClass("urgent")];
      });

      it("THEN they fall back to the unknown type and the info severity", () => {
        assert.deepEqual(classes, ["type-unknown", "type-unknown", "sev-info"]);
      });
    });
  });
});
