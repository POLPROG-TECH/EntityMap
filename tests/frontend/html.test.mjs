import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { escapeHtml, haIcon } from "../../custom_components/entitymap/frontend/shared/html.js";

describe("escapeHtml", () => {
  describe("GIVEN an entity name carrying an image tag with an onerror handler", () => {
    const name = '<img src=x onerror="alert(1)">';

    describe("WHEN the name is escaped", () => {
      let result;

      before(() => {
        result = escapeHtml(name);
      });

      it("THEN every markup character is turned into an entity", () => {
        assert.equal(result, "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
      });
    });
  });

  describe("GIVEN a name with an ampersand and a single quote", () => {
    const name = "Tom & Jerry's";

    describe("WHEN the name is escaped", () => {
      let result;

      before(() => {
        result = escapeHtml(name);
      });

      it("THEN both characters used to break attributes are encoded", () => {
        assert.equal(result, "Tom &amp; Jerry&#39;s");
      });
    });
  });

  describe("GIVEN null and undefined values", () => {
    const missing = null;
    const unset = undefined;

    describe("WHEN each value is escaped", () => {
      let fromNull;
      let fromUndefined;

      before(() => {
        fromNull = escapeHtml(missing);
        fromUndefined = escapeHtml(unset);
      });

      it("THEN null becomes empty text", () => {
        assert.equal(fromNull, "");
      });

      it("THEN undefined becomes empty text", () => {
        assert.equal(fromUndefined, "");
      });
    });
  });

  describe("GIVEN a number", () => {
    const value = 42;

    describe("WHEN the number is escaped", () => {
      let result;

      before(() => {
        result = escapeHtml(value);
      });

      it("THEN it is returned as its string form", () => {
        assert.equal(result, "42");
      });
    });
  });
});

describe("haIcon", () => {
  describe("GIVEN a plain icon name", () => {
    const icon = "mdi:close";

    describe("WHEN the icon markup is rendered", () => {
      let result;

      before(() => {
        result = haIcon(icon);
      });

      it("THEN it is a decorative ha-icon hidden from assistive technology", () => {
        assert.equal(result, '<ha-icon icon="mdi:close" aria-hidden="true"></ha-icon>');
      });
    });
  });

  describe("GIVEN an icon name and a class that both try to break out of their attributes", () => {
    const icon = 'mdi:x" onload="x';
    const className = 'a"b';

    describe("WHEN the icon markup is rendered", () => {
      let result;

      before(() => {
        result = haIcon(icon, className);
      });

      it("THEN the quotes stay inside the escaped attribute values", () => {
        assert.match(result, /class="a&quot;b" icon="mdi:x&quot; onload=&quot;x"/);
      });
    });
  });
});
