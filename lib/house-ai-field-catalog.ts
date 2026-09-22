export const HOUSE_AI_SCHEMA_VERSION = "house-import-v1" as const;
export const HOUSE_AI_TARGET_CURRENCY = "EUR" as const;

export type HouseAiOrigin = "extracted" | "inferred" | "generated" | "translated";

export type HouseAiValueKind =
  | "text"
  | "number"
  | "integer"
  | "boolean"
  | "enum"
  | "currency-cents";

export interface HouseAiFieldDefinition {
  path: string;
  labelKey: string;
  target: string;
  valueKind: HouseAiValueKind;
  allowedOrigins: readonly HouseAiOrigin[];
  tolerance?: number;
}

const extracted = ["extracted"] as const;
const extractedInferred = ["extracted", "inferred"] as const;
const extractedGenerated = ["extracted", "generated"] as const;

export const HOUSE_AI_FIELD_CATALOG = [
  { path: "product.name", labelKey: "productName", target: "product.name", valueKind: "text", allowedOrigins: extracted },
  { path: "product.description", labelKey: "productDescription", target: "product.description", valueKind: "text", allowedOrigins: extractedGenerated },
  { path: "product.floorAreaM2", labelKey: "productFloorArea", target: "product.floor_area_m2", valueKind: "number", allowedOrigins: extractedInferred, tolerance: 0.1 },
  { path: "product.bedrooms", labelKey: "productBedrooms", target: "product.bedrooms", valueKind: "integer", allowedOrigins: extractedInferred },
  { path: "product.countryOfProduction", labelKey: "productCountryOfProduction", target: "product.country_of_production", valueKind: "enum", allowedOrigins: extractedInferred },
  { path: "product.category", labelKey: "productCategory", target: "product.category", valueKind: "enum", allowedOrigins: extractedInferred },
  // wallBuildUp/insulation/windowClass/fireResistance/windResistance/
  // serviceScopeDescription/transportDimensions/craneRequirements/
  // minPlotWidthM usunięte z katalogu (spec 0049 AC-2): asystent AI już ich
  // nie proponuje, ekran przeglądu ich nie pokazuje. Rolę przejmuje jeden PDF
  // specyfikacji wgrywany przez producenta (AC-6).
  { path: "technical.energyClass", labelKey: "technicalEnergyClass", target: "technical_specs.heatTransferCoefficients", valueKind: "enum", allowedOrigins: extracted },
  { path: "technical.ventilation", labelKey: "technicalVentilation", target: "technical_specs.ventilation", valueKind: "enum", allowedOrigins: extractedInferred },
  { path: "technical.heatSource", labelKey: "technicalHeatSource", target: "technical_specs.heatSource", valueKind: "enum", allowedOrigins: extractedInferred },
  { path: "logistics.structuralWarrantyYears", labelKey: "logisticsStructuralWarranty", target: "product.structural_warranty_years", valueKind: "integer", allowedOrigins: extracted },
  { path: "logistics.installationWarrantyYears", labelKey: "logisticsInstallationWarranty", target: "product.installation_warranty_years", valueKind: "integer", allowedOrigins: extracted },
  { path: "compliance.simplifiedPermitEligible", labelKey: "complianceSimplifiedPermit", target: "product.simplified_permit_eligible", valueKind: "boolean", allowedOrigins: extracted },
  { path: "rooms[].name", labelKey: "roomName", target: "product.room_layout[].name", valueKind: "text", allowedOrigins: extracted },
  { path: "rooms[].areaM2", labelKey: "roomArea", target: "product.room_layout[].areaM2", valueKind: "number", allowedOrigins: extractedInferred, tolerance: 0.1 },
  { path: "rooms[].function", labelKey: "roomFunction", target: "product.room_layout[].function", valueKind: "text", allowedOrigins: extractedInferred },
  { path: "rooms[].isMezzanine", labelKey: "roomIsMezzanine", target: "product.room_layout[].isMezzanine", valueKind: "boolean", allowedOrigins: extractedInferred },
  { path: "variants[].completionStandard", labelKey: "variantCompletionStandard", target: "product_variant.completion_standard", valueKind: "enum", allowedOrigins: extractedInferred },
  { path: "variants[].variantLabel", labelKey: "variantLabel", target: "product_variant.variant_label", valueKind: "text", allowedOrigins: extracted },
  { path: "variants[].priceMinCents", labelKey: "variantPriceMin", target: "product_variant.price_min_cents", valueKind: "currency-cents", allowedOrigins: extracted, tolerance: 1 },
  { path: "variants[].priceMaxCents", labelKey: "variantPriceMax", target: "product_variant.price_max_cents", valueKind: "currency-cents", allowedOrigins: extracted, tolerance: 1 },
  { path: "variants[].scopeSummary", labelKey: "variantScopeSummary", target: "product_variant.scope_summary", valueKind: "text", allowedOrigins: extracted },
  { path: "variants[].costItems[].label", labelKey: "costItemLabel", target: "cost_line_item.label", valueKind: "text", allowedOrigins: extracted },
  { path: "variants[].costItems[].status", labelKey: "costItemStatus", target: "cost_line_item.status", valueKind: "enum", allowedOrigins: extractedInferred },
  { path: "variants[].costItems[].responsibleParty", labelKey: "costItemResponsibleParty", target: "cost_line_item.responsible_party", valueKind: "text", allowedOrigins: extracted },
  { path: "variants[].timeline[].stageKey", labelKey: "timelineStage", target: "product_timeline_stage.stage_key", valueKind: "enum", allowedOrigins: extractedInferred },
  { path: "variants[].timeline[].durationMinDays", labelKey: "timelineDurationMin", target: "product_timeline_stage.duration_min_days", valueKind: "integer", allowedOrigins: extractedInferred, tolerance: 1 },
  { path: "variants[].timeline[].durationMaxDays", labelKey: "timelineDurationMax", target: "product_timeline_stage.duration_max_days", valueKind: "integer", allowedOrigins: extractedInferred, tolerance: 1 },
  { path: "variants[].timeline[].startsFromLabel", labelKey: "timelineStartsFrom", target: "product_timeline_stage.starts_from_label", valueKind: "text", allowedOrigins: extracted },
  { path: "variants[].timeline[].responsibleParty", labelKey: "timelineResponsibleParty", target: "product_timeline_stage.responsible_party", valueKind: "text", allowedOrigins: extracted },
  { path: "faq[].question", labelKey: "faqQuestion", target: "product.faq[].question", valueKind: "text", allowedOrigins: extractedGenerated },
  { path: "faq[].answer", labelKey: "faqAnswer", target: "product.faq[].answer", valueKind: "text", allowedOrigins: extractedGenerated },
  { path: "translations.{locale}.name", labelKey: "translationName", target: "product_translation.name", valueKind: "text", allowedOrigins: ["translated"] },
  { path: "translations.{locale}.description", labelKey: "translationDescription", target: "product_translation.description", valueKind: "text", allowedOrigins: ["translated"] },
  { path: "translations.{locale}.rooms[].name", labelKey: "translationRoomName", target: "product_translation.room_layout[].name", valueKind: "text", allowedOrigins: ["translated"] },
  { path: "translations.{locale}.faq[].question", labelKey: "translationFaqQuestion", target: "product_translation.faq[].question", valueKind: "text", allowedOrigins: ["translated"] },
  { path: "translations.{locale}.faq[].answer", labelKey: "translationFaqAnswer", target: "product_translation.faq[].answer", valueKind: "text", allowedOrigins: ["translated"] },
  { path: "translations.{locale}.variants[].scopeSummary", labelKey: "translationVariantScope", target: "product_variant_translation.scope_summary", valueKind: "text", allowedOrigins: ["translated"] },
] as const satisfies readonly HouseAiFieldDefinition[];

export type HouseAiFieldPath = (typeof HOUSE_AI_FIELD_CATALOG)[number]["path"];
export type HouseAiFieldLabelKey = (typeof HOUSE_AI_FIELD_CATALOG)[number]["labelKey"];

export const HOUSE_AI_FIELD_PATHS = HOUSE_AI_FIELD_CATALOG.map((field) => field.path) as [
  HouseAiFieldPath,
  ...HouseAiFieldPath[],
];

export function getHouseAiField(path: HouseAiFieldPath): HouseAiFieldDefinition {
  const field = HOUSE_AI_FIELD_CATALOG.find((candidate) => candidate.path === path);
  if (!field) throw new Error(`Unknown house AI field path: ${path}`);
  return field;
}
