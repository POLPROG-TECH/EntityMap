import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { COLOR_TOKEN_STYLES } from "../../custom_components/entitymap/frontend/panel/color-tokens.js";
import { COLORBLIND_COLORS, NODE_CONFIG, SEVERITY_COLORS } from "../../custom_components/entitymap/frontend/shared/constants.js";

const ruleBody = (selector) => COLOR_TOKEN_STYLES.match(new RegExp(`${selector.replace(".", "\\.")} \\{([^}]*)\\}`))?.[1] ?? "";

describe("COLOR_TOKEN_STYLES", () => {
  describe("GIVEN the node type, severity and colorblind palettes", () => {
    describe("WHEN the generated color rules are read", () => {
      let base;
      let colorblind;

      before(() => {
        base = ruleBody(".entitymap-container");
        colorblind = ruleBody(".entitymap-container.colorblind");
      });

      it("THEN every node type and severity has a token with its palette color", () => {
        Object.entries(NODE_CONFIG).forEach(([type, cfg]) => assert.match(base, new RegExp(`--em-type-${type}: ${cfg.color};`)));
        Object.entries(SEVERITY_COLORS).forEach(([severity, color]) => assert.match(base, new RegExp(`--em-severity-${severity}: ${color};`)));
      });

      it("THEN the colorblind palette overrides every node type", () => {
        Object.entries(COLORBLIND_COLORS).forEach(([type, color]) => assert.match(colorblind, new RegExp(`--em-type-${type}: ${color};`)));
      });

      it("THEN each type and severity has a class pointing at its token", () => {
        Object.keys(NODE_CONFIG).forEach((type) => assert.match(COLOR_TOKEN_STYLES, new RegExp(`\\.type-${type} \\{ --type-color: var\\(--em-type-${type}\\); \\}`)));
        Object.keys(SEVERITY_COLORS).forEach((severity) => assert.match(COLOR_TOKEN_STYLES, new RegExp(`\\.sev-${severity} \\{ --sev-color: var\\(--em-severity-${severity}\\); \\}`)));
      });
    });
  });
});
