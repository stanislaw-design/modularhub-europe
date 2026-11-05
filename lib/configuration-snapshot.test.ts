// Migawka konfiguracji w zapytaniu (spec 0081 AC-12): składana z identyfikatorów, złe id pomijane, cena "od" przy
// opcji na zapytanie, stylistyka nie zmienia ceny.
import { describe, expect, it } from "vitest";
import { composeConfigurationSnapshot, type SnapshotInput } from "./configuration-snapshot";

const now = new Date("2026-11-04T12:00:00.000Z");
const input: SnapshotInput = {
  variants: [{ id: "v1", label: "Pod klucz", priceMinCents: 4390000, priceOnRequest: false }],
  groups: [
    {
      name: "Klimatyzacja",
      options: [
        { id: "ac-none", label: "Bez", priceCents: 0, priceOnRequest: false, isDefault: true },
        { id: "ac-1", label: "1 split", priceCents: 124800, priceOnRequest: false, isDefault: false },
      ],
    },
    { name: "Kominek", options: [{ id: "koza", label: "Kominek", priceCents: null, priceOnRequest: true, isDefault: false }] },
  ],
  styles: [{ id: "s1", name: "Calm Stone" }],
  currency: "EUR",
  now,
};

describe("composeConfigurationSnapshot", () => {
  it("sumuje wariant i opcje, a stylistyka nie zmienia ceny", () => {
    const snapshot = composeConfigurationSnapshot(input, { variantId: "v1", optionIds: ["ac-1"], styleId: "s1" });
    expect(snapshot?.totalPriceCents).toBe(4390000 + 124800);
    expect(snapshot?.style).toEqual({ styleId: "s1", name: "Calm Stone" });
    expect(snapshot?.options).toEqual([{ optionId: "ac-1", groupName: "Klimatyzacja", label: "1 split", priceCents: 124800, priceOnRequest: false }]);
    expect(snapshot?.totalIsFrom).toBe(false);
    expect(snapshot?.capturedAt).toBe(now.toISOString());
  });

  it("pomija domyślną opcję grupy, bo to nie jest wybór klienta", () => {
    const snapshot = composeConfigurationSnapshot(input, { variantId: "v1", optionIds: ["ac-none"] });
    expect(snapshot?.options).toEqual([]);
  });

  it("pomija nieznane, cudze i usunięte identyfikatory bez błędu", () => {
    const snapshot = composeConfigurationSnapshot(input, { variantId: "obcy", optionIds: ["nie-ma", "ac-1"], styleId: "inny" });
    expect(snapshot?.variantId).toBeNull();
    expect(snapshot?.style).toBeNull();
    expect(snapshot?.options.map((o) => o.optionId)).toEqual(["ac-1"]);
    // Bez wybranego wariantu nie ma ceny bazowej, więc i sumy.
    expect(snapshot?.totalPriceCents).toBeNull();
  });

  it("opcja z ceną na zapytanie daje sumę od", () => {
    const snapshot = composeConfigurationSnapshot(input, { variantId: "v1", optionIds: ["ac-1", "koza"] });
    expect(snapshot?.totalIsFrom).toBe(true);
    expect(snapshot?.totalPriceCents).toBe(4390000 + 124800);
  });

  it("zwraca null, gdy po filtrowaniu nic nie zostało", () => {
    expect(composeConfigurationSnapshot(input, { variantId: "x", optionIds: ["y"], styleId: "z" })).toBeNull();
    expect(composeConfigurationSnapshot(input, {})).toBeNull();
  });

  it("wariant z wyceną indywidualną nie ma sumy", () => {
    const custom = { ...input, variants: [{ id: "v1", label: "Pod klucz", priceMinCents: null, priceOnRequest: true }] };
    expect(composeConfigurationSnapshot(custom, { variantId: "v1", optionIds: ["ac-1"] })?.totalPriceCents).toBeNull();
  });
});
