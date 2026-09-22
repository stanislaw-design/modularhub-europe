import { describe, expect, it } from "vitest";
import type { ProjectDraft } from "./data/types";
import {
  BEDROOMS_MAX,
  BEDROOMS_MIN,
  CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY,
  ENERGY_CLASS_OPTIONS,
  FLOOR_AREA_MAX_M2,
  FLOOR_AREA_MIN_M2,
  HEAT_SOURCE_OPTIONS,
  TECHNICAL_FIELDS_BY_FAMILY,
  VENTILATION_TYPE_OPTIONS,
  WIZARD_STEPS,
  alignFaqTranslation,
  alignRoomLayoutTranslation,
  createEmptyDraft,
  isStepComplete,
  sanitizeDraftForSave,
} from "./producer-project-draft";

function completeDraft(): ProjectDraft {
  return {
    name: "Modulor 28",
    floorAreaM2: 80,
    bedrooms: 2,
    countryOfProduction: "PL",
    description: "Opis projektu",
    nameEn: "",
    nameNl: "",
    nameDe: "",
    descriptionEn: "",
    descriptionNl: "",
    descriptionDe: "",
    family: "dom",
    category: "caloroczny",
    spaSubcategory: null,
    containerSubcategory: null,
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
    roomLayout: [],
    roomLayoutEn: [],
    roomLayoutNl: [],
    faq: [],
    faqEn: [],
    faqNl: [],
    floorPlanFiles: [{ name: "rzut.pdf", sizeBytes: 100 }],
    photoFiles: [{ name: "zdjecie.png", sizeBytes: 200 }],
    structuralWarrantyYears: 25,
    installationWarrantyYears: null,
    serviceScopeDescription: "",
    transportDimensions: "",
    craneRequirements: "",
    minPlotWidthM: null,
    simplifiedPermitEligible: null,
    variantsSummary: [{ isDefault: true, priceMinCents: 10_000_000 }],
  };
}

