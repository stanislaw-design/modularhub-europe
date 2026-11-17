import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/data/types";
import {
  buildOutdoorKitchenHref,
  filterOutdoorKitchens,
  hasActiveOutdoorKitchenFilter,
  parseOutdoorKitchenSearchParams,
} from "./outdoor-kitchen-filters";
import { splitOutdoorKitchenSections } from "./outdoor-kitchen-sections";

function kitchen(id: string, kitchenType: "box" | "modular", priceMin: number): Project {
  return {
    id,
    priceMin,
    priceOnRequest: false,
    outdoorKitchenTechnicalSpecs: { kitchenType } as Project["outdoorKitchenTechnicalSpecs"],
  } as Project;
}

const all = [
  kitchen("compact", "modular", 4554),
  kitchen("wood", "box", 6500),
  kitchen("premium-360", "modular", 8750),
  kitchen("set", "box", 15600),
];

describe("parseOutdoorKitchenSearchParams", () => {
  it("reads type, price range and sort", () => {
    expect(
      parseOutdoorKitchenSearchParams({ type: "box", priceMin: "5000", priceMax: "7500", sort: "price-desc" }),
    ).toEqual({
      type: "box",
      priceMin: 5000,
      priceMax: 7500,
      sort: "price-desc",
    });
  });

  it("drops unknown values and an inverted price pair silently", () => {
    expect(
      parseOutdoorKitchenSearchParams({ type: "island", priceMin: "10000", priceMax: "5000", sort: "name" }),
    ).toEqual({
      type: undefined,
      priceMin: undefined,
      priceMax: undefined,
      sort: undefined,
    });
    expect(parseOutdoorKitchenSearchParams({ priceMin: "1234" }).priceMin).toBeUndefined();
  });
});

describe("buildOutdoorKitchenHref and hasActiveOutdoorKitchenFilter", () => {
  it("round trips the filter through the URL", () => {
    const filter = { type: "modular" as const, priceMax: 7500 as const, sort: "price-asc" as const };
    const href = buildOutdoorKitchenHref("de", filter);
    expect(href).toBe("/de/outdoor-kitchen?type=modular&priceMax=7500&sort=price-asc");
    const params = Object.fromEntries(new URLSearchParams(href.split("?")[1]));
    expect(parseOutdoorKitchenSearchParams(params)).toEqual({ ...filter, priceMin: undefined });
  });

  it("builds the bare path without a filter", () => {
    expect(buildOutdoorKitchenHref("pl")).toBe("/pl/outdoor-kitchen");
    expect(hasActiveOutdoorKitchenFilter({})).toBe(false);
    expect(hasActiveOutdoorKitchenFilter({ sort: "price-desc" })).toBe(true);
  });
});

describe("filterOutdoorKitchens", () => {
  it("filters by kitchen type", () => {
    expect(filterOutdoorKitchens(all, { type: "box" }).map((p) => p.id)).toEqual(["wood", "set"]);
  });

  it("filters by price range with inclusive bounds", () => {
    expect(filterOutdoorKitchens(all, { priceMax: 5000 }).map((p) => p.id)).toEqual(["compact"]);
    expect(filterOutdoorKitchens(all, { priceMin: 5000, priceMax: 10000 }).map((p) => p.id)).toEqual([
      "wood",
      "premium-360",
    ]);
    expect(filterOutdoorKitchens(all, { priceMin: 10000 }).map((p) => p.id)).toEqual(["set"]);
  });

  it("sorts each section descending when asked", () => {
    const sections = splitOutdoorKitchenSections(all, "price-desc");
    expect(sections[0].projects.map((p) => p.id)).toEqual(["set", "wood"]);
    expect(sections[1].projects.map((p) => p.id)).toEqual(["premium-360", "compact"]);
  });
});
