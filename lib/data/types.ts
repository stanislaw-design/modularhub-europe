export type CountryCode = "PL" | "DE" | "NL";

export interface Country {
  code: CountryCode;
  name: string;
}

export type ProjectCategory = "caloroczny" | "rekreacyjny-caloroczny" | "mobilny";
export type CompletionStandard = "surowy-zamkniety" | "deweloperski" | "pod-klucz";

export interface ProjectCommercialProfile {
  /** Cena samego budynku w standardzie bazowym, bez logistyki i montażu. */
  housePriceMinEur: number;
  housePriceMaxEur: number;
  completionStandard: CompletionStandard;
  productionLeadTimeWeeksMin: number;
  productionLeadTimeWeeksMax: number;
  onSiteAssemblyDaysMin: number;
  onSiteAssemblyDaysMax: number;
  priceIncludes: string[];
  priceExcludes: string[];
}

export interface Project {
  id: string;
  producerId: string;
  producerName: string;
  name: string;
  countryOfProduction: CountryCode;
  floorAreaM2: number;
  builtUpAreaM2: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  storeys: number;
  externalDimensions: string;
  roofType: string;
  category: ProjectCategory;
  constructionSystem: string;
  foundationOptions: string;
  customizationScope: string;
  structuralWarrantyYears: number;
  priceMin: number;
  priceMax: number;
  currency: "EUR";
  coverImageUrl: string;
  description: string;
  wallBuildUp: string;
  insulation: string;
  heatTransferCoefficients: string;
  windowClass: string;
  ventilation: string;
  heatSource: string;
  fireResistance: string;
  windResistance: string;
  commercial: ProjectCommercialProfile;
  featured: boolean;
}

export type EligibilityStatus = "approved" | "conditional" | "blocked";

export interface EligibilityByCountry {
  projectId: string;
  countryCode: CountryCode;
  status: EligibilityStatus;
  reason: string;
}

export interface PlotAnalysisResult {
  projectId: string;
  status: EligibilityStatus;
  reason: string;
}

export interface ExportReadinessCountryStatus {
  countryCode: CountryCode;
  status: EligibilityStatus;
  reason: string;
  gaps: string[];
}

export interface MockUploadedFile {
  name: string;
  sizeBytes: number;
}

export interface ProjectDraft {
  name: string;
  floorAreaM2: number | null;
  bedrooms: number | null;
  countryOfProduction: CountryCode | null;
  description: string;
  wallBuildUp: string;
  insulation: string;
  heatTransferCoefficients: string;
  windowClass: string;
  ventilation: string;
  heatSource: string;
  fireResistance: string;
  windResistance: string;
  floorPlanFiles: MockUploadedFile[];
  photoFiles: MockUploadedFile[];
}

export type FulfillmentStageName = "produkcja" | "transport" | "montaz" | "odbior" | "gwarancja";

export interface FulfillmentDocument {
  name: string;
  type: "pdf" | "image";
}

export interface FulfillmentStage {
  name: FulfillmentStageName;
  reachedAt: string | null;
  documents: FulfillmentDocument[];
}

export interface FulfillmentOrder {
  projectId: string;
  currentStage: FulfillmentStageName;
  stages: FulfillmentStage[];
}

export interface ProducerInquiry {
  id: string;
  projectId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  deliveryCountry: CountryCode;
  receivedAt: string;
}
