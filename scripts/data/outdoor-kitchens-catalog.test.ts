import { describe, expect, it } from "vitest";
import { getTechnicalSpecsSchema } from "../../lib/product-technical-specs";
import { slugifyProductName } from "../../lib/product-slug";
import {
  allTextsOf,
  KITCHENS,
  LOCALES,
  photoFilenameOf,
  technicalSpecsOf,
  translatedSpecsOf,
} from "./outdoor-kitchens-catalog";

const SUPPLIER_NAMES = /eleexa|smartboxy|kitchenboxy/i;

describe("outdoor kitchens catalog (spec 0086)", () => {
  it("has 4 WDH box kitchens and 6 ModularHub modular sets with unique keys and slugs", () => {
    expect(KITCHENS.filter((item) => item.producer === "wdh" && item.kitchenType === "box")).toHaveLength(4);
    expect(KITCHENS.filter((item) => item.producer === "brand" && item.kitchenType === "modular")).toHaveLength(6);
    expect(new Set(KITCHENS.map((item) => item.key)).size).toBe(10);
    expect(new Set(KITCHENS.map((item) => slugifyProductName(item.name.pl))).size).toBe(10);
  });

  it("passes the published outdoor kitchen schema for every product (AC-1)", () => {
    const schema = getTechnicalSpecsSchema("outdoor-kitchen", "published");
    for (const item of KITCHENS) {
      const result = schema.safeParse(technicalSpecsOf(item));
      expect(result.success, `${item.key}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it("keeps catalog prices and the island and colour surcharges (AC-2, AC-8)", () => {
    const price = Object.fromEntries(KITCHENS.map((item) => [item.key, item.priceEur]));
    expect(price).toEqual({
      "sky-kitchen-wood": 6500,
      "sky-kitchen-slide": 6500,
      "sky-kitchen-prestige": 7500,
      "sky-kitchen-prestige-set": 15600,
      "compact-240": 4554,
      "compact-320-marrone": 7328,
      "compact-360-z-lodowka": 6827,
      "premium-300": 7448,
      "premium-360": 8750,
      "premium-420": 10813,
    });
    const premium360 = KITCHENS.find((item) => item.key === "premium-360")!;
    const island = premium360.optionGroups[0].options.find((option) => option.key === "wyspa")!;
    expect(premium360.priceEur + island.priceEur!).toBe(10554);
    const compact240 = KITCHENS.find((item) => item.key === "compact-240")!;
    expect(compact240.optionGroups[0].options.find((option) => option.key === "azzurro")?.priceEur).toBe(326);
  });

  it("prices WDH add ons on request and gives single choice groups a free first option", () => {
    for (const item of KITCHENS) {
      for (const group of item.optionGroups) {
        if (item.producer === "wdh") expect(group.options.every((option) => option.priceEur === null)).toBe(true);
        if (group.selectionType === "single") expect(group.options[0].priceEur).toBe(0);
      }
    }
  });

  it("has every text in pl, en, de and nl with the same feature count", () => {
    for (const item of KITCHENS) {
      for (const text of allTextsOf(item)) expect(text.trim().length, item.key).toBeGreaterThan(0);
      for (const locale of LOCALES) {
        expect(item.standardFeatures[locale]).toHaveLength(item.standardFeatures.pl.length);
        expect(translatedSpecsOf(item, locale).specs.deliveryNote.value.trim()).not.toBe("");
      }
    }
  });

  it("never mentions the modular set supplier in any field, slug or R2 file name (AC-5)", () => {
    for (const item of KITCHENS) {
      const texts = [
        ...allTextsOf(item),
        slugifyProductName(item.name.pl),
        ...item.photos.map((_, index) => photoFilenameOf(item, index)),
      ];
      for (const text of texts) expect(text, item.key).not.toMatch(SUPPLIER_NAMES);
    }
  });

  it("uses at most 6 photos per product", () => {
    for (const item of KITCHENS) {
      expect(item.photos.length).toBeGreaterThan(0);
      expect(item.photos.length).toBeLessThanOrEqual(6);
    }
  });
});
