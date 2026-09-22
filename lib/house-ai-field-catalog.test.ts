import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";
import pl from "@/messages/pl.json";
import { HOUSE_AI_FIELD_CATALOG, HOUSE_AI_SCHEMA_VERSION } from "./house-ai-field-catalog";

describe("HOUSE_AI_FIELD_CATALOG", () => {
  it("is versioned and contains every supported house import area", () => {
    expect(HOUSE_AI_SCHEMA_VERSION).toBe("house-import-v1");
    const paths = HOUSE_AI_FIELD_CATALOG.map((field) => field.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(expect.arrayContaining([
      "product.name",
      "technical.heatSource",
      "logistics.minPlotWidthM",
      "rooms[].name",
      "variants[].priceMinCents",
      "variants[].costItems[].status",
      "variants[].timeline[].stageKey",
      "faq[].answer",
      "translations.{locale}.description",
    ]));
  });

  it("never allows generated values for prices, warranties or compliance", () => {
    const protectedPaths = HOUSE_AI_FIELD_CATALOG.filter((field) =>
      field.path.includes("price") || field.path.includes("Warranty") || field.path.startsWith("compliance."),
    );
    expect(protectedPaths.length).toBeGreaterThan(0);
    expect(protectedPaths.every((field) => !Array.from(field.allowedOrigins as readonly string[]).includes("generated"))).toBe(true);
  });

  it("has a localized label for every field in every supported language", () => {
    const messages = { pl, en, de, nl };
    const labelKeys = HOUSE_AI_FIELD_CATALOG.map((field) => field.labelKey);

    expect(new Set(labelKeys).size).toBe(labelKeys.length);
    for (const [locale, dictionary] of Object.entries(messages)) {
      for (const field of HOUSE_AI_FIELD_CATALOG) {
        expect(
          dictionary.HouseAiFieldReview.fieldLabels[field.labelKey],
          `${locale} is missing HouseAiFieldReview.fieldLabels.${field.labelKey}`,
        ).toEqual(expect.any(String));
      }
    }
  });
});
