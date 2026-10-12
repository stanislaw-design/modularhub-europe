import { describe, expect, it } from "vitest";
import {
  SAUNA_PRICE_RANGES,
  buildSaunaHref,
  hasActiveSaunaFilter,
  parseSaunaSearchParams,
} from "./sauna-filters";

const PRODUCER_ID = "2b6b6c2e-9e2a-4e3a-9a1a-2b7a6c5e4d3c";

describe("parseSaunaSearchParams (spec 0068)", () => {
  it("returns an empty filter for no params", () => {
    expect(hasActiveSaunaFilter(parseSaunaSearchParams({}))).toBe(false);
  });

  it("parses every valid field (AC-7, AC-8, AC-9, AC-10)", () => {
    expect(
      parseSaunaSearchParams({
        seatingMin: "4",
        priceMin: "5000",
        priceMax: "15000",
        producer: PRODUCER_ID,
        sort: "price-desc",
      }),
    ).toEqual({ seatingMin: 4, priceMin: 5000, priceMax: 15000, producer: PRODUCER_ID, sort: "price-desc" });
  });

  it("silently drops invalid values, never throws (AC-10)", () => {
    const filter = parseSaunaSearchParams({
      seatingMin: "abc",
      priceMin: "99",
      producer: "abc",
      sort: "size-asc",
    });
    expect(hasActiveSaunaFilter(filter)).toBe(false);
  });

  it("drops a seatingMin outside the threshold scale", () => {
    expect(parseSaunaSearchParams({ seatingMin: "3" }).seatingMin).toBeUndefined();
  });

  it("drops both prices when the pair is reversed (AC-8)", () => {
    const filter = parseSaunaSearchParams({ priceMin: "15000", priceMax: "5000" });
    expect(filter.priceMin).toBeUndefined();
    expect(filter.priceMax).toBeUndefined();
  });

  it("ignores repeated params given as arrays", () => {
    expect(parseSaunaSearchParams({ seatingMin: ["4", "6"], producer: [PRODUCER_ID] })).toEqual({
      seatingMin: undefined,
      priceMin: undefined,
      priceMax: undefined,
      producer: undefined,
      sort: undefined,
    });
  });
});

describe("buildSaunaHref", () => {
  it("returns the bare category URL for an empty filter", () => {
    expect(buildSaunaHref("pl")).toBe("/pl/sauna");
  });

  it("serializes every set field", () => {
    expect(buildSaunaHref("de", { seatingMin: 6, priceMax: 10000, producer: PRODUCER_ID, sort: "price-asc" })).toBe(
      `/de/sauna?seatingMin=6&priceMax=10000&producer=${PRODUCER_ID}&sort=price-asc`,
    );
  });

  it("round trips through parseSaunaSearchParams", () => {
    const filter = { seatingMin: 2 as const, priceMin: 10000 as const, priceMax: 25000 as const };
    const query = Object.fromEntries(new URL(`http://x${buildSaunaHref("pl", filter)}`).searchParams);
    expect(parseSaunaSearchParams(query)).toMatchObject(filter);
  });
});

describe("SAUNA_PRICE_RANGES", () => {
  it("covers the whole scale with open ends and no gaps (AC-8)", () => {
    expect(SAUNA_PRICE_RANGES).toEqual([
      { priceMax: 5000 },
      { priceMin: 5000, priceMax: 10000 },
      { priceMin: 10000, priceMax: 15000 },
      { priceMin: 15000, priceMax: 25000 },
      { priceMin: 25000 },
    ]);
  });
});
