import { describe, expect, it } from "vitest";
import { findTranslationGaps, formatTranslationGaps } from "./gaps";

const full = { en: "a", de: "b", nl: "c" };

describe("findTranslationGaps (spec 0067 AC-8, AC-9)", () => {
  it("reports no gaps for a complete database", () => {
    expect(findTranslationGaps([{ entity: "producer", field: "description", ref: "P", source: "Opis", translations: full }])).toEqual([]);
  });

  it("reports a missing row, an empty string and a whitespace only translation per locale", () => {
    const gaps = findTranslationGaps([
      { entity: "producer", field: "description", ref: "P", source: "Opis", translations: { en: "x", de: "", nl: "   " } },
      { entity: "option", field: "label", ref: "O", source: "Kominek", translations: {} },
    ]);
    expect(gaps.map((g) => `${g.locale}:${g.entity}.${g.field}`)).toEqual([
      "de:producer.description",
      "nl:producer.description",
      "en:option.label",
      "de:option.label",
      "nl:option.label",
    ]);
  });

  it("never treats an empty or null source as a gap", () => {
    expect(
      findTranslationGaps([
        { entity: "producer", field: "showroom_visit_note", ref: "P", source: null, translations: {} },
        { entity: "producer", field: "description", ref: "P", source: "  ", translations: {} },
      ]),
    ).toEqual([]);
  });

  it("formats a summary and says so when nothing is missing", () => {
    expect(formatTranslationGaps([])).toContain("Brak braków");
    const text = formatTranslationGaps(findTranslationGaps([{ entity: "option", field: "label", ref: "Kominek", source: "Kominek", translations: {} }]));
    expect(text).toContain("Braki w tłumaczeniach: 3");
    expect(text).toContain("en | option.label: 1");
  });
});
