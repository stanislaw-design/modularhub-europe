import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";
import pl from "@/messages/pl.json";

// Spec 0070 AC-26: nowe teksty ekranów klienta, producenta i maili mają prawdziwe
// tłumaczenia w czterech językach. Test w lib/i18n/messages.test.ts pilnuje samych
// kluczy; ten dodaje, że wartość w en, de i nl nie jest pustym ani skopiowanym
// polskim tekstem. `npm run check:translations` dotyczy tylko tłumaczeń danych
// produktów w bazie i tego nie sprawdza.
const LARGE_ORDER_NAMESPACES = ["ProducerPanelCapacityPage", "ClientB2bDetailsForm", "LargeOrderTeamNewRequestEmail"];

function leaves(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") return [[prefix, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, nested]) => leaves(nested, prefix ? `${prefix}.${key}` : key));
}

function namespace(catalog: unknown, name: string): unknown {
  return (catalog as Record<string, unknown>)[name];
}

describe("spec 0070 message namespaces are translated, not copied", () => {
  for (const name of LARGE_ORDER_NAMESPACES) {
    for (const [locale, catalog] of [
      ["en", en],
      ["de", de],
      ["nl", nl],
    ] as const) {
      it(`${name} in ${locale} has no empty value and no leaf copied from Polish`, () => {
        const polish = new Map(leaves(namespace(pl, name)));
        const translated = leaves(namespace(catalog, name));

        expect(translated.length).toBeGreaterThan(0);
        for (const [path, value] of translated) {
          expect(value.trim(), `${locale}:${name}.${path}`).not.toBe("");
          expect(value, `${locale}:${name}.${path} equals the Polish text`).not.toBe(polish.get(path));
        }
      });
    }
  }

  it("ProducerPanelSidebar.capacity is translated in every language", () => {
    const get = (catalog: unknown) => (namespace(catalog, "ProducerPanelSidebar") as Record<string, string>).capacity;
    const polish = get(pl);
    expect(get(en)).not.toBe(polish);
    expect(get(de)).not.toBe(polish);
    expect(get(nl)).not.toBe(polish);
  });
});
