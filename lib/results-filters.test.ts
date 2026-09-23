import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import {
  buildResultsHref,
  matchesResultsFilter,
  parseResultsSearchParams,
  resolveHeatSourceValues,
  sortResults,
  toggleFilterValue,
  type ResultsFilter,
} from "./results-filters";

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

  // spec 0026: heatSource/ventilation/energyClass/storeys, each cleaned independently (AC-1, AC-3).
  it("reads a valid heatSource, ventilation, energyClass, and storeys (AC-1)", () => {
    const filter = parseResultsSearchParams({
      heatSource: "gazowe",
      ventilation: "rekuperacja",
      energyClass: "A+",
      storeys: "parterowy",
    });
    expect(filter.heatSource).toBe("gazowe");
    expect(filter.ventilation).toBe("rekuperacja");
    expect(filter.energyClass).toBe("A+");
    expect(filter.storeys).toBe("parterowy");
  });

  it("reads the pompa-ciepla shorthand as a valid heatSource value (AC-2)", () => {
    const filter = parseResultsSearchParams({ heatSource: "pompa-ciepla" });
    expect(filter.heatSource).toBe("pompa-ciepla");
  });

  it.each(["nieznana-wartosc", "", "pompaciepla"])(
    "ignores an invalid heatSource %j instead of erroring (AC-3)",
    (heatSource) => {
      const filter = parseResultsSearchParams({ heatSource });
      expect(filter.heatSource).toBeUndefined();
    }
  );

  it("ignores an invalid ventilation independently of a valid heatSource (AC-3)", () => {
    const filter = parseResultsSearchParams({ heatSource: "gazowe", ventilation: "turbo" });
    expect(filter.heatSource).toBe("gazowe");
    expect(filter.ventilation).toBeUndefined();
  });

  it("ignores an invalid storeys value (only parterowy/pietrowy are valid) (AC-3)", () => {
    const filter = parseResultsSearchParams({ storeys: "3" });
    expect(filter.storeys).toBeUndefined();
  });

  it("ignores an energyClass given as an array (repeated query param) (AC-3)", () => {
    const filter = parseResultsSearchParams({ energyClass: ["A", "B"] });
    expect(filter.energyClass).toBeUndefined();
  });

  // spec 0026 AC-4: price behaves like size (closed threshold set, independent drop, reversed range drops both).
  it("reads a valid priceMin/priceMax pair from PRICE_THRESHOLDS (AC-4)", () => {
    const filter = parseResultsSearchParams({ priceMin: "150000", priceMax: "250000" });
    expect(filter.priceMin).toBe(150000);
    expect(filter.priceMax).toBe(250000);
  });

  it("ignores a priceMin value outside the closed threshold set (AC-4)", () => {
    const filter = parseResultsSearchParams({ priceMin: "200000" });
    expect(filter.priceMin).toBeUndefined();
  });

  it("drops both priceMin and priceMax when the range is reversed (AC-4)", () => {
    const filter = parseResultsSearchParams({ priceMin: "250000", priceMax: "50000" });
    expect(filter.priceMin).toBeUndefined();
    expect(filter.priceMax).toBeUndefined();
  });

  it("keeps an equal priceMin/priceMax pair (closed interval boundary) (AC-4)", () => {
    const filter = parseResultsSearchParams({ priceMin: "100000", priceMax: "100000" });
    expect(filter.priceMin).toBe(100000);
    expect(filter.priceMax).toBe(100000);
  });

  // spec 0026/0039: spaSubcategory/containerSubcategory are parsed independently of family (AC-8);
  // getProjects() decides whether they apply, not the parser (see lib/data/projects.ts).
  it("reads a valid spaSubcategory and containerSubcategory", () => {
    const filter = parseResultsSearchParams({ spaSubcategory: "jacuzzi", containerSubcategory: "mieszkalne" });
    expect(filter.spaSubcategory).toBe("jacuzzi");
    expect(filter.containerSubcategory).toBe("mieszkalne");
  });

  it("ignores an invalid spaSubcategory", () => {
    const filter = parseResultsSearchParams({ spaSubcategory: "hot-tub" });
    expect(filter.spaSubcategory).toBeUndefined();
  });

  // spec 0026 AC-5: sort is one of the four fixed options, else dropped (default sort applies later).
  it.each(["price-asc", "price-desc", "size-asc", "size-desc"] as const)("reads a valid sort value %j (AC-5)", (sort) => {
    const filter = parseResultsSearchParams({ sort });
    expect(filter.sort).toBe(sort);
  });

  it("ignores an invalid sort value (AC-5)", () => {
    const filter = parseResultsSearchParams({ sort: "cheapest-first" });
    expect(filter.sort).toBeUndefined();
  });

  // spec 0026 AC-6: q is trimmed; empty or whitespace only collapses to undefined (no search filter).
  it("reads and trims a q value", () => {
    const filter = parseResultsSearchParams({ q: "  Baltyk  " });
    expect(filter.q).toBe("Baltyk");
  });

  it.each(["", "   ", "\t\n"])("treats a blank q %j as no search filter (AC-6)", (q) => {
    const filter = parseResultsSearchParams({ q });
    expect(filter.q).toBeUndefined();
  });

  // spec 0035 AC-2, AC-7: the "wiecej-niz-dom" group sentinel is a valid family
  // value; any other unknown value still falls back to "dom" like today.
  it("reads the wiecej-niz-dom group sentinel as a valid family (AC-2)", () => {
    const filter = parseResultsSearchParams({ family: "wiecej-niz-dom" });
    expect(filter.family).toBe("wiecej-niz-dom");
  });

  it("falls back to dom for an unknown family value (AC-7)", () => {
    const filter = parseResultsSearchParams({ family: "nieznana-wartosc" });
    expect(filter.family).toBe("dom");
  });

  it("falls back to dom when family is given as an array (repeated query param) (AC-7)", () => {
    const filter = parseResultsSearchParams({ family: ["dom", "wiecej-niz-dom"] });
    expect(filter.family).toBe("dom");
  });
});

