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
    const missingWallBuildUp: Partial<typeof complete> = { ...complete };
    delete missingWallBuildUp.wallBuildUp;
    const result = getTechnicalSpecsSchema("dom", "published").safeParse(missingWallBuildUp);
    expect(result.success).toBe(false);
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

describe("getTechnicalSpecsSchema: pergola", () => {
  const complete = {
    roofType: "bioklimatyczny" as const,
    roofMaterial: "Aluminium",
    dimensions: "4x3x2.5m",
    windLoadRating: "Strefa 2",
    snowLoadRating: "1.2 kN/m2",
    glazingType: "Szkło hartowane",
    foundationType: "Stopy betonowe",
  };

  it("accepts a complete pergola shape when published", () => {
    const result = getTechnicalSpecsSchema("pergola", "published").safeParse(complete);
    expect(result.success).toBe(true);
  });

  it("rejects a roofType outside the fixed set", () => {
    const result = getTechnicalSpecsSchema("pergola", "published").safeParse({
      ...complete,
      roofType: "szklany",
    });
    expect(result.success).toBe(false);
  });

  it("requires all fields when published, but allows a partial shape while draft", () => {
    const partial = { roofType: complete.roofType };
    expect(getTechnicalSpecsSchema("pergola", "published").safeParse(partial).success).toBe(false);
    expect(getTechnicalSpecsSchema("pergola", "draft").safeParse(partial).success).toBe(true);
  });
});
