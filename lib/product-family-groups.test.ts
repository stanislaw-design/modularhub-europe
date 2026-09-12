import { describe, expect, it } from "vitest";
import { FAMILY_GROUPS, resolveFamilies, resolveFamilyGroup, type FamilyFilterValue } from "./product-family-groups";

// spec 0035 AC-4: FAMILY_GROUPS is the single typed place deciding which real
// families belong to which group; every other module (SearchCard, FamilyTabs,
// results-filters.ts, getProjects()) reads through resolveFamilies/
// resolveFamilyGroup instead of holding its own copy of this list.
describe("FAMILY_GROUPS", () => {
  it("maps dom to itself as a one-member group", () => {
    expect(FAMILY_GROUPS.dom).toEqual(["dom"]);
  });

  it("maps wiecej-niz-dom to spa-modulowe and pergola, in that order", () => {
    expect(FAMILY_GROUPS["wiecej-niz-dom"]).toEqual(["spa-modulowe", "pergola"]);
  });
});

describe("resolveFamilies", () => {
  it("expands the wiecej-niz-dom sentinel to every family in its group (AC-2, AC-4)", () => {
    expect(resolveFamilies("wiecej-niz-dom")).toEqual(["spa-modulowe", "pergola"]);
  });

  it("returns dom unchanged, wrapped in a single-element array", () => {
    expect(resolveFamilies("dom")).toEqual(["dom"]);
  });

  it("returns spa-modulowe unchanged, wrapped in a single-element array", () => {
    expect(resolveFamilies("spa-modulowe")).toEqual(["spa-modulowe"]);
  });

  it("returns pergola unchanged, wrapped in a single-element array", () => {
    expect(resolveFamilies("pergola")).toEqual(["pergola"]);
  });

  it("returns a fresh array each call, so a caller mutating the result can't corrupt FAMILY_GROUPS", () => {
    const first = resolveFamilies("wiecej-niz-dom");
    first.push("dom" as never);
    expect(resolveFamilies("wiecej-niz-dom")).toEqual(["spa-modulowe", "pergola"]);
  });
});

describe("resolveFamilyGroup", () => {
  it("resolves dom to the dom group", () => {
    expect(resolveFamilyGroup("dom")).toBe("dom");
  });

  it("resolves spa-modulowe to the wiecej-niz-dom group", () => {
    expect(resolveFamilyGroup("spa-modulowe")).toBe("wiecej-niz-dom");
  });

  it("resolves pergola to the wiecej-niz-dom group", () => {
    expect(resolveFamilyGroup("pergola")).toBe("wiecej-niz-dom");
  });

  it("resolves the wiecej-niz-dom sentinel to itself", () => {
    expect(resolveFamilyGroup("wiecej-niz-dom")).toBe("wiecej-niz-dom");
  });

  it("falls back to the dom group for a value outside FAMILY_GROUPS (defensive branch)", () => {
    expect(resolveFamilyGroup("nieznana-wartosc" as FamilyFilterValue)).toBe("dom");
  });
});