describe("WIZARD_STEPS", () => {
  it("has six steps in the fixed spec order (spec 0045 Build plan zadanie 12: 'cena' usunięta, 'faq' dodane)", () => {
    expect(WIZARD_STEPS.map((step) => step.id)).toEqual([
      "podstawowe",
      "techniczne",
      "pliki",
      "warianty",
      "faq",
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
    expect(draft.roomLayout).toEqual([]);
    expect(draft.faq).toEqual([]);
    expect(draft.floorPlanFiles).toEqual([]);
    expect(draft.photoFiles).toEqual([]);
    expect(draft.simplifiedPermitEligible).toBeNull();
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

  it("checks spaSubcategory for family spa-modulowe, and containerSubcategory for kontenery-modulowe (spec 0039)", () => {
    const spaDraft: ProjectDraft = {
      ...completeDraft(),
      family: "spa-modulowe",
      category: null,
      spaSubcategory: "sauna",
    };
    expect(isStepComplete("podstawowe", spaDraft)).toBe(true);
    expect(isStepComplete("podstawowe", { ...spaDraft, spaSubcategory: null })).toBe(false);

    const containerDraft: ProjectDraft = {
      ...completeDraft(),
      family: "kontenery-modulowe",
      category: null,
      containerSubcategory: "mieszkalne",
    };
    expect(isStepComplete("podstawowe", containerDraft)).toBe(true);
    expect(isStepComplete("podstawowe", { ...containerDraft, containerSubcategory: null })).toBe(false);
  });
});

describe("isStepComplete: techniczne", () => {
  it("requires every technical field for the draft's family to be filled", () => {
    expect(isStepComplete("techniczne", completeDraft())).toBe(true);
    expect(
      isStepComplete("techniczne", {
        ...completeDraft(),
        technicalSpecs: { ...completeDraft().technicalSpecs, heatSource: undefined },
      })
    ).toBe(false);
  });

  it("is incomplete when family is not yet chosen", () => {
    expect(isStepComplete("techniczne", { ...completeDraft(), family: null })).toBe(false);
  });

  // Gwarancja konstrukcyjna dołączyła tu z usuniętego kroku "Cena" (spec 0045
  // zadanie 9, 12).
  it("is incomplete when structuralWarrantyYears is missing, negative, or non-integer", () => {
    expect(isStepComplete("techniczne", { ...completeDraft(), structuralWarrantyYears: null })).toBe(false);
    expect(isStepComplete("techniczne", { ...completeDraft(), structuralWarrantyYears: -1 })).toBe(false);
    expect(isStepComplete("techniczne", { ...completeDraft(), structuralWarrantyYears: 2.5 })).toBe(false);
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

  it("is incomplete for kontenery-modulowe when containerSubcategory is not yet chosen (spec 0039)", () => {
    expect(
      isStepComplete("techniczne", {
        ...completeDraft(),
        family: "kontenery-modulowe",
        category: null,
        containerSubcategory: null,
        technicalSpecs: {},
      })
    ).toBe(false);
  });

  it("requires a real boolean (not undefined) for a boolean field, mieszkalne's bathroomIncluded (spec 0039 AC-5)", () => {
    const mieszkalneDraft: ProjectDraft = {
      ...completeDraft(),
      family: "kontenery-modulowe",
      category: null,
      containerSubcategory: "mieszkalne",
      technicalSpecs: {
        dimensions: "6x2.5x2.8m",
        structureMaterial: "Stal",
        insulationType: "Wełna mineralna",
        foundationType: "Płyta betonowa",
        sleepingCapacity: 2,
        bathroomIncluded: false,
        spaceHeatingType: "Elektryczne grzejniki",
        waterSupplyType: "Przyłącze wodociągowe",
        wasteWaterHandling: "Zbiornik bezodpływowy",
        electricalInstallation: "Standardowa jednofazowa",
      },
    };
    expect(isStepComplete("techniczne", mieszkalneDraft)).toBe(true);
    expect(
      isStepComplete("techniczne", {
        ...mieszkalneDraft,
        technicalSpecs: { ...mieszkalneDraft.technicalSpecs, bathroomIncluded: undefined },
      })
    ).toBe(false);
  });
});

// spec 0039 AC-4/AC-5: each container subcategory has its own disjoint field
// set (9 gastronomiczne, 7 uslugowe, 10 mieszkalne), never the whole family's.
describe("CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY", () => {
  it("has 9 fields for gastronomiczne, 7 for uslugowe, 10 for mieszkalne", () => {
    expect(CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY.gastronomiczne).toHaveLength(9);
    expect(CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY.uslugowe).toHaveLength(7);
    expect(CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY.mieszkalne).toHaveLength(10);
  });

  it("configures mieszkalne's bathroomIncluded as a boolean field", () => {
    const field = CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY.mieszkalne.find((f) => f.key === "bathroomIncluded");
    expect(field?.type).toBe("boolean");
  });
});

describe("isStepComplete: pliki", () => {
  it("requires at least one file in each of the two areas", () => {
    expect(isStepComplete("pliki", completeDraft())).toBe(true);
    expect(isStepComplete("pliki", { ...completeDraft(), floorPlanFiles: [] })).toBe(false);
    expect(isStepComplete("pliki", { ...completeDraft(), photoFiles: [] })).toBe(false);
  });
});

// spec 0045 AC-1/AC-4: kompletny tylko gdy istnieje dokładnie jeden domyślny
// wariant z wypełnioną ceną minimalną.
describe("isStepComplete: warianty", () => {
  it("is complete with a default variant that has a min price", () => {
    expect(isStepComplete("warianty", completeDraft())).toBe(true);
  });

  it("is incomplete with no variants at all", () => {
    expect(isStepComplete("warianty", { ...completeDraft(), variantsSummary: [] })).toBe(false);
  });

  it("is incomplete when the default variant has no price yet", () => {
    expect(
      isStepComplete("warianty", { ...completeDraft(), variantsSummary: [{ isDefault: true, priceMinCents: null }] })
    ).toBe(false);
  });

  it("is incomplete when a variant has a price but none is marked default", () => {
    expect(
      isStepComplete("warianty", { ...completeDraft(), variantsSummary: [{ isDefault: false, priceMinCents: 10_000_000 }] })
    ).toBe(false);
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
        technicalSpecs: { ...completeDraft().technicalSpecs, heatSource: undefined },
      })
    ).toBe(false);
    expect(isStepComplete("podsumowanie", { ...completeDraft(), photoFiles: [] })).toBe(false);
    expect(isStepComplete("podsumowanie", { ...completeDraft(), variantsSummary: [] })).toBe(false);
  });
});

// FAQ jest opcjonalne (spec 0045 AC-6): brak wpisów nie blokuje "Dalej" ani
// podsumowania.
describe("isStepComplete: faq", () => {
  it("is always complete regardless of how many entries exist", () => {
    expect(isStepComplete("faq", { ...completeDraft(), faq: [] })).toBe(true);
    expect(
      isStepComplete("faq", {
        ...completeDraft(),
        faq: [{ id: "1", question: "Czy da się zamówić z antresolą?", answer: "Tak." }],
      }),
    ).toBe(true);
  });
});

// spec 0045 AC-10: dopasowanie tłumaczenia po stabilnym `id`, dopełniające
// puste wpisy tam, gdzie tłumaczenie jeszcze nie istnieje (edycja produktu).
describe("alignRoomLayoutTranslation / alignFaqTranslation", () => {
  it("fills a missing translation with an empty placeholder sharing the same id", () => {
    const rows = [{ id: "a", name: "Salon", areaM2: 30, function: "dzienna", isMezzanine: false }];
    expect(alignRoomLayoutTranslation(rows, [])).toEqual([{ id: "a", name: "" }]);
  });

  it("keeps an existing translation matched by id, ignoring array position", () => {
    const rows = [
      { id: "a", name: "Salon", areaM2: 30, function: "dzienna", isMezzanine: false },
      { id: "b", name: "Sypialnia", areaM2: 12, function: "nocna", isMezzanine: false },
    ];
    const translation = [{ id: "b", name: "Bedroom" }];
    expect(alignRoomLayoutTranslation(rows, translation)).toEqual([
      { id: "a", name: "" },
      { id: "b", name: "Bedroom" },
    ]);
  });

  it("does the same for FAQ, with question/answer instead of name", () => {
    const rows = [{ id: "1", question: "Czy dom ma antresolę?", answer: "Opcjonalnie." }];
    expect(alignFaqTranslation(rows, [])).toEqual([{ id: "1", question: "", answer: "" }]);
  });
});

// spec 0045 AC-10: odwrotność align*Translation wyżej — puste wpisy tłumaczenia
// (jeszcze nie wpisane) muszą zniknąć przed zapisem, inaczej łamią
// roomLayoutTranslationRowSchema/faqTranslationRowSchema (min(1)).
describe("sanitizeDraftForSave", () => {
  it("drops room layout translation rows with an empty name", () => {
    const draft = {
      ...completeDraft(),
      roomLayoutEn: [
        { id: "a", name: "" },
        { id: "b", name: "Bedroom" },
      ],
    };
    expect(sanitizeDraftForSave(draft).roomLayoutEn).toEqual([{ id: "b", name: "Bedroom" }]);
  });

  it("drops FAQ translation rows missing a question or an answer", () => {
    const draft = {
      ...completeDraft(),
      faqEn: [
        { id: "1", question: "", answer: "Yes." },
        { id: "2", question: "Does it fit?", answer: "" },
        { id: "3", question: "Is it heated?", answer: "Yes." },
      ],
    };
    expect(sanitizeDraftForSave(draft).faqEn).toEqual([{ id: "3", question: "Is it heated?", answer: "Yes." }]);
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