describe("resolveHeatSourceValues", () => {
  it("expands the pompa-ciepla shorthand to both heat-pump subtypes (AC-2)", () => {
    expect(resolveHeatSourceValues("pompa-ciepla")).toEqual([
      "pompa-ciepla-powietrze-woda",
      "pompa-ciepla-grunt-woda",
    ]);
  });

  it("returns any other value unchanged, wrapped in a single-element array", () => {
    expect(resolveHeatSourceValues("gazowe")).toEqual(["gazowe"]);
  });
});

describe("toggleFilterValue", () => {
  const baseFilter: ResultsFilter = { family: "dom" };

  it("sets the value when the dimension is not yet active", () => {
    const result = toggleFilterValue(baseFilter, "heatSource", "pompa-ciepla");
    expect(result.heatSource).toBe("pompa-ciepla");
  });

  it("clears the value when clicking the same chip again (spec 0026 AC-7 toggle)", () => {
    const active: ResultsFilter = { ...baseFilter, heatSource: "pompa-ciepla" };
    const result = toggleFilterValue(active, "heatSource", "pompa-ciepla");
    expect(result.heatSource).toBeUndefined();
  });

  it("replaces the value when switching to a different value of the same dimension", () => {
    const active: ResultsFilter = { ...baseFilter, storeys: "parterowy" };
    const result = toggleFilterValue(active, "storeys", "pietrowy");
    expect(result.storeys).toBe("pietrowy");
  });

  it("leaves every other filter field untouched", () => {
    const active: ResultsFilter = { ...baseFilter, sort: "price-asc", q: "Baltyk", countryCode: "DE" };
    const result = toggleFilterValue(active, "ventilation", "rekuperacja");
    expect(result).toEqual({ ...active, ventilation: "rekuperacja" });
  });
});

describe("buildResultsHref", () => {
  it("builds a bare URL when no filter is active", () => {
    expect(buildResultsHref("pl", { family: "dom" })).toBe("/pl/results");
  });

  it("serializes every filter field onto the query string (spec 0026 AC-1, AC-10)", () => {
    const href = buildResultsHref("pl", {
      family: "spa-modulowe",
      countryCode: "DE",
      sizeMin: 50,
      sizeMax: 100,
      heatSource: "gazowe",
      ventilation: "rekuperacja",
      energyClass: "A",
      storeys: "parterowy",
      priceMin: 50000,
      priceMax: 100000,
      spaSubcategory: "sauna",
      sort: "price-asc",
      q: "Baltyk",
    });
    const url = new URL(href, "http://example.test");
    expect(url.pathname).toBe("/pl/results");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      family: "spa-modulowe",
      country: "DE",
      sizeMin: "50",
      sizeMax: "100",
      heatSource: "gazowe",
      ventilation: "rekuperacja",
      energyClass: "A",
      storeys: "parterowy",
      priceMin: "50000",
      priceMax: "100000",
      spaSubcategory: "sauna",
      sort: "price-asc",
      q: "Baltyk",
    });
  });

  it("omits family=dom from the query string (the default, spec 0023 AC-4)", () => {
    expect(buildResultsHref("pl", { family: "dom" })).not.toContain("family=");
  });

  it("serializes the wiecej-niz-dom group sentinel (spec 0035 AC-2)", () => {
    expect(buildResultsHref("pl", { family: "wiecej-niz-dom" })).toContain("family=wiecej-niz-dom");
  });
});

