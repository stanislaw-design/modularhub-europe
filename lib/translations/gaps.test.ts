import { describe, expect, it } from "vitest";
import { findTranslationGaps, formatTranslationGaps, layoutTranslationItems } from "./gaps";

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

describe("layoutTranslationItems (spec 0069 AC-7)", () => {
  const rooms = [
    { id: "r1", name: "Salon", areaM2: 30 },
    { id: "r2", name: "Garderoba", areaM2: 4 },
  ];
  const complete = { description: "Desc", roomLayout: [{ id: "r1", name: "Living" }, { id: "r2", name: "Closet" }] };

  it("reports nothing for a fully translated layout", () => {
    const items = layoutTranslationItems({
      ref: "Bingo A / Wersja 2",
      description: "Opis",
      roomLayout: rooms,
      translations: { en: complete, de: complete, nl: complete },
    });
    expect(findTranslationGaps(items)).toEqual([]);
  });

  it("reports a missing description and a room name matched by id, per locale", () => {
    const items = layoutTranslationItems({
      ref: "Bingo A / Wersja 2",
      description: "Opis",
      roomLayout: rooms,
      translations: {
        en: complete,
        de: { description: "", roomLayout: [{ id: "r1", name: "Wohnzimmer" }] },
      },
    });
    const gaps = findTranslationGaps(items).map((g) => `${g.locale}:${g.field}:${g.source}`);
    expect(gaps).toEqual([
      "de:description:Opis",
      "nl:description:Opis",
      "nl:room_layout.name:Salon",
      "de:room_layout.name:Garderoba",
      "nl:room_layout.name:Garderoba",
    ]);
  });

  it("skips an empty description and tolerates a layout without rooms", () => {
    const items = layoutTranslationItems({ ref: "x", description: null, roomLayout: null, translations: {} });
    expect(findTranslationGaps(items)).toEqual([]);
  });
});
