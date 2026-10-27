import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { NODE_CONFIG } from "../../custom_components/entitymap/frontend/shared/constants.js";
import { NODE_GLYPHS, glyphColor, relativeLuminance } from "../../custom_components/entitymap/frontend/graph/node-glyphs.js";

describe("NODE_GLYPHS", () => {
  describe("GIVEN the configured node types", () => {
    const nodeTypes = Object.keys(NODE_CONFIG).sort();

    describe("WHEN the glyph table keys are listed", () => {
      let glyphTypes;

      before(() => {
        glyphTypes = Object.keys(NODE_GLYPHS).sort();
      });

      it("THEN there is exactly one glyph per node type", () => {
        assert.deepEqual(glyphTypes, nodeTypes);
      });
    });
  });
});

describe("glyphColor", () => {
  describe("GIVEN a white fill and a dark blue fill", () => {
    const lightFill = "#FFFFFF";
    const darkFill = "#0072B2";

    describe("WHEN a glyph color is chosen for each", () => {
      let onLight;
      let onDark;

      before(() => {
        onLight = glyphColor(lightFill);
        onDark = glyphColor(darkFill);
      });

      it("THEN the light fill gets a dark glyph", () => {
        assert.equal(onLight, "rgba(0, 0, 0, 0.72)");
      });

      it("THEN the dark fill gets a white glyph", () => {
        assert.equal(onDark, "#ffffff");
      });
    });
  });

  describe("GIVEN a CSS variable instead of a hex color", () => {
    const fill = "var(--x)";

    describe("WHEN its luminance and glyph color are computed", () => {
      let luminance;
      let color;

      before(() => {
        luminance = relativeLuminance(fill);
        color = glyphColor(fill);
      });

      it("THEN the unparseable color counts as black", () => {
        assert.equal(luminance, 0);
      });

      it("THEN it gets a white glyph", () => {
        assert.equal(color, "#ffffff");
      });
    });
  });
});
