import { describe, expect, it } from "vitest";
import { resolveOutdoorKitchenSpecs } from "./translated-specs";

// Spec 0086 AC-7: typowany odczyt kuchni ogrodowej z tłumaczeniem tekstowych pól.
const raw = {
  kitchenType: "modular",
  externalDimensionsCm: { length: 300 },
  equipment: {
    grill: "included",
    sink: "included",
    fridge: "none",
    cabinets: "included",
    lighting: "none",
  },
  closable: false,
  bodyMaterial: "Stal ocynkowana",
  worktopMaterial: "HPL 12 mm",
  standardFeatures: ["Grill gazowy", "Zlew z baterią"],
  deliveryNote: "Dostawa złożona",
};

describe("resolveOutdoorKitchenSpecs", () => {
  it("returns the Polish source when there is no translation", () => {
    const specs = resolveOutdoorKitchenSpecs(raw, undefined);
    expect(specs?.bodyMaterial).toBe("Stal ocynkowana");
    expect(specs?.standardFeatures).toEqual(["Grill gazowy", "Zlew z baterią"]);
    expect(specs?.foundationRequirement).toBeUndefined();
  });

  it("uses translated text fields and the translated feature list", () => {
    const specs = resolveOutdoorKitchenSpecs(raw, {
      specs: {
        bodyMaterial: { value: "Galvanised steel" },
        deliveryNote: { value: "  " },
      },
      standardFeatures: ["Gas grill", "Sink with tap"],
    });
    expect(specs?.bodyMaterial).toBe("Galvanised steel");
    expect(specs?.deliveryNote).toBe("Dostawa złożona");
    expect(specs?.worktopMaterial).toBe("HPL 12 mm");
    expect(specs?.standardFeatures).toEqual(["Gas grill", "Sink with tap"]);
  });

  it("falls back to the Polish list when the translated list has a different length", () => {
    const specs = resolveOutdoorKitchenSpecs(raw, {
      standardFeatures: ["Gas grill"],
    });
    expect(specs?.standardFeatures).toEqual(["Grill gazowy", "Zlew z baterią"]);
  });

  it("returns undefined for a row that does not match the schema", () => {
    expect(resolveOutdoorKitchenSpecs({ ...raw, kitchenType: "island" }, undefined)).toBeUndefined();
  });
});
