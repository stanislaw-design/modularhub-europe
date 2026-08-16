export type CountryCode = "PL" | "DE" | "NL";

export interface Country {
  code: CountryCode;
  name: string;
}

export interface Project {
  id: string;
  producerId: string;
  producerName: string;
  name: string;
  countryOfProduction: CountryCode;
  floorAreaM2: number;
  bedrooms: number;
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
