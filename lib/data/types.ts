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
}

export type EligibilityStatus = "approved" | "conditional" | "blocked";

export interface EligibilityByCountry {
  projectId: string;
  countryCode: CountryCode;
  status: EligibilityStatus;
  reason: string;
}
