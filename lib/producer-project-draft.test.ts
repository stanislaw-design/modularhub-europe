import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDraft } from "./data/types";
import {
  BEDROOMS_MAX,
  BEDROOMS_MIN,
  ENERGY_CLASS_OPTIONS,
  FLOOR_AREA_MAX_M2,
  FLOOR_AREA_MIN_M2,
  HEAT_SOURCE_OPTIONS,
  TECHNICAL_FIELDS_BY_FAMILY,
  VENTILATION_TYPE_OPTIONS,
  WIZARD_STEPS,
  clearDraft,
  createEmptyDraft,
  isStepComplete,
  loadDraft,
  saveDraft,
} from "./producer-project-draft";

function completeDraft(): ProjectDraft {
  return {
    name: "Modulor 28",
    floorAreaM2: 80,
    bedrooms: 2,
    countryOfProduction: "PL",
    description: "Opis projektu",
    family: "dom",
    category: "caloroczny",
    spaSubcategory: null,
    pergolaSubcategory: null,
    technicalSpecs: {
      wallBuildUp: "Szkielet",
      insulation: "U = 0.15",
      heatTransferCoefficients: "A",
      windowClass: "Uw = 0.8",
      ventilation: "rekuperacja",
      heatSource: "pompa-ciepla-powietrze-woda",
      fireResistance: "REI 30",
      windResistance: "Strefa 2",
    },
    floorPlanFiles: [{ name: "rzut.pdf", sizeBytes: 100 }],
    photoFiles: [{ name: "zdjecie.png", sizeBytes: 200 }],
    housePriceMinEur: 100000,
    housePriceMaxEur: 120000,
    completionStandard: "deweloperski",
    productionLeadTimeWeeksMin: 10,
    productionLeadTimeWeeksMax: 14,
    onSiteAssemblyDaysMin: 3,
    onSiteAssemblyDaysMax: 5,
    structuralWarrantyYears: 25,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("WIZARD_STEPS", () => {
  it("has five steps in the fixed spec order (spec 0022)", () => {
    expect(WIZARD_STEPS.map((step) => step.id)).toEqual([
      "podstawowe",
      "techniczne",
      "pliki",
      "cena",
      "podsumowanie",
    ]);
  });
});

describe("createEmptyDraft", () => {
  it("returns a draft with every field empty, null, or an empty file list", () => {
    const draft = createEmptyDraft();

    expect(draft.name).toBe("");
    expect(draft.floorAreaM2).toBeNull();
    expect(draft.bedrooms).toBeNull();
    expect(draft.countryOfProduction).toBeNull();
    expect(draft.family).toBeNull();
    expect(draft.category).toBeNull();
    expect(draft.technicalSpecs).toEqual({});
    expect(draft.floorPlanFiles).toEqual([]);
    expect(draft.photoFiles).toEqual([]);
  });
});

describe("isStepComplete: podstawowe", () => {
  it("is complete when all fields, including family and its subcategory, are valid", () => {
    expect(isStepComplete("podstawowe", completeDraft())).toBe(true);
  });

  it("is incomplete when the name is blank or only whitespace", () => {
    expect(isStepComplete("podstawowe", { ...completeDraft(), name: "" })).toBe(false);
    expect(isStepComplete("podstawowe", { ...completeDraft(), name: "   " })).toBe(false);
  });

  it("accepts the floor area at the inclusive boundaries", () => {
    expect(isStepComplete("podstawowe", { ...completeDraft(), floorAreaM2: FLOOR_AREA_MIN_M2 })).toBe(true);
    expect(isStepComplete("podstawowe", { ...completeDraft(), floorAreaM2: FLOOR_AREA_MAX_M2 })).toBe(true);
  });

  it("rejects a floor area just outside the boundaries, or null", () => {
    expect(isStepComplete("podstawowe", { ...completeDraft(), floorAreaM2: FLOOR_AREA_MIN_M2 - 1 })).toBe(false);
    expect(isStepComplete("podstawowe", { ...completeDraft(), floorAreaM2: FLOOR_AREA_MAX_M2 + 1 })).toBe(false);
    expect(isStepComplete("podstawowe", { ...completeDraft(), floorAreaM2: null })).toBe(false);
  });

  it("accepts bedrooms at the inclusive boundaries", () => {
    expect(isStepComplete("podstawowe", { ...completeDraft(), bedrooms: BEDROOMS_MIN })).toBe(true);
    expect(isStepComplete("podstawowe", { ...completeDraft(), bedrooms: BEDROOMS_MAX })).toBe(true);
  });

  it("rejects bedrooms outside the boundaries, non-integer, or null", () => {
    expect(isStepComplete("podstawowe", { ...completeDraft(), bedrooms: BEDROOMS_MIN - 1 })).toBe(false);
    expect(isStepComplete("podstawowe", { ...completeDraft(), bedrooms: BEDROOMS_MAX + 1 })).toBe(false);
    expect(isStepComplete("podstawowe", { ...completeDraft(), bedrooms: 2.5 })).toBe(false);
    expect(isStepComplete("podstawowe", { ...completeDraft(), bedrooms: null })).toBe(false);
  });

  it("is incomplete when the country or description is missing", () => {
    expect(isStepComplete("podstawowe", { ...completeDraft(), countryOfProduction: null })).toBe(false);
    expect(isStepComplete("podstawowe", { ...completeDraft(), description: "" })).toBe(false);
  });

  it("is incomplete when family is missing, or when its matching subcategory is missing (spec 0022 AC-6)", () => {
    expect(isStepComplete("podstawowe", { ...completeDraft(), family: null })).toBe(false);
    expect(isStepComplete("podstawowe", { ...completeDraft(), category: null })).toBe(false);
  });

  it("checks spaSubcategory for family spa-modulowe, and pergolaSubcategory for pergola", () => {
    const spaDraft: ProjectDraft = {
      ...completeDraft(),
      family: "spa-modulowe",
      category: null,
      spaSubcategory: "sauna",
    };
    expect(isStepComplete("podstawowe", spaDraft)).toBe(true);
    expect(isStepComplete("podstawowe", { ...spaDraft, spaSubcategory: null })).toBe(false);

    const pergolaDraft: ProjectDraft = {
      ...completeDraft(),
      family: "pergola",
      category: null,
      pergolaSubcategory: "drewniana",
    };
    expect(isStepComplete("podstawowe", pergolaDraft)).toBe(true);
    expect(isStepComplete("podstawowe", { ...pergolaDraft, pergolaSubcategory: null })).toBe(false);
  });
});

describe("isStepComplete: techniczne", () => {
  it("requires every technical field for the draft's family to be filled", () => {
    expect(isStepComplete("techniczne", completeDraft())).toBe(true);
    expect(
      isStepComplete("techniczne", {
        ...completeDraft(),
        technicalSpecs: { ...completeDraft().technicalSpecs, wallBuildUp: "" },
      })
    ).toBe(false);
  });

  it("is incomplete when family is not yet chosen", () => {
    expect(isStepComplete("techniczne", { ...completeDraft(), family: null })).toBe(false);
  });

  it("requires numeric fields for family spa-modulowe, not just non-blank strings", () => {
    const spaDraft: ProjectDraft = {
      ...completeDraft(),
      family: "spa-modulowe",
      category: null,
      spaSubcategory: "sauna",
      technicalSpecs: {
        seatingCapacity: 4,
        waterVolumeLiters: 800,
        heatingType: "electric",
        filtrationSystem: "Piaskowa",
        shellMaterial: "Akryl",
        electricalRequirement: "400V",
        foundationType: "Płyta betonowa",
      },
    };
    expect(isStepComplete("techniczne", spaDraft)).toBe(true);
    expect(
      isStepComplete("techniczne", {
        ...spaDraft,
        technicalSpecs: { ...spaDraft.technicalSpecs, seatingCapacity: undefined },
      })
    ).toBe(false);
  });
});

describe("isStepComplete: pliki", () => {
  it("requires at least one file in each of the two areas", () => {
    expect(isStepComplete("pliki", completeDraft())).toBe(true);
    expect(isStepComplete("pliki", { ...completeDraft(), floorPlanFiles: [] })).toBe(false);
    expect(isStepComplete("pliki", { ...completeDraft(), photoFiles: [] })).toBe(false);
  });
});

describe("isStepComplete: cena", () => {
  it("is complete when price, standard, lead times, and warranty are all valid", () => {
    expect(isStepComplete("cena", completeDraft())).toBe(true);
  });

  it("rejects a reversed price, lead time, or assembly time range", () => {
    expect(isStepComplete("cena", { ...completeDraft(), housePriceMinEur: 130000 })).toBe(false);
    expect(
      isStepComplete("cena", { ...completeDraft(), productionLeadTimeWeeksMin: 20 })
    ).toBe(false);
    expect(isStepComplete("cena", { ...completeDraft(), onSiteAssemblyDaysMin: 10 })).toBe(false);
  });

  it("is incomplete when the standard or warranty is missing", () => {
    expect(isStepComplete("cena", { ...completeDraft(), completionStandard: null })).toBe(false);
    expect(isStepComplete("cena", { ...completeDraft(), structuralWarrantyYears: null })).toBe(false);
  });

  it("rejects a negative or non-integer warranty", () => {
    expect(isStepComplete("cena", { ...completeDraft(), structuralWarrantyYears: -1 })).toBe(false);
    expect(isStepComplete("cena", { ...completeDraft(), structuralWarrantyYears: 2.5 })).toBe(false);
  });
});

describe("isStepComplete: podsumowanie", () => {
  it("is complete only when every prior step is complete", () => {
    expect(isStepComplete("podsumowanie", completeDraft())).toBe(true);
  });

  it("is incomplete when any single earlier step is incomplete", () => {
    expect(isStepComplete("podsumowanie", { ...completeDraft(), name: "" })).toBe(false);
    expect(
      isStepComplete("podsumowanie", {
        ...completeDraft(),
        technicalSpecs: { ...completeDraft().technicalSpecs, fireResistance: "" },
      })
    ).toBe(false);
    expect(isStepComplete("podsumowanie", { ...completeDraft(), photoFiles: [] })).toBe(false);
  });
});

describe("saveDraft / loadDraft round trip", () => {
  it("loads back exactly what was saved, keyed by NIP", () => {
    const draft = completeDraft();
    saveDraft("1234567890", draft, 3);

    const loaded = loadDraft("1234567890");

    expect(loaded).toEqual({ draft, step: 3 });
  });

  it("returns null when nothing is stored for that NIP", () => {
    expect(loadDraft("0000000000")).toBeNull();
  });

  it("keeps two producers' drafts fully isolated under different NIPs", () => {
    saveDraft("1111111111", { ...completeDraft(), name: "Dom A" }, 1);
    saveDraft("2222222222", { ...completeDraft(), name: "Dom B" }, 4);

    expect(loadDraft("1111111111")?.draft.name).toBe("Dom A");
    expect(loadDraft("2222222222")?.draft.name).toBe("Dom B");
  });

  it("clamps an out-of-range stored step into the valid range", () => {
    window.localStorage.setItem(
      "producent:1234567890:projekt-szkic",
      JSON.stringify({ draft: completeDraft(), step: 99 })
    );

    expect(loadDraft("1234567890")?.step).toBe(WIZARD_STEPS.length - 1);
  });
});

describe("loadDraft: fail-soft on a corrupted or incompatible saved state", () => {
  it("returns null for syntactically invalid JSON, never throws", () => {
    window.localStorage.setItem("producent:1234567890:projekt-szkic", "{not-json");

    expect(() => loadDraft("1234567890")).not.toThrow();
    expect(loadDraft("1234567890")).toBeNull();
  });

  it("returns null when the stored value is valid JSON but not the expected shape", () => {
    window.localStorage.setItem("producent:1234567890:projekt-szkic", JSON.stringify({ foo: "bar" }));
    expect(loadDraft("1234567890")).toBeNull();
  });

  it("returns null when draft is present but step is missing", () => {
    window.localStorage.setItem(
      "producent:1234567890:projekt-szkic",
      JSON.stringify({ draft: completeDraft() })
    );
    expect(loadDraft("1234567890")).toBeNull();
  });

  it("merges a partial draft object with defaults instead of rejecting it outright", () => {
    window.localStorage.setItem(
      "producent:1234567890:projekt-szkic",
      JSON.stringify({ draft: { name: "Częściowy" }, step: 0 })
    );

    const loaded = loadDraft("1234567890");

    expect(loaded?.draft.name).toBe("Częściowy");
    expect(loaded?.draft.floorAreaM2).toBeNull();
    expect(loaded?.draft.floorPlanFiles).toEqual([]);
  });
});

describe("saveDraft: fails soft when the underlying write throws", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not throw when localStorage.setItem throws (e.g. quota exceeded, private mode)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveDraft("1234567890", completeDraft(), 0)).not.toThrow();
  });
});

