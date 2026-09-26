import type { Project } from "@/lib/data/types";

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "prj-modulor-family-90",
    producerId: "prod-modulor",
    producerName: "Modulor Systems Sp. z o.o.",
    name: "Modulor Family 90",
    countryOfProduction: "PL",
    floorAreaM2: 90,
    builtUpAreaM2: 108,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    storeys: 1,
    externalDimensions: "13,5 × 8,0 m",
    roofType: "Dwuspadowy, 30°",
    family: "dom",
    category: "caloroczny",
    constructionSystem: "Prefabrykowany szkielet drewniany C24/KVH",
    foundationOptions: "Płyta fundamentowa",
    customizationScope: "Lustrzane odbicie i wariant elewacji",
    structuralWarrantyYears: 30,
    priceMin: 118000,
    currency: "EUR",
    coverImageUrl: "https://picsum.photos/seed/modulor-family-90/960/640",
    description: "",
    wallBuildUp: "",
    insulation: "",
    heatTransferCoefficients: "",
    windowClass: "",
    ventilation: "",
    heatSource: "",
    fireResistance: "",
    windResistance: "",
    variants: [
      {
        id: "variant-deweloperski",
        completionStandard: "deweloperski",
        priceMin: 118000,
        currency: "EUR",
        priceOnRequest: false,
        isDefault: true,
        costLineItems: [
          { id: "cost-fundament", label: "Fundament", status: "w-cenie" },
          { id: "cost-sciany", label: "Ściany i dach", status: "w-cenie" },
        ],
        // Dni zamiast dawnych tygodni (spec 0041/0042): 12–16 tyg. produkcji
        // = 84–112 dni, żeby testy odwołujące się do starego zapisu
        // tygodniowego (ResultCard, FavoriteCompareTable) nie musiały się zmienić.
        timelineStages: [
          { stageKey: "produkcja", durationMinDays: 84, durationMaxDays: 112 },
          { stageKey: "montaz", durationMinDays: 3, durationMaxDays: 5 },
        ],
      },
    ],
    documents: [],
    featured: false,
    ...overrides,
  };
}
