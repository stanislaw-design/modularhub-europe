import { z } from "zod";

// Rodzina produktu i jej dane techniczne (spec 0022). family żyje jako osobna
// kolumna obok technicalSpecs (nie wewnątrz JSON), więc z.discriminatedUnion
// (który wymaga dyskryminatora wewnątrz walidowanego obiektu) nie pasuje —
// zamiast tego mapa schematu per family, wybierana przez wywołującego.
export const PRODUCT_FAMILIES = ["dom", "spa-modulowe", "kontenery-modulowe"] as const;
export type ProductFamily = (typeof PRODUCT_FAMILIES)[number];

// Podkategorie kontenera modułowego (spec 0039): pierwszy przypadek w tym
// kodzie, gdzie o kształcie technicalSpecs decyduje subcategory, nie tylko
// family — patrz getTechnicalSpecsSchema niżej.
export const CONTAINER_SUBCATEGORIES = ["gastronomiczne", "uslugowe", "mieszkalne"] as const;
export type ContainerSubcategory = (typeof CONTAINER_SUBCATEGORIES)[number];

// Zamknięta lista źródeł ciepła (spec 0026 AC-2, Feature design). Chip "Pompa
// ciepła" na /wyniki dopasowuje obie wartości pompy ciepła naraz przez skrót
// heatSource=pompa-ciepla, rozwijany po stronie serwera (lib/results-filters.ts) —
// sam enum trzyma je jako dwie osobne, precyzyjne wartości.
export const HEAT_SOURCES = [
  "pompa-ciepla-powietrze-woda",
  "pompa-ciepla-grunt-woda",
  "gazowe",
  "elektryczne",
  "biomasa-pellet",
  "inne",
] as const;
export type HeatSource = (typeof HEAT_SOURCES)[number];

export const VENTILATION_TYPES = ["grawitacyjna", "mechaniczna-nawiewno-wywiewna", "rekuperacja", "brak"] as const;
export type VentilationType = (typeof VENTILATION_TYPES)[number];

// Nazwa pola (heatTransferCoefficients) zostaje dla ciągłości historii Zod/bazy,
// ale od spec 0026 niesie pasmo klasy energetycznej, nie opisowy współczynnik U
// (patrz spec 0026 Consequences > Neutral). "nieznana" jest bezpieczną wartością
// domyślną backfillu (AC-12), nie zwykłą opcją wyboru w kreatorze.
export const ENERGY_CLASSES = ["A+", "A", "B", "C", "D", "nieznana"] as const;
export type EnergyClass = (typeof ENERGY_CLASSES)[number];

// wallBuildUp/insulation/windowClass/fireResistance/windResistance są
// .optional(), nie usunięte (spec 0049 AC-1, AC-5): kreator, katalog AI i
// strona klienta już ich nie zbierają ani nie pokazują, ale zostają w
// schemacie .strict() tak, żeby ponowna walidacja/zapis produktów, które mają
// te klucze zapisane z dawniej, nadal przechodziła bez odrzucenia jako
// "nieznane pole".
const domSpecsShape = {
  wallBuildUp: z.string().optional(),
  insulation: z.string().optional(),
  heatTransferCoefficients: z.enum(ENERGY_CLASSES),
  windowClass: z.string().optional(),
  ventilation: z.enum(VENTILATION_TYPES),
  heatSource: z.enum(HEAT_SOURCES),
  fireResistance: z.string().optional(),
  windResistance: z.string().optional(),
};

export const SPA_HEATING_TYPES = ["electric", "heat-pump", "wood-fired"] as const;
export type SpaHeatingType = (typeof SPA_HEATING_TYPES)[number];

const spaModuloweSpecsShape = {
  seatingCapacity: z.number(),
  waterVolumeLiters: z.number(),
  heatingType: z.enum(SPA_HEATING_TYPES),
  filtrationSystem: z.string(),
  shellMaterial: z.string(),
  electricalRequirement: z.string(),
  foundationType: z.string(),
};

// Kompletny kształt (wymagany od status = 'published'): każdy schemat jest
// .strict() (odrzuca nieznane pola) i wymaga wszystkich swoich pól (spec 0022
// AC-4, Feature design). Rodziny "dom" i "spa-modulowe" mają jeden kształt na
// całą rodzinę; "kontenery-modulowe" nie żyje w tej mapie (patrz niżej, jej
// kształt zależy od containerSubcategory, nie samej family, spec 0039 AC-4).
const publishedTechnicalSpecsSchemaByFamily = {
  dom: z.object(domSpecsShape).strict(),
  "spa-modulowe": z.object(spaModuloweSpecsShape).strict(),
} satisfies Record<Exclude<ProductFamily, "kontenery-modulowe">, z.ZodTypeAny>;

