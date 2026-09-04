import { describe, expect, it } from "vitest";
import { parseResultsSearchParams } from "./results-filters";

describe("parseResultsSearchParams", () => {
  it("reads a valid country and a valid size range (AC-1)", () => {
    const filter = parseResultsSearchParams({ country: "DE", sizeMin: "50", sizeMax: "100" });
    expect(filter).toEqual({ countryCode: "DE", sizeMin: 50, sizeMax: 100, family: "dom" });
  });

  it("returns an empty filter when no params are present (AC-3)", () => {
    const filter = parseResultsSearchParams({});
    expect(filter).toEqual({ countryCode: undefined, sizeMin: undefined, sizeMax: undefined, family: "dom" });
  });

  it.each(["FR", "US", "gb", ""])(
    "ignores an invalid country %j instead of erroring (AC-5)",
    (country) => {
      const filter = parseResultsSearchParams({ country, sizeMin: "50" });
      expect(filter.countryCode).toBeUndefined();
      expect(filter.sizeMin).toBe(50);
    }
  );

  it("ignores a country given as an array (repeated query param) (AC-5)", () => {
    const filter = parseResultsSearchParams({ country: ["PL", "DE"] });
    expect(filter.countryCode).toBeUndefined();
  });

  it.each(["75", "abc", "", "-50"])(
    "ignores an invalid sizeMin %j while leaving sizeMax alone (AC-6)",
    (sizeMin) => {
      const filter = parseResultsSearchParams({ sizeMin, sizeMax: "150" });
      expect(filter.sizeMin).toBeUndefined();
      expect(filter.sizeMax).toBe(150);
    }
  );

  it("ignores an invalid sizeMax while leaving sizeMin alone (AC-6)", () => {
    const filter = parseResultsSearchParams({ sizeMin: "50", sizeMax: "not-a-number" });
    expect(filter.sizeMin).toBe(50);
    expect(filter.sizeMax).toBeUndefined();
  });

  it("drops both sizeMin and sizeMax when the range is reversed (AC-6)", () => {
    const filter = parseResultsSearchParams({ sizeMin: "150", sizeMax: "50" });
    expect(filter.sizeMin).toBeUndefined();
    expect(filter.sizeMax).toBeUndefined();
  });

  it("keeps an equal sizeMin/sizeMax pair (closed interval boundary) (AC-6)", () => {
    const filter = parseResultsSearchParams({ sizeMin: "100", sizeMax: "100" });
    expect(filter.sizeMin).toBe(100);
    expect(filter.sizeMax).toBe(100);
  });

  it("drops an invalid country independently of a valid size range (AC-5, AC-6)", () => {
    const filter = parseResultsSearchParams({ country: "FR", sizeMin: "150", sizeMax: "50" });
    expect(filter).toEqual({ countryCode: undefined, sizeMin: undefined, sizeMax: undefined, family: "dom" });
  });
});
