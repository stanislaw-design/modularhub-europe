import { describe, expect, it } from "vitest";
import {
  buildVerifiedManufacturersHref,
  parseVerifiedManufacturersSearchParams,
} from "./verified-manufacturers-filters";

describe("parseVerifiedManufacturersSearchParams", () => {
  it("reads a valid size range (AC-19, AC-20, AC-21)", () => {
    const filter = parseVerifiedManufacturersSearchParams({ sizeMin: "50", sizeMax: "100" });
    expect(filter).toEqual({ sizeMin: 50, sizeMax: 100, q: undefined });
  });

  it("returns an empty filter when no params are present", () => {
    const filter = parseVerifiedManufacturersSearchParams({});
    expect(filter).toEqual({ sizeMin: undefined, sizeMax: undefined, q: undefined });
  });

  it("ignores the country param, it is not a filter here (spec 0082 AC-9)", () => {
    const filter = parseVerifiedManufacturersSearchParams({ country: "DE", sizeMin: "50" });
    expect(filter).toEqual({ sizeMin: 50, sizeMax: undefined, q: undefined });
  });

  it.each(["75", "abc", "", "-50"])("ignores an invalid sizeMin %j while leaving sizeMax alone", (sizeMin) => {
    const filter = parseVerifiedManufacturersSearchParams({ sizeMin, sizeMax: "150" });
    expect(filter.sizeMin).toBeUndefined();
    expect(filter.sizeMax).toBe(150);
  });

  it("drops both sizeMin and sizeMax when the range is reversed (AC-21)", () => {
    const filter = parseVerifiedManufacturersSearchParams({ sizeMin: "150", sizeMax: "50" });
    expect(filter.sizeMin).toBeUndefined();
    expect(filter.sizeMax).toBeUndefined();
  });

  it("keeps an equal sizeMin/sizeMax pair (closed interval boundary)", () => {
    const filter = parseVerifiedManufacturersSearchParams({ sizeMin: "100", sizeMax: "100" });
    expect(filter.sizeMin).toBe(100);
    expect(filter.sizeMax).toBe(100);
  });

  it("trims a keyword and drops it when whitespace-only (AC-22)", () => {
    expect(parseVerifiedManufacturersSearchParams({ q: "  Budman  " }).q).toBe("Budman");
    expect(parseVerifiedManufacturersSearchParams({ q: "   " }).q).toBeUndefined();
  });
});

describe("buildVerifiedManufacturersHref", () => {
  it("builds a bare href when the filter is empty", () => {
    expect(buildVerifiedManufacturersHref("pl", {})).toBe("/pl/verified-manufacturers");
  });

  it("serializes every field present on the filter (AC-19)", () => {
    expect(buildVerifiedManufacturersHref("pl", { sizeMin: 50, sizeMax: 100, q: "Budman" })).toBe(
      "/pl/verified-manufacturers?sizeMin=50&sizeMax=100&q=Budman"
    );
  });
});