describe("matchesResultsFilter", () => {
  // spec 0035 AC-2, AC-4: filter.family is resolved through FAMILY_GROUPS, so
  // "wiecej-niz-dom" matches every real family in that group, not just itself.
  it("matches a spa-modulowe product against the wiecej-niz-dom group filter", () => {
    const filter: ResultsFilter = { family: "wiecej-niz-dom" };
    expect(matchesResultsFilter(80, undefined, filter, "spa-modulowe")).toBe(true);
  });

  it("matches a kontenery-modulowe product against the wiecej-niz-dom group filter", () => {
    const filter: ResultsFilter = { family: "wiecej-niz-dom" };
    expect(matchesResultsFilter(80, undefined, filter, "kontenery-modulowe")).toBe(true);
  });

  it("does not match a dom product against the wiecej-niz-dom group filter", () => {
    const filter: ResultsFilter = { family: "wiecej-niz-dom" };
    expect(matchesResultsFilter(80, undefined, filter, "dom")).toBe(false);
  });

  it("still matches a real family against itself, unaffected by the group sentinel", () => {
    const filter: ResultsFilter = { family: "spa-modulowe" };
    expect(matchesResultsFilter(80, undefined, filter, "spa-modulowe")).toBe(true);
    expect(matchesResultsFilter(80, undefined, filter, "kontenery-modulowe")).toBe(false);
  });

  it("still enforces size bounds within a matching family", () => {
    const filter: ResultsFilter = { family: "dom", sizeMin: 100 };
    expect(matchesResultsFilter(80, undefined, filter, "dom")).toBe(false);
    expect(matchesResultsFilter(120, undefined, filter, "dom")).toBe(true);
  });
});

describe("sortResults", () => {
  const cheap = createMockProject({ id: "cheap", priceMin: 50000, floorAreaM2: 40, featured: false });
  const mid = createMockProject({ id: "mid", priceMin: 100000, floorAreaM2: 90, featured: false });
  const expensiveFeatured = createMockProject({
    id: "expensive-featured",
    priceMin: 200000,
    floorAreaM2: 60,
    featured: true,
  });

  it("sorts ascending by price for sort=price-asc (AC-5)", () => {
    const result = sortResults([mid, cheap, expensiveFeatured], "price-asc");
    expect(result.map((p) => p.id)).toEqual(["cheap", "mid", "expensive-featured"]);
  });

  it("sorts descending by price for sort=price-desc (AC-5)", () => {
    const result = sortResults([cheap, mid, expensiveFeatured], "price-desc");
    expect(result.map((p) => p.id)).toEqual(["expensive-featured", "mid", "cheap"]);
  });

  it("sorts ascending by floor area for sort=size-asc (AC-5)", () => {
    const result = sortResults([mid, cheap, expensiveFeatured], "size-asc");
    expect(result.map((p) => p.id)).toEqual(["cheap", "expensive-featured", "mid"]);
  });

  it("sorts descending by floor area for sort=size-desc (AC-5)", () => {
    const result = sortResults([cheap, mid, expensiveFeatured], "size-desc");
    expect(result.map((p) => p.id)).toEqual(["mid", "expensive-featured", "cheap"]);
  });

  it("falls back to featured-first-then-price-ascending when sort is absent (default, spec 0016 AC-11)", () => {
    const result = sortResults([mid, cheap, expensiveFeatured]);
    expect(result.map((p) => p.id)).toEqual(["expensive-featured", "cheap", "mid"]);
  });

  it("falls back to the default order when sort is an unrecognized value", () => {
    // @ts-expect-error deliberately passing an invalid sort to prove the runtime fallback
    const result = sortResults([mid, cheap, expensiveFeatured], "cheapest");
    expect(result.map((p) => p.id)).toEqual(["expensive-featured", "cheap", "mid"]);
  });

  it("does not mutate the input array", () => {
    const input = [mid, cheap];
    const result = sortResults(input, "price-asc");
    expect(input).toEqual([mid, cheap]);
    expect(result).not.toBe(input);
  });

  // Spec 0050 AC-37: priceMin is 0 (not "no price"), so it would otherwise
  // sort as the cheapest item, distorting other products' price range.
  const onRequest = createMockProject({
    id: "on-request",
    priceMin: 0,
    floorAreaM2: 70,
    featured: false,
    priceOnRequest: true,
  });

  it("always sorts priceOnRequest projects last for price-asc (AC-37)", () => {
    const result = sortResults([onRequest, mid, cheap], "price-asc");
    expect(result.map((p) => p.id)).toEqual(["cheap", "mid", "on-request"]);
  });

  it("always sorts priceOnRequest projects last for price-desc, not first (AC-37)", () => {
    const result = sortResults([onRequest, cheap, mid], "price-desc");
    expect(result.map((p) => p.id)).toEqual(["mid", "cheap", "on-request"]);
  });

  it("keeps priceOnRequest projects last even in the default featured-then-price order (AC-37)", () => {
    const result = sortResults([onRequest, mid, cheap], undefined);
    expect(result.map((p) => p.id)).toEqual(["cheap", "mid", "on-request"]);
  });
});
