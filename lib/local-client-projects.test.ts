import { beforeEach, describe, expect, it } from "vitest";
import type { SavedProduct } from "./data/types";
import { getAllLocalProducerProjects, isLocalProjectId, mapSavedProductToProject } from "./local-client-projects";
import { createProduct } from "./producer-products";
import { createEmptyDraft } from "./producer-project-draft";
import type { RegistrationDetails } from "./producer-registration";
import { saveRegistrationDetails } from "./producer-registration-storage";

const registration: RegistrationDetails = {
  nip: "1234567890",
  countries: ["PL", "DE"],
  technology: "szkielet-drewniany",
};

function domProduct(): SavedProduct {
  return {
    id: "product-1",
    name: "Modulor 28",
    floorAreaM2: 90,
    bedrooms: 3,
    countryOfProduction: "PL",
    description: "Opis",
    family: "dom",
    category: "caloroczny",
    spaSubcategory: null,
    pergolaSubcategory: null,
    technicalSpecs: {
      wallBuildUp: "Szkielet",
      insulation: "U = 0.15",
      heatTransferCoefficients: "U = 0.9",
      windowClass: "Uw = 0.8",
      ventilation: "Mechaniczna",
      heatSource: "Pompa ciepła",
      fireResistance: "REI 30",
      windResistance: "Strefa 2",
    },
    floorPlanFiles: [],
    photoFiles: [],
    housePriceMinEur: 100000,
    housePriceMaxEur: 120000,
    completionStandard: "deweloperski",
    productionLeadTimeWeeksMin: 10,
    productionLeadTimeWeeksMax: 14,
    onSiteAssemblyDaysMin: 3,
    onSiteAssemblyDaysMax: 5,
    structuralWarrantyYears: 25,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function pergolaProduct(): SavedProduct {
  return {
    ...domProduct(),
    id: "product-2",
    name: "Pergola Deluxe",
    family: "pergola",
    category: null,
    pergolaSubcategory: "drewniana",
    technicalSpecs: {
      roofType: "bioklimatyczny",
      roofMaterial: "Aluminium",
      dimensions: "4x3x2.5m",
      windLoadRating: "Strefa 2",
      snowLoadRating: "1.2 kN/m2",
      glazingType: "Szkło hartowane",
      foundationType: "Stopy betonowe",
    },
  };
}

describe("mapSavedProductToProject: family dom", () => {
  it("maps technicalSpecs onto Project's flat technical fields", () => {
    const { project } = mapSavedProductToProject(domProduct(), registration);

    expect(project.family).toBe("dom");
    expect(project.wallBuildUp).toBe("Szkielet");
    expect(project.fireResistance).toBe("REI 30");
    expect(project.category).toBe("caloroczny");
  });

  it("prefixes the id so it's recognised as a local preview, and isLocalProjectId agrees", () => {
    const { project } = mapSavedProductToProject(domProduct(), registration);

    expect(project.id).toBe("local-1234567890-product-1");
    expect(isLocalProjectId(project.id)).toBe(true);
  });

  it("builds one eligibility entry per registered delivery country", () => {
    const { eligibility } = mapSavedProductToProject(domProduct(), registration);

    expect(eligibility).toHaveLength(2);
    expect(eligibility.map((entry) => entry.countryCode).sort()).toEqual(["DE", "PL"]);
    expect(eligibility.every((entry) => entry.status === "approved")).toBe(true);
  });
});

describe("mapSavedProductToProject: family pergola", () => {
  it("leaves Project's dom-only technical fields empty instead of leaking unrelated data", () => {
    const { project } = mapSavedProductToProject(pergolaProduct(), registration);

    expect(project.family).toBe("pergola");
    expect(project.wallBuildUp).toBe("");
    expect(project.insulation).toBe("");
    expect(project.fireResistance).toBe("");
  });

  it("falls back category to a placeholder since Project has no null category (a family without one)", () => {
    const { project } = mapSavedProductToProject(pergolaProduct(), registration);

    expect(project.category).toBe("caloroczny");
  });
});

describe("getAllLocalProducerProjects", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty result when nothing is saved in this browser", () => {
    expect(getAllLocalProducerProjects()).toEqual({ projects: [], eligibility: [] });
  });

  it("scans every producer's saved catalog and maps each product to a Project, keeping family", () => {
    saveRegistrationDetails(registration);
    const draft = {
      ...createEmptyDraft(),
      name: "Pergola Deluxe",
      floorAreaM2: 20,
      bedrooms: 0,
      countryOfProduction: "PL" as const,
      description: "Opis",
      family: "pergola" as const,
      pergolaSubcategory: "drewniana" as const,
      technicalSpecs: pergolaProduct().technicalSpecs,
      floorPlanFiles: [{ name: "rzut.pdf", sizeBytes: 10 }],
      photoFiles: [{ name: "zdjecie.png", sizeBytes: 10 }],
      housePriceMinEur: 5000,
      housePriceMaxEur: 7000,
      completionStandard: "pod-klucz" as const,
      productionLeadTimeWeeksMin: 4,
      productionLeadTimeWeeksMax: 6,
      onSiteAssemblyDaysMin: 1,
      onSiteAssemblyDaysMax: 2,
      structuralWarrantyYears: 5,
    };
    createProduct(registration.nip, draft);

    const { projects } = getAllLocalProducerProjects();

    expect(projects).toHaveLength(1);
    expect(projects[0]?.family).toBe("pergola");
    expect(isLocalProjectId(projects[0]!.id)).toBe(true);
  });
});
