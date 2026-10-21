import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";
import pl from "@/messages/pl.json";

// AC-9: brakujący klucz w jednym katalogu ma psuć ten test, nie ciszej
// wyrenderować się jako pusty/nieprzetłumaczony string.
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, nested]) =>
    flattenKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

// "few" i "many" to kategorie liczby mnogiej tylko polskiego (CLDR); pozostałe języki mają "one" i "other",
// a część katalogów trzyma też te dwie końcówki, więc porównujemy zestawy bez nich.
const withoutPolishOnlyPlurals = (keys: string[]) => keys.filter((key) => !/\.(few|many)$/.test(key));

describe("message catalog consistency", () => {
  const plKeys = withoutPolishOnlyPlurals(flattenKeys(pl)).sort();
  const enKeys = withoutPolishOnlyPlurals(flattenKeys(en)).sort();
  const nlKeys = withoutPolishOnlyPlurals(flattenKeys(nl)).sort();
  const deKeys = withoutPolishOnlyPlurals(flattenKeys(de)).sort();

  it("en.json has exactly the same keys as pl.json", () => {
    expect(enKeys).toEqual(plKeys);
  });

  it("nl.json has exactly the same keys as pl.json", () => {
    expect(nlKeys).toEqual(plKeys);
  });

  it("de.json has exactly the same keys as pl.json", () => {
    expect(deKeys).toEqual(plKeys);
  });
});
