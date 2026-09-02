import { z } from "zod";

// Rodzina produktu i jej dane techniczne (spec 0022). family żyje jako osobna
// kolumna obok technicalSpecs (nie wewnątrz JSON), więc z.discriminatedUnion
// (który wymaga dyskryminatora wewnątrz walidowanego obiektu) nie pasuje —
// zamiast tego mapa schematu per family, wybierana przez wywołującego.
export const PRODUCT_FAMILIES = ["dom", "spa-modulowe", "pergola"] as const;
export type ProductFamily = (typeof PRODUCT_FAMILIES)[number];

const domSpecsShape = {
  wallBuildUp: z.string(),
  insulation: z.string(),
  heatTransferCoefficients: z.string(),
  windowClass: z.string(),
  ventilation: z.string(),
  heatSource: z.string(),
  fireResistance: z.string(),
  windResistance: z.string(),
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

export const PERGOLA_ROOF_TYPES = ["bioklimatyczny", "staly", "rozsuwany"] as const;
export type PergolaRoofType = (typeof PERGOLA_ROOF_TYPES)[number];

const pergolaSpecsShape = {
  roofType: z.enum(PERGOLA_ROOF_TYPES),
  roofMaterial: z.string(),
  dimensions: z.string(),
  windLoadRating: z.string(),
  snowLoadRating: z.string(),
  glazingType: z.string(),
  foundationType: z.string(),
};

// Kompletny kształt (wymagany od status = 'published'): każdy schemat jest
// .strict() (odrzuca nieznane pola) i wymaga wszystkich swoich pól (spec 0022
// AC-4, Feature design).
const publishedTechnicalSpecsSchemaByFamily = {
  dom: z.object(domSpecsShape).strict(),
  "spa-modulowe": z.object(spaModuloweSpecsShape).strict(),
  pergola: z.object(pergolaSpecsShape).strict(),
} satisfies Record<ProductFamily, z.ZodTypeAny>;

// Kształt dopuszczalny podczas status = 'draft': te same pola, wszystkie opcjonalne.
const draftTechnicalSpecsSchemaByFamily = {
  dom: publishedTechnicalSpecsSchemaByFamily.dom.partial(),
  "spa-modulowe": publishedTechnicalSpecsSchemaByFamily["spa-modulowe"].partial(),
  pergola: publishedTechnicalSpecsSchemaByFamily.pergola.partial(),
} satisfies Record<ProductFamily, z.ZodTypeAny>;

export function getTechnicalSpecsSchema(family: ProductFamily, status: "draft" | "published") {
  return status === "published"
    ? publishedTechnicalSpecsSchemaByFamily[family]
    : draftTechnicalSpecsSchemaByFamily[family];
}

export type DomTechnicalSpecs = z.infer<typeof publishedTechnicalSpecsSchemaByFamily.dom>;
export type SpaModuloweTechnicalSpecs = z.infer<
  (typeof publishedTechnicalSpecsSchemaByFamily)["spa-modulowe"]
>;
export type PergolaTechnicalSpecs = z.infer<typeof publishedTechnicalSpecsSchemaByFamily.pergola>;
