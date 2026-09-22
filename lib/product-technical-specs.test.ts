import { describe, expect, it } from "vitest";
import { ENERGY_CLASSES, getTechnicalSpecsSchema, HEAT_SOURCES, VENTILATION_TYPES } from "./product-technical-specs";

describe("getTechnicalSpecsSchema: dom", () => {
  const complete = {
    wallBuildUp: "Szkielet",
    insulation: "U = 0.15",
    heatTransferCoefficients: "A" as const,
    windowClass: "Uw = 0.8",
    ventilation: "rekuperacja" as const,
    heatSource: "pompa-ciepla-powietrze-woda" as const,
    fireResistance: "REI 30",
    windResistance: "Strefa 2",
  };

  it("accepts a complete dom shape when published", () => {
    const result = getTechnicalSpecsSchema("dom", "published").safeParse(complete);
    expect(result.success).toBe(true);
  });

  it("rejects a dom shape missing any required field when published", () => {
    const missingHeatSource: Partial<typeof complete> = { ...complete };
    delete missingHeatSource.heatSource;
    const result = getTechnicalSpecsSchema("dom", "published").safeParse(missingHeatSource);
    expect(result.success).toBe(false);
  });

  // wallBuildUp/insulation/windowClass/fireResistance/windResistance są
  // .optional() od spec 0049 (AC-1, AC-5): brak ich w danych dawnego produktu
  // nadal przechodzi walidację "published", żeby ponowny zapis istniejącego
  // produktu bez tych pól się nie wywalał.
  it("accepts a dom shape missing the five retired fields when published", () => {
    const withoutRetiredFields = { ...complete };
    delete (withoutRetiredFields as Partial<typeof complete>).wallBuildUp;
    delete (withoutRetiredFields as Partial<typeof complete>).insulation;
    delete (withoutRetiredFields as Partial<typeof complete>).windowClass;
    delete (withoutRetiredFields as Partial<typeof complete>).fireResistance;
    delete (withoutRetiredFields as Partial<typeof complete>).windResistance;
    const result = getTechnicalSpecsSchema("dom", "published").safeParse(withoutRetiredFields);
    expect(result.success).toBe(true);
  });

  it("rejects a heatSource outside the fixed set (spec 0026 AC-2)", () => {
    const result = getTechnicalSpecsSchema("dom", "published").safeParse({
      ...complete,
      heatSource: "wegiel",
    });
    expect(result.success).toBe(false);
  });

  it.each(HEAT_SOURCES)("accepts each of the %s heatSource enum values (spec 0026 AC-2)", (heatSource) => {
    const result = getTechnicalSpecsSchema("dom", "published").safeParse({ ...complete, heatSource });
    expect(result.success).toBe(true);
  });

  it.each(VENTILATION_TYPES)("accepts each of the %s ventilation enum values (spec 0026)", (ventilation) => {
    const result = getTechnicalSpecsSchema("dom", "published").safeParse({ ...complete, ventilation });
    expect(result.success).toBe(true);
  });

  it("rejects a ventilation outside the fixed set", () => {
    const result = getTechnicalSpecsSchema("dom", "published").safeParse({
      ...complete,
      ventilation: "klimatyzacja",
    });
    expect(result.success).toBe(false);
  });

  it.each(ENERGY_CLASSES)("accepts each of the %s energy class (heatTransferCoefficients) enum values, including 'nieznana' (spec 0026)", (heatTransferCoefficients) => {
    const result = getTechnicalSpecsSchema("dom", "published").safeParse({ ...complete, heatTransferCoefficients });
    expect(result.success).toBe(true);
  });

  it("rejects a heatTransferCoefficients (energy class) outside the fixed set", () => {
    const result = getTechnicalSpecsSchema("dom", "published").safeParse({
      ...complete,
      heatTransferCoefficients: "U = 0.9",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown field even when otherwise complete (strict)", () => {
    const result = getTechnicalSpecsSchema("dom", "published").safeParse({
      ...complete,
      roofType: "staly",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty object while still a draft", () => {
    const result = getTechnicalSpecsSchema("dom", "draft").safeParse({});
    expect(result.success).toBe(true);
  });

  it("still rejects an unknown field on a draft (strict is preserved by .partial())", () => {
    const result = getTechnicalSpecsSchema("dom", "draft").safeParse({ seatingCapacity: 4 });
    expect(result.success).toBe(false);
  });
});

describe("getTechnicalSpecsSchema: spa-modulowe", () => {
  const complete = {
    seatingCapacity: 4,
    waterVolumeLiters: 800,
    heatingType: "electric" as const,
    filtrationSystem: "Piaskowa",
    shellMaterial: "Akryl",
    electricalRequirement: "400V",
    foundationType: "Płyta betonowa",
  };

  it("accepts a complete spa shape when published", () => {
    const result = getTechnicalSpecsSchema("spa-modulowe", "published").safeParse(complete);
    expect(result.success).toBe(true);
  });

  it("rejects a non numeric seatingCapacity", () => {
    const result = getTechnicalSpecsSchema("spa-modulowe", "published").safeParse({
      ...complete,
      seatingCapacity: "4",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a heatingType outside the fixed set", () => {
    const result = getTechnicalSpecsSchema("spa-modulowe", "published").safeParse({
      ...complete,
      heatingType: "gas",
    });
    expect(result.success).toBe(false);
  });

  it("accepts each of the three valid heatingType values", () => {
    for (const heatingType of ["electric", "heat-pump", "wood-fired"] as const) {
      const result = getTechnicalSpecsSchema("spa-modulowe", "published").safeParse({
        ...complete,
        heatingType,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a dom-only field on a spa shape (strict, distinct schema per family)", () => {
    const result = getTechnicalSpecsSchema("spa-modulowe", "published").safeParse({
      ...complete,
      wallBuildUp: "Szkielet",
    });
    expect(result.success).toBe(false);
  });
});

describe("getTechnicalSpecsSchema: kontenery-modulowe requires containerSubcategory", () => {
  it("throws when containerSubcategory is missing (spec 0039 Kluczowe niezmienniki)", () => {
    expect(() => getTechnicalSpecsSchema("kontenery-modulowe", "published")).toThrow();
  });
});

describe("getTechnicalSpecsSchema: kontenery-modulowe / gastronomiczne", () => {
  const complete = {
    dimensions: "6x4x2.8m",
    structureMaterial: "Stal",
    insulationType: "Wełna mineralna",
    foundationType: "Stopy betonowe",
    kitchenEquipmentType: "Płyta grillowa, frytkownica",
    extractionVentilation: "Wyciąg mechaniczny z filtrami tłuszczowymi",
    electricalPower: "32A trójfazowe",
    waterSupplyType: "Przyłącze wodociągowe",
    wasteWaterHandling: "Zbiornik bezodpływowy",
  };

  it("accepts a complete gastronomiczne shape when published (AC-4)", () => {
    const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "gastronomiczne").safeParse(complete);
    expect(result.success).toBe(true);
  });

  it("rejects a shape missing any required field when published", () => {
    const missingKitchen: Partial<typeof complete> = { ...complete };
    delete missingKitchen.kitchenEquipmentType;
    const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "gastronomiczne").safeParse(
      missingKitchen,
    );
    expect(result.success).toBe(false);
  });

  it("rejects a field from another subcategory even when otherwise complete (strict, disjoint shapes)", () => {
    const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "gastronomiczne").safeParse({
      ...complete,
      sleepingCapacity: 4,
    });
    expect(result.success).toBe(false);
  });

  it("requires all fields when published, but allows a partial shape while draft", () => {
    const partial = { dimensions: complete.dimensions };
    expect(getTechnicalSpecsSchema("kontenery-modulowe", "published", "gastronomiczne").safeParse(partial).success).toBe(
      false,
    );
    expect(getTechnicalSpecsSchema("kontenery-modulowe", "draft", "gastronomiczne").safeParse(partial).success).toBe(
      true,
    );
  });
});

describe("getTechnicalSpecsSchema: kontenery-modulowe / uslugowe", () => {
  const complete = {
    dimensions: "6x2.5x2.8m",
    structureMaterial: "Stal",
    insulationType: "Styropian",
    foundationType: "Płyta betonowa",
    intendedUse: "Biuro sprzedaży",
    electricalInstallation: "Standardowa jednofazowa",
    spaceHeatingType: "Klimatyzator z funkcją grzania",
  };

  it("accepts a complete uslugowe shape when published (AC-4)", () => {
    const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "uslugowe").safeParse(complete);
    expect(result.success).toBe(true);
  });

  it("rejects a gastronomiczne-only field on an uslugowe shape (strict, disjoint schema per subcategory)", () => {
    const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "uslugowe").safeParse({
      ...complete,
      kitchenEquipmentType: "Płyta grillowa",
    });
    expect(result.success).toBe(false);
  });
});

describe("getTechnicalSpecsSchema: kontenery-modulowe / mieszkalne", () => {
  const complete = {
    dimensions: "6x2.5x2.8m",
    structureMaterial: "Stal",
    insulationType: "Wełna mineralna",
    foundationType: "Płyta betonowa",
    sleepingCapacity: 2,
    bathroomIncluded: true,
    spaceHeatingType: "Elektryczne grzejniki",
    waterSupplyType: "Przyłącze wodociągowe",
    wasteWaterHandling: "Zbiornik bezodpływowy",
    electricalInstallation: "Standardowa jednofazowa",
  };

  it("accepts a complete mieszkalne shape when published (AC-4)", () => {
    const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "mieszkalne").safeParse(complete);
    expect(result.success).toBe(true);
  });

  it("rejects a non boolean bathroomIncluded", () => {
    const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "mieszkalne").safeParse({
      ...complete,
      bathroomIncluded: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("accepts both boolean values for bathroomIncluded", () => {
    for (const bathroomIncluded of [true, false]) {
      const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "mieszkalne").safeParse({
        ...complete,
        bathroomIncluded,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a non numeric sleepingCapacity", () => {
    const result = getTechnicalSpecsSchema("kontenery-modulowe", "published", "mieszkalne").safeParse({
      ...complete,
      sleepingCapacity: "2",
    });
    expect(result.success).toBe(false);
  });
});
