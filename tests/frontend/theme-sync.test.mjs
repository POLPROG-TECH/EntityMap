import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { themeState } from "../../custom_components/entitymap/frontend/panel/theme-sync.js";

describe("themeState", () => {
  describe("GIVEN Home Assistant in dark mode on a light system", () => {
    const hass = { themes: { darkMode: true, theme: "default" } };

    describe("WHEN the theme is read", () => {
      let theme;

      before(() => {
        theme = themeState(hass, false);
      });

      it("THEN the Home Assistant setting wins and the theme is dark", () => {
        assert.equal(theme.dark, true);
      });
    });
  });

  describe("GIVEN Home Assistant in light mode on a dark system", () => {
    const hass = { themes: { darkMode: false, theme: "default" } };

    describe("WHEN the theme is read", () => {
      let theme;

      before(() => {
        theme = themeState(hass, true);
      });

      it("THEN the theme is light", () => {
        assert.equal(theme.dark, false);
      });
    });
  });

  describe("GIVEN no theme information from Home Assistant", () => {
    const hass = {};

    describe("WHEN the theme is read on a dark system", () => {
      let theme;

      before(() => {
        theme = themeState(hass, true);
      });

      it("THEN the system preference decides", () => {
        assert.equal(theme.dark, true);
      });
    });
  });

  describe("GIVEN the same dark mode with two different named themes", () => {
    const first = { themes: { darkMode: true, theme: "default" } };
    const second = { themes: { darkMode: true, theme: "midnight" } };

    describe("WHEN both are read", () => {
      let keys;

      before(() => {
        keys = [themeState(first, false).key, themeState(second, false).key];
      });

      it("THEN their keys differ, so switching themes counts as a change", () => {
        assert.notEqual(keys[0], keys[1]);
      });
    });
  });

  describe("GIVEN Home Assistant in dark mode", () => {
    const hass = { themes: { darkMode: true, theme: "default" } };

    describe("WHEN the panel is set to Light", () => {
      let theme;

      before(() => {
        theme = themeState(hass, true, "light");
      });

      it("THEN the panel is light and marks the override", () => {
        assert.deepEqual([theme.dark, theme.override], [false, "light"]);
      });
    });

    describe("WHEN the panel is set to Automatic", () => {
      let theme;

      before(() => {
        theme = themeState(hass, false, "auto");
      });

      it("THEN Home Assistant decides and nothing is overridden", () => {
        assert.deepEqual([theme.dark, theme.override], [true, null]);
      });
    });
  });

  describe("GIVEN Home Assistant in light mode", () => {
    const hass = { themes: { darkMode: false, theme: "default" } };

    describe("WHEN the panel is set to Dark, then to an unknown value", () => {
      let forced;
      let unknown;

      before(() => {
        forced = themeState(hass, false, "dark");
        unknown = themeState(hass, false, "sepia");
      });

      it("THEN Dark forces the dark theme", () => {
        assert.deepEqual([forced.dark, forced.override], [true, "dark"]);
      });

      it("THEN an unknown value behaves like Automatic", () => {
        assert.deepEqual([unknown.dark, unknown.override], [false, null]);
      });
    });
  });
});
