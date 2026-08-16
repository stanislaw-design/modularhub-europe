import { describe, expect, it } from "vitest";
import { countries } from "./fixtures/countries";
import { getExportReadiness } from "./export-readiness";

describe("getExportReadiness", () => {
  it("returns exactly one entry per country in the countries fixture, no duplicates or gaps (AC-2)", async () => {
    const entries = await getExportReadiness();
    const entryCodes = entries.map((entry) => entry.countryCode).sort();
    const countryCodes = countries.map((country) => country.code).sort();

    expect(entryCodes).toEqual(countryCodes);
  });

  it("covers all three statuses at once, one country each (AC-3)", async () => {
    const entries = await getExportReadiness();
    const statuses = entries.map((entry) => entry.status).sort();

    expect(statuses).toEqual(["approved", "blocked", "conditional"]);
  });

  it("gives a conditional country at least two named gaps, and none to approved/blocked ones (AC-3, key invariant)", async () => {
    const entries = await getExportReadiness();

    for (const entry of entries) {
      if (entry.status === "conditional") {
        expect(entry.gaps.length).toBeGreaterThanOrEqual(2);
      } else {
        expect(entry.gaps).toEqual([]);
      }
    }
  });

  it("returns the same canonical data on every call, regardless of caller state (AC-3)", async () => {
    const first = await getExportReadiness();
    const second = await getExportReadiness();

    expect(second).toEqual(first);
  });
});
