import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  countBySeverity,
  findingsToCsv,
  selectFindings,
} from "../../custom_components/entitymap/frontend/findings/findings-data.js";

const FINDINGS = [
  { severity: "low", fragility_type: "stale_reference", node_id: "script.b", rationale: "Old", related_node_ids: [] },
  { severity: "critical", fragility_type: "missing_entity", node_id: "automation.z", rationale: "Gone", related_node_ids: ["light.x"] },
  { severity: "high", fragility_type: "device_id_reference", node_id: "automation.a", rationale: "Uses device", related_node_ids: [] },
];

const ids = (findings) => findings.map((f) => f.node_id);

describe("selectFindings", () => {
  describe("GIVEN findings of low, critical and high severity", () => {
    describe("WHEN they are selected without options", () => {
      let result;

      before(() => {
        result = selectFindings(FINDINGS);
      });

      it("THEN they are sorted by severity, most severe first", () => {
        assert.deepEqual(ids(result), ["automation.z", "automation.a", "script.b"]);
      });
    });

    describe("WHEN they are sorted by node id and by issue type", () => {
      let byNode;
      let byType;

      before(() => {
        byNode = selectFindings(FINDINGS, { sort: "node" });
        byType = selectFindings(FINDINGS, { sort: "type" });
      });

      it("THEN the node id sort orders them by node id", () => {
        assert.deepEqual(ids(byNode), ["automation.a", "automation.z", "script.b"]);
      });

      it("THEN the issue type sort orders them by issue type", () => {
        assert.deepEqual(ids(byType), ["automation.a", "automation.z", "script.b"]);
      });
    });

    describe("WHEN only high severity is selected", () => {
      let result;

      before(() => {
        result = selectFindings(FINDINGS, { severity: "high" });
      });

      it("THEN only the high finding remains", () => {
        assert.deepEqual(ids(result), ["automation.a"]);
      });
    });
  });

  describe("GIVEN the node type of every finding, with automations hidden", () => {
    const nodeTypeById = new Map([["script.b", "script"], ["automation.a", "automation"], ["automation.z", "automation"]]);
    const hiddenTypes = new Set(["automation"]);

    describe("WHEN the findings are selected", () => {
      let result;

      before(() => {
        result = selectFindings(FINDINGS, { hiddenTypes, nodeTypeById });
      });

      it("THEN only the script finding remains", () => {
        assert.deepEqual(ids(result), ["script.b"]);
      });
    });
  });

  describe("GIVEN a query naming a related node and a query matching a rationale", () => {
    const relatedQuery = "LIGHT.X";
    const rationaleQuery = "device";

    describe("WHEN the findings are searched with each", () => {
      let byRelated;
      let byRationale;

      before(() => {
        byRelated = selectFindings(FINDINGS, { query: relatedQuery });
        byRationale = selectFindings(FINDINGS, { query: rationaleQuery });
      });

      it("THEN the related node query finds its finding", () => {
        assert.deepEqual(ids(byRelated), ["automation.z"]);
      });

      it("THEN the rationale query finds its finding", () => {
        assert.deepEqual(ids(byRationale), ["automation.a"]);
      });
    });
  });

  describe("GIVEN a copy of the findings in their original order", () => {
    const input = [...FINDINGS];

    describe("WHEN the findings are selected and sorted", () => {
      before(() => {
        selectFindings(input);
      });

      it("THEN the caller's array keeps its original order", () => {
        assert.deepEqual(input, FINDINGS);
      });
    });
  });
});

describe("countBySeverity", () => {
  describe("GIVEN one critical, one high and one low finding", () => {
    describe("WHEN they are counted by severity", () => {
      let result;

      before(() => {
        result = countBySeverity(FINDINGS);
      });

      it("THEN every level is present, with zero for the unused ones", () => {
        assert.deepEqual(result, { critical: 1, high: 1, medium: 0, low: 1, info: 0 });
      });
    });
  });
});

describe("findingsToCsv", () => {
  describe("GIVEN a single critical finding", () => {
    const findings = [FINDINGS[1]];

    describe("WHEN it is exported as CSV", () => {
      let header;
      let row;

      before(() => {
        [header, row] = findingsToCsv(findings).split("\r\n");
      });

      it("THEN a header row comes first", () => {
        assert.equal(header, "severity,fragility_type,node_id,related_node_ids,rationale,remediation");
      });

      it("THEN a row of quoted cells follows the header", () => {
        assert.equal(row, '"critical","missing_entity","automation.z","light.x","Gone",""');
      });
    });
  });

  describe("GIVEN a finding whose rationale contains quotes", () => {
    const finding = { ...FINDINGS[0], rationale: 'Said "hi"' };

    describe("WHEN it is exported as CSV", () => {
      let csv;

      before(() => {
        csv = findingsToCsv([finding]);
      });

      it("THEN each embedded quote is doubled", () => {
        assert.match(csv, /"Said ""hi"""/);
      });
    });
  });

  describe("GIVEN a finding whose rationale starts with a formula", () => {
    const finding = { ...FINDINGS[0], rationale: "=HYPERLINK(\"http://x\")" };

    describe("WHEN it is exported as CSV", () => {
      let csv;

      before(() => {
        csv = findingsToCsv([finding]);
      });

      it("THEN the cell is prefixed so a spreadsheet keeps it as plain text", () => {
        assert.match(csv, /"'=HYPERLINK\(""http:\/\/x""\)"/);
      });
    });
  });
});
