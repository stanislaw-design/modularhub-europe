import { describe, expect, it } from "vitest";
import {
  FAMILY_GROUPS,
  resolveFamilies,
  resolveFamilyGroup,
  resolveProductHref,
  type FamilyFilterValue,
} from "./product-family-groups";

// spec 0035 AC-4: FAMILY_GROUPS is the single typed place deciding which real
// families belong to which group; every other module (SearchCard, FamilyTabs,
// results-filters.ts, getProjects()) reads through resolveFamilies/
// resolveFamilyGroup instead of holding its own copy of this list.
describe("FAMILY_GROUPS", () => {
  it("maps dom to itself as a one-member group", () => {
    expect(FAMILY_GROUPS.dom).toEqual(["dom"]);
  });

  it("maps wiecej-niz-dom to spa-modulowe, kontenery-modulowe and outdoor-tv, in that order", () => {
    expect(FAMILY_GROUPS["wiecej-niz-dom"]).toEqual(["spa-modulowe", "kontenery-modulowe", "outdoor-tv"]);
  });
});

describe("resolveFamilies", () => {
  it("expands the wiecej-niz-dom sentinel to every family in its group (AC-2, AC-4)", () => {
    expect(resolveFamilies("wiecej-niz-dom")).toEqual(["spa-modulowe", "kontenery-modulowe", "outdoor-tv"]);
  });

  it("returns dom unchanged, wrapped in a single-element array", () => {
    expect(resolveFamilies("dom")).toEqual(["dom"]);
  });

  it("returns spa-modulowe unchanged, wrapped in a single-element array", () => {
    expect(resolveFamilies("spa-modulowe")).toEqual(["spa-modulowe"]);
  });

  it("returns kontenery-modulowe unchanged, wrapped in a single-element array", () => {
    expect(resolveFamilies("kontenery-modulowe")).toEqual(["kontenery-modulowe"]);
  });

  it("returns outdoor-tv unchanged, wrapped in a single-element array", () => {
    expect(resolveFamilies("outdoor-tv")).toEqual(["outdoor-tv"]);
  });

  it("returns a fresh array each call, so a caller mutating the result can't corrupt FAMILY_GROUPS", () => {
    const first = resolveFamilies("wiecej-niz-dom");
    first.push("dom" as never);
    expect(resolveFamilies("wiecej-niz-dom")).toEqual(["spa-modulowe", "kontenery-modulowe", "outdoor-tv"]);
  });
});

describe("resolveFamilyGroup", () => {
  it("resolves dom to the dom group", () => {
    expect(resolveFamilyGroup("dom")).toBe("dom");
  });

  it("resolves spa-modulowe to the wiecej-niz-dom group", () => {
    expect(resolveFamilyGroup("spa-modulowe")).toBe("wiecej-niz-dom");
  });

  it("resolves kontenery-modulowe to the wiecej-niz-dom group", () => {
    expect(resolveFamilyGroup("kontenery-modulowe")).toBe("wiecej-niz-dom");
  });

  it("resolves outdoor-tv to the wiecej-niz-dom group", () => {
    expect(resolveFamilyGroup("outdoor-tv")).toBe("wiecej-niz-dom");
  });

  it("resolves the wiecej-niz-dom sentinel to itself", () => {
    expect(resolveFamilyGroup("wiecej-niz-dom")).toBe("wiecej-niz-dom");
  });

  it("falls back to the dom group for a value outside FAMILY_GROUPS (defensive branch)", () => {
    expect(resolveFamilyGroup("nieznana-wartosc" as FamilyFilterValue)).toBe("dom");
  });
});

// spec 0058 AC-6: the single place every product link goes through, so a
// slug wins over the id everywhere at once.
describe("resolveProductHref", () => {
  it("uses the slug when the product has one", () => {
    expect(resolveProductHref("dom", "11111111-1111-1111-1111-111111111111", "pl", "pomerania-40")).toBe(
      "/pl/project/pomerania-40"
    );
  });

  it("falls back to the id when slug is null (AC-5)", () => {
    expect(resolveProductHref("dom", "11111111-1111-1111-1111-111111111111", "pl", null)).toBe(
      "/pl/project/11111111-1111-1111-1111-111111111111"
    );
  });

  it("falls back to the id when slug is omitted entirely", () => {
    expect(resolveProductHref("dom", "11111111-1111-1111-1111-111111111111", "pl")).toBe(
      "/pl/project/11111111-1111-1111-1111-111111111111"
    );
  });

  it("routes outdoor-tv to its own segment, slug and all (spec 0056 AC-5)", () => {
    expect(resolveProductHref("outdoor-tv", "22222222-2222-2222-2222-222222222222", "pl", "econo-lift")).toBe(
      "/pl/outdoor-tv/econo-lift"
    );
  });

  it("routes every non-outdoor-tv, non-sauna family to /project", () => {
    expect(resolveProductHref("spa-modulowe", "id", "pl", "sauna-18")).toBe("/pl/project/sauna-18");
    expect(resolveProductHref("kontenery-modulowe", "id", "pl", "bistro-24")).toBe("/pl/project/bistro-24");
  });

  // spec 0061 AC-3: routes to /sauna only for family spa-modulowe AND
  // subcategory sauna; jacuzzi/wellness-combo (and spa-modulowe with no
  // subcategory passed at all) stay on /project, zero regression.
  describe("spa-modulowe / sauna (spec 0061)", () => {
    it("routes spa-modulowe + sauna to its own segment", () => {
      expect(resolveProductHref("spa-modulowe", "id", "pl", "relax-550", "sauna")).toBe("/pl/sauna/relax-550");
    });

    it("keeps spa-modulowe + jacuzzi on /project (zero regression)", () => {
      expect(resolveProductHref("spa-modulowe", "id", "pl", "bubble-9", "jacuzzi")).toBe("/pl/project/bubble-9");
    });

    it("keeps spa-modulowe + wellness-combo on /project (zero regression)", () => {
      expect(resolveProductHref("spa-modulowe", "id", "pl", "combo-1", "wellness-combo")).toBe("/pl/project/combo-1");
    });

    it("falls back to /project when spaSubcategory is omitted (caller didn't read it from the record)", () => {
      expect(resolveProductHref("spa-modulowe", "id", "pl", "unknown-18")).toBe("/pl/project/unknown-18");
    });

    it("never routes a non-spa-modulowe family to /sauna even if sauna is passed by mistake", () => {
      expect(resolveProductHref("dom", "id", "pl", "pomerania-40", "sauna")).toBe("/pl/project/pomerania-40");
    });
  });

  it("carries the locale segment through unchanged", () => {
    expect(resolveProductHref("dom", "id", "en", "pomerania-40")).toBe("/en/project/pomerania-40");
  });
});
