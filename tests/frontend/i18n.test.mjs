import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { FALLBACK_LANGUAGE, LOCALES, resolveLanguage, translate } from "../../custom_components/entitymap/frontend/shared/i18n.js";

const placeholders = (message) => {
  const texts = typeof message === "object" ? Object.values(message) : [message];

  return new Set(texts.flatMap((text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1])));
};

describe("locale files", () => {
  const languages = Object.keys(LOCALES);
  const englishKeys = Object.keys(LOCALES[FALLBACK_LANGUAGE]).sort();

  describe("GIVEN every bundled language and the sorted English keys", () => {
    const expectedKeys = englishKeys;

    describe("WHEN the sorted keys of each language are collected", () => {
      let keysByLanguage;

      before(() => {
        keysByLanguage = languages.map((language) => ({ language, keys: Object.keys(LOCALES[language]).sort() }));
      });

      it("THEN every language defines exactly the English keys", () => {
        for (const { language, keys } of keysByLanguage) {
          assert.deepEqual(keys, expectedKeys, `${language} keys differ from en`);
        }
      });
    });
  });

  describe("GIVEN every bundled language and every English message key", () => {
    const pairs = languages.flatMap((language) => englishKeys.map((key) => ({ language, key })));

    describe("WHEN the placeholders of each message are compared with the English ones", () => {
      let comparisons;

      before(() => {
        comparisons = pairs.map(({ language, key }) => ({
          label: `${language}.${key}`,
          actual: placeholders(LOCALES[language][key]),
          expected: placeholders(LOCALES[FALLBACK_LANGUAGE][key]),
        }));
      });

      it("THEN each translation keeps exactly the English placeholders", () => {
        for (const { label, actual, expected } of comparisons) {
          assert.deepEqual(actual, expected, `${label} placeholders differ`);
        }
      });
    });
  });

  describe("GIVEN every message of every bundled language", () => {
    const entries = languages.flatMap((language) =>
      Object.entries(LOCALES[language]).map(([key, message]) => ({ label: `${language}.${key}`, message })),
    );

    describe("WHEN the plural messages are picked out", () => {
      let pluralMessages;

      before(() => {
        pluralMessages = entries.filter(({ message }) => typeof message === "object");
      });

      it("THEN each plural message has an `other` form", () => {
        for (const { label, message } of pluralMessages) {
          assert.ok(message.other, `${label} has no other form`);
        }
      });
    });
  });
});

describe("translate", () => {
  describe("GIVEN the English risk message and a score", () => {
    const params = { score: 42 };

    describe("WHEN the message is translated", () => {
      let result;

      before(() => {
        result = translate("en", "risk", params);
      });

      it("THEN the score fills its placeholder", () => {
        assert.equal(result, "Risk 42%");
      });
    });
  });

  describe("GIVEN the Polish issue counter", () => {
    const counter = (count) => translate("pl", "issues_count", { count });

    describe("WHEN it is translated for one, few, many and a compound few count", () => {
      let one;
      let few;
      let many;
      let compoundFew;

      before(() => {
        [one, few, many, compoundFew] = [counter(1), counter(3), counter(5), counter(22)];
      });

      it("THEN one count gets the singular form", () => {
        assert.equal(one, "1 problem");
      });

      it("THEN a few count gets the few form", () => {
        assert.equal(few, "3 problemy");
      });

      it("THEN a many count gets the many form", () => {
        assert.equal(many, "5 problemów");
      });

      it("THEN a compound few count gets the few form", () => {
        assert.equal(compoundFew, "22 problemy");
      });
    });
  });

  describe("GIVEN the English node counter", () => {
    const counter = (count) => translate("en", "nodes_count", { count });

    describe("WHEN it is translated for one and zero nodes", () => {
      let one;
      let zero;

      before(() => {
        [one, zero] = [counter(1), counter(0)];
      });

      it("THEN one is singular", () => {
        assert.equal(one, "1 node");
      });

      it("THEN zero is plural", () => {
        assert.equal(zero, "0 nodes");
      });
    });
  });

  describe("GIVEN an unsupported language code", () => {
    const language = "xx";

    describe("WHEN a known key is translated", () => {
      let result;

      before(() => {
        result = translate(language, "tab_graph");
      });

      it("THEN the English text is used", () => {
        assert.equal(result, "Graph");
      });
    });
  });

  describe("GIVEN a key no locale defines", () => {
    const key = "not_a_key";

    describe("WHEN the key is translated", () => {
      let result;

      before(() => {
        result = translate("en", key);
      });

      it("THEN the key itself is returned", () => {
        assert.equal(result, "not_a_key");
      });
    });
  });

  describe("GIVEN the risk message without a score", () => {
    const key = "risk";

    describe("WHEN the message is translated", () => {
      let result;

      before(() => {
        result = translate("en", key);
      });

      it("THEN the unknown placeholder stays visible in the text", () => {
        assert.equal(result, "Risk {score}%");
      });
    });
  });
});

describe("resolveLanguage", () => {
  describe("GIVEN a Polish locale setting and an English frontend language", () => {
    const hass = { locale: { language: "pl" }, language: "en" };

    describe("WHEN the language is resolved", () => {
      let result;

      before(() => {
        result = resolveLanguage(hass, []);
      });

      it("THEN the user's locale setting wins over the frontend language", () => {
        assert.equal(result, "pl");
      });
    });
  });

  describe("GIVEN a regional language tag", () => {
    const hass = { language: "pl-PL" };

    describe("WHEN the language is resolved", () => {
      let result;

      before(() => {
        result = resolveLanguage(hass, []);
      });

      it("THEN only the base language remains", () => {
        assert.equal(result, "pl");
      });
    });
  });

  describe("GIVEN an unsupported language and a missing hass object, with no browser languages", () => {
    const unsupported = { language: "de" };
    const missing = null;

    describe("WHEN each language is resolved", () => {
      let fromUnsupported;
      let fromMissing;

      before(() => {
        fromUnsupported = resolveLanguage(unsupported, []);
        fromMissing = resolveLanguage(missing, []);
      });

      it("THEN the unsupported language falls back to English", () => {
        assert.equal(fromUnsupported, "en");
      });

      it("THEN the missing hass object falls back to English", () => {
        assert.equal(fromMissing, "en");
      });
    });
  });

  describe("GIVEN a Home Assistant language that is not bundled and a browser preferring German, then Polish", () => {
    const hass = { language: "de" };
    const browserLanguages = ["de-DE", "pl-PL", "en"];

    describe("WHEN the language is resolved", () => {
      let result;

      before(() => {
        result = resolveLanguage(hass, browserLanguages);
      });

      it("THEN the first bundled browser language is used", () => {
        assert.equal(result, "pl");
      });
    });
  });

  describe("GIVEN no hass object yet and a Polish browser", () => {
    const browserLanguages = ["pl"];

    describe("WHEN the language is resolved", () => {
      let result;

      before(() => {
        result = resolveLanguage(null, browserLanguages);
      });

      it("THEN the browser language is used", () => {
        assert.equal(result, "pl");
      });
    });
  });

  describe("GIVEN English chosen in Home Assistant and a Polish browser", () => {
    const hass = { language: "en" };
    const browserLanguages = ["pl-PL"];

    describe("WHEN the language is resolved", () => {
      let result;

      before(() => {
        result = resolveLanguage(hass, browserLanguages);
      });

      it("THEN the Home Assistant choice wins", () => {
        assert.equal(result, "en");
      });
    });
  });
});