// Kształt dopuszczalny podczas status = 'draft': te same pola, wszystkie opcjonalne.
const draftTechnicalSpecsSchemaByFamily = {
  dom: publishedTechnicalSpecsSchemaByFamily.dom.partial(),
  "spa-modulowe": publishedTechnicalSpecsSchemaByFamily["spa-modulowe"].partial(),
} satisfies Record<Exclude<ProductFamily, "kontenery-modulowe">, z.ZodTypeAny>;

// Pola dzielone przez wszystkie trzy podkategorie kontenera modułowego (spec
// 0039 Follow-up: wspólny bazowy kształt rozszerzany per podkategoria, żeby
// ograniczyć duplikację — finalny, eksportowany kształt każdej podkategorii
// zostaje dokładnie taki, jak ustalono w decyzji, patrz AC-4).
const containerBaseSpecsShape = {
  dimensions: z.string(),
  structureMaterial: z.string(),
  insulationType: z.string(),
  foundationType: z.string(),
};

const containerGastronomiczneSpecsShape = {
  ...containerBaseSpecsShape,
  kitchenEquipmentType: z.string(),
  extractionVentilation: z.string(),
  electricalPower: z.string(),
  waterSupplyType: z.string(),
  wasteWaterHandling: z.string(),
};

const containerUslugoweSpecsShape = {
  ...containerBaseSpecsShape,
  intendedUse: z.string(),
  electricalInstallation: z.string(),
  spaceHeatingType: z.string(),
};

const containerMieszkalneSpecsShape = {
  ...containerBaseSpecsShape,
  sleepingCapacity: z.number(),
  bathroomIncluded: z.boolean(),
  spaceHeatingType: z.string(),
  waterSupplyType: z.string(),
  wasteWaterHandling: z.string(),
  electricalInstallation: z.string(),
};

const publishedContainerSpecsSchemaBySubcategory = {
  gastronomiczne: z.object(containerGastronomiczneSpecsShape).strict(),
  uslugowe: z.object(containerUslugoweSpecsShape).strict(),
  mieszkalne: z.object(containerMieszkalneSpecsShape).strict(),
} satisfies Record<ContainerSubcategory, z.ZodTypeAny>;

const draftContainerSpecsSchemaBySubcategory = {
  gastronomiczne: publishedContainerSpecsSchemaBySubcategory.gastronomiczne.partial(),
  uslugowe: publishedContainerSpecsSchemaBySubcategory.uslugowe.partial(),
  mieszkalne: publishedContainerSpecsSchemaBySubcategory.mieszkalne.partial(),
} satisfies Record<ContainerSubcategory, z.ZodTypeAny>;

// containerSubcategory jest wymagany dla family = "kontenery-modulowe" (rzuca
// błąd, jeśli go zabraknie — w praktyce nieosiągalne przez UI, bo krok
// techniczny kreatora nie renderuje się bez wybranej podkategorii, ale
// strażnik czasu działania jest tańszy niż cichy zły kształt walidacji, spec
// 0039 Kluczowe niezmienniki); ignorowany dla pozostałych rodzin.
export function getTechnicalSpecsSchema(
  family: ProductFamily,
  status: "draft" | "published",
  containerSubcategory?: ContainerSubcategory,
): z.ZodTypeAny {
  if (family === "kontenery-modulowe") {
    if (!containerSubcategory) {
      throw new Error("getTechnicalSpecsSchema: containerSubcategory is required for family 'kontenery-modulowe'");
    }
    return status === "published"
      ? publishedContainerSpecsSchemaBySubcategory[containerSubcategory]
      : draftContainerSpecsSchemaBySubcategory[containerSubcategory];
  }
  return status === "published"
    ? publishedTechnicalSpecsSchemaByFamily[family]
    : draftTechnicalSpecsSchemaByFamily[family];
}

export type DomTechnicalSpecs = z.infer<typeof publishedTechnicalSpecsSchemaByFamily.dom>;
export type SpaModuloweTechnicalSpecs = z.infer<
  (typeof publishedTechnicalSpecsSchemaByFamily)["spa-modulowe"]
>;
export type ContainerGastronomiczneTechnicalSpecs = z.infer<
  (typeof publishedContainerSpecsSchemaBySubcategory)["gastronomiczne"]
>;
export type ContainerUslugoweTechnicalSpecs = z.infer<
  (typeof publishedContainerSpecsSchemaBySubcategory)["uslugowe"]
>;
export type ContainerMieszkalneTechnicalSpecs = z.infer<
  (typeof publishedContainerSpecsSchemaBySubcategory)["mieszkalne"]
>;
