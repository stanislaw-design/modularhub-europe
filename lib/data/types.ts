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
  /** Gdy true, priceMin/priceMax nie są pokazywane nigdzie na stronie projektu ani na
   * kartach — w ich miejscu widoczne jest tylko CTA zapytania (spec 0020 AC-5). */
  priceOnRequest?: boolean;
  /** Puste lub brak → sekcja "Certyfikaty" nie renderuje się (spec 0020 AC-4). */
  certifications?: string[];
  /** Jawnie wpisywane przez dane przykładowe, nie liczone automatycznie z metrażu —
   * realny silnik zgodności to osobna, przyszła funkcja (spec 0020 Feature design). */
  simplifiedPermitEligible?: boolean;
  /** coverImageUrl zostaje pierwszym/głównym zdjęciem; puste lub brak → brak dodatkowej
   * galerii, hero pokazuje samo coverImageUrl (spec 0020 Feature design). */
  galleryImageUrls?: string[];
}

export interface Producer {
  id: string;
  name: string;
  countryCode: CountryCode;
  rating: number;
  reviewCount: number;
  modelsCount: number;
  sizeRangeM2Min: number;
  sizeRangeM2Max: number;
  deliveryCountries: CountryCode[];
  featuredPhotoUrl: string;
  verified: boolean;
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
  housePriceMinEur: number | null;
  housePriceMaxEur: number | null;
  completionStandard: CompletionStandard | null;
  productionLeadTimeWeeksMin: number | null;
  productionLeadTimeWeeksMax: number | null;
  onSiteAssemblyDaysMin: number | null;
  onSiteAssemblyDaysMax: number | null;
  structuralWarrantyYears: number | null;
  category: ProjectCategory | null;
}

// Kompletny, zapisany produkt katalogu producenta (spec 0016): te same pola co
// ProjectDraft, ale z właściwymi, nienullowalnymi typami (draft dopuszcza null w
// trakcie wypełniania formularza, zapisany produkt jest już kompletny). Nigdy
// `ProjectDraft & {...}` wprost, patrz spec 0016 Feature design.
export interface SavedProduct {
  id: string;
  name: string;
  floorAreaM2: number;
  bedrooms: number;
  countryOfProduction: CountryCode;
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
  housePriceMinEur: number;
  housePriceMaxEur: number;
  completionStandard: CompletionStandard;
  productionLeadTimeWeeksMin: number;
  productionLeadTimeWeeksMax: number;
  onSiteAssemblyDaysMin: number;
  onSiteAssemblyDaysMax: number;
  structuralWarrantyYears: number;
  category: ProjectCategory;
  createdAt: string;
  updatedAt: string;
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
