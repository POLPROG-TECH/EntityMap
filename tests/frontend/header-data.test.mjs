import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { relativeTime, worstSeverity } from "../../custom_components/entitymap/frontend/panel/header-data.js";

const NOW = Date.parse("2026-10-27T12:00:00Z");

describe("relativeTime", () => {
  describe("GIVEN a scan thirty seconds ago", () => {
    const scannedAt = "2026-10-27T11:59:30Z";

    describe("WHEN its age is described in English", () => {
      let result;

      before(() => {
        result = relativeTime(scannedAt, NOW, "en");
      });

      it("THEN it reads as now", () => {
        assert.equal(result, "now");
      });
    });
  });

  describe("GIVEN scans minutes, hours and a day ago", () => {
    const minutesAgo = "2026-10-27T11:54:10Z";
    const hoursAgo = "2026-10-27T09:30:00Z";
    const dayAgo = "2026-10-26T11:00:00Z";

    describe("WHEN their ages are described in English", () => {
      let minutes;
      let hours;
      let days;

      before(() => {
        minutes = relativeTime(minutesAgo, NOW, "en");
        hours = relativeTime(hoursAgo, NOW, "en");
        days = relativeTime(dayAgo, NOW, "en");
      });

      it("THEN the minutes-old scan rounds down to whole minutes", () => {
        assert.equal(minutes, "5 minutes ago");
      });

      it("THEN the hours-old scan rounds down to whole hours", () => {
        assert.equal(hours, "2 hours ago");
      });

      it("THEN the day-old scan reads as yesterday", () => {
        assert.equal(days, "yesterday");
      });
    });
  });

  describe("GIVEN a scan five minutes ago", () => {
    const scannedAt = "2026-10-27T11:55:00Z";

    describe("WHEN its age is described in Polish", () => {
      let result;

      before(() => {
        result = relativeTime(scannedAt, NOW, "pl");
      });

      it("THEN the text speaks the panel language", () => {
        assert.equal(result, "5 minut temu");
      });
    });
  });

  describe("GIVEN a scan time five minutes in the future", () => {
    const scannedAt = "2026-10-27T12:05:00Z";

    describe("WHEN its age is described", () => {
      let result;

      before(() => {
        result = relativeTime(scannedAt, NOW, "en");
      });

      it("THEN it reads as now instead of a future time", () => {
        assert.equal(result, "now");
      });
    });
  });

  describe("GIVEN a timestamp that cannot be parsed", () => {
    const scannedAt = "nope";

    describe("WHEN its age is described", () => {
      let result;

      before(() => {
        result = relativeTime(scannedAt, NOW, "en");
      });

      it("THEN there is no text", () => {
        assert.equal(result, null);
      });
    });
  });
});

describe("worstSeverity", () => {
  describe("GIVEN low, high and medium findings", () => {
    const findings = [{ severity: "low" }, { severity: "high" }, { severity: "medium" }];

    describe("WHEN the worst severity is picked", () => {
      let result;

      before(() => {
        result = worstSeverity(findings);
      });

      it("THEN it is the most severe level present, high", () => {
        assert.equal(result, "high");
      });
    });
  });

  describe("GIVEN an empty list and no list at all", () => {
    const emptyFindings = [];
    const missingFindings = undefined;

    describe("WHEN the worst severity is picked from each", () => {
      let empty;
      let missing;

      before(() => {
        empty = worstSeverity(emptyFindings);
        missing = worstSeverity(missingFindings);
      });

      it("THEN the empty list has no severity", () => {
        assert.equal(empty, null);
      });

      it("THEN the missing list has no severity", () => {
        assert.equal(missing, null);
      });
    });
  });
});
