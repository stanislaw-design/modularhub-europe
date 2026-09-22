import { describe, expect, it } from "vitest";
import { HOUSE_IMPORT_GOLDEN_CORPUS } from "./house-import-golden-corpus";

describe("HOUSE_IMPORT_GOLDEN_CORPUS", () => {
  it("contains the five supplied PDF cases", () => {
    expect(HOUSE_IMPORT_GOLDEN_CORPUS).toHaveLength(5);
    expect(new Set(HOUSE_IMPORT_GOLDEN_CORPUS.map((item) => item.filename)).size).toBe(5);
  });

  it("keeps every expected room plan separately addressable", () => {
    for (const item of HOUSE_IMPORT_GOLDEN_CORPUS) {
      const identities = item.roomPlans.map((plan) =>
        [plan.page, plan.floor, plan.layoutVersion ?? "default"].join(":"));
      expect(new Set(identities).size).toBe(identities.length);
      expect(item.roomPlans.every((plan) => plan.roomCount > 0)).toBe(true);
    }
  });

  it("uses only minimum prices unless a real upper bound exists", () => {
    for (const item of HOUSE_IMPORT_GOLDEN_CORPUS) {
      for (const variant of item.variants) {
        expect(variant.priceMaxPln).toBeNull();
        if (variant.priceMinPln !== null) {
          expect(item.ignoredAmountsPln).not.toContain(variant.priceMinPln);
        }
      }
    }
  });

  it("keeps named TREEVIA packages separate inside the developer standard", () => {
    const treeviaCases = HOUSE_IMPORT_GOLDEN_CORPUS.filter((item) =>
      item.filename.toLowerCase().includes("treevia"));

    for (const item of treeviaCases) {
      expect(item.variants.map((variant) => variant.label)).toEqual(["BASIC", "ALL-IN"]);
      expect(item.variants.every((variant) => variant.completionStandard === "deweloperski")).toBe(true);
    }
  });
});