describe("clearDraft", () => {
  it("removes only the given NIP's saved state", () => {
    saveDraft("1111111111", completeDraft(), 2);
    saveDraft("2222222222", completeDraft(), 2);

    clearDraft("1111111111");

    expect(loadDraft("1111111111")).toBeNull();
    expect(loadDraft("2222222222")).not.toBeNull();
  });

  it("does not throw when localStorage.removeItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => clearDraft("1234567890")).not.toThrow();

    spy.mockRestore();
  });
});

// spec 0026 AC-2, Feature design: heatSource/ventilation/heatTransferCoefficients switched from
// free text to closed-list selects in the producer wizard's "Dane techniczne" step.
describe("dom technical fields: heatSource/ventilation/heatTransferCoefficients selects", () => {
  it("configures all three as select fields with options, not text", () => {
    const fields = TECHNICAL_FIELDS_BY_FAMILY.dom;
    for (const key of ["heatSource", "ventilation", "heatTransferCoefficients"] as const) {
      const field = fields.find((f) => f.key === key);
      expect(field?.type).toBe("select");
      expect(field?.options?.length).toBeGreaterThan(0);
    }
  });

  it("HEAT_SOURCE_OPTIONS has one entry per HEAT_SOURCES enum value, each with a Polish label", () => {
    expect(HEAT_SOURCE_OPTIONS).toHaveLength(6);
    for (const option of HEAT_SOURCE_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("VENTILATION_TYPE_OPTIONS has one entry per VENTILATION_TYPES enum value", () => {
    expect(VENTILATION_TYPE_OPTIONS).toHaveLength(4);
  });

  it("ENERGY_CLASS_OPTIONS excludes 'nieznana' (a backfill default, not a real choice, spec 0026 Feature design)", () => {
    const values: string[] = ENERGY_CLASS_OPTIONS.map((o) => o.value);
    expect(values).toEqual(["A+", "A", "B", "C", "D"]);
    expect(values).not.toContain("nieznana");
  });
});
