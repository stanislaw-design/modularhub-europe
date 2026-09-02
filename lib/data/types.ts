export type CountryCode = "PL" | "DE" | "NL";

export interface Country {
  code: CountryCode;
  name: string;
}

export type ProjectCategory = "caloroczny" | "rekreacyjny-caloroczny" | "mobilny";
export type CompletionStandard = "surowy-zamkniety" | "deweloperski" | "pod-klucz";

// Rodzina produktu (spec 0022), niezależna od ProjectCategory (który zostaje
// znaczący tylko dla family = "dom"). Project (klient, dane przykładowe)
// zachowuje swoje płaskie pola techniczne niezmienione — tylko ProjectDraft/
// SavedProduct (kreator producenta, spec 0016) przechodzą na family +
// technicalSpecs (spec 0022 Build plan, zadania 3, 6, 7). getProjects()
// filtruje do family "dom" (katalog wyszukiwania domów); dwa przykładowe
// wpisy spa-modulowe/pergola istnieją tylko jako teaser CategoryShowcase na
// stronie głównej (getFeaturedProjectByFamily), z polami myślanymi pod dom
// dopasowanymi tam gdzie to ma sens i pustymi tam, gdzie nie (patrz komentarz
// przy tych dwóch wpisach w fixtures/projects.ts).
export type ProductFamily = "dom" | "spa-modulowe" | "pergola";
export type SpaSubcategory = "sauna" | "jacuzzi" | "wellness-combo";
export type PergolaSubcategory =
  | "bioklimatyczna"
  | "aluminiowa-stala"
  | "drewniana"
  | "wolnostojaca-przyscienna";

// Kitchen-sink: pola wszystkich trzech rodzin naraz, opcjonalne. Które pola są
// znaczące zależy od ProjectDraft.family — patrz TECHNICAL_FIELDS_BY_FAMILY w
// lib/producer-project-draft.ts. Kompletność per rodzina jest sprawdzana przez
// schemat Zod (lib/product-technical-specs.ts), nie przez ten typ.
export interface ProductTechnicalSpecsDraft {
  // dom
  wallBuildUp?: string;
  insulation?: string;
  heatTransferCoefficients?: string;
  windowClass?: string;
  ventilation?: string;
  heatSource?: string;
  fireResistance?: string;
  windResistance?: string;
  // spa-modulowe
  seatingCapacity?: number;
  waterVolumeLiters?: number;
  heatingType?: "electric" | "heat-pump" | "wood-fired";
  filtrationSystem?: string;
  shellMaterial?: string;
  electricalRequirement?: string;
  // pergola
  roofType?: "bioklimatyczny" | "staly" | "rozsuwany";
  roofMaterial?: string;
  dimensions?: string;
  windLoadRating?: string;
  snowLoadRating?: string;
  glazingType?: string;
  // wspólne (spa i pergola)
  foundationType?: string;
}

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
  // Zawsze "dom" dziś: dane przykładowe i lokalny podgląd (lib/local-client-projects.ts)
  // reprezentują wyłącznie domy (spec 0022, Build plan zadanie 6).
  family: ProductFamily;
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
  // Niezmienna po utworzeniu produktu (spec 0022 AC-7): ścieżka edycji nie
  // pokazuje selektora, a updateProduct (lib/producer-products.ts) ignoruje
  // to pole z draftu i zachowuje wartość istniejącego produktu.
  family: ProductFamily | null;
  // Znaczące tylko dla family dopasowanej do jej nazwy (spec 0022 AC-2, AC-3):
  // category dla "dom", spaSubcategory dla "spa-modulowe", pergolaSubcategory
  // dla "pergola".
  category: ProjectCategory | null;
  spaSubcategory: SpaSubcategory | null;
  pergolaSubcategory: PergolaSubcategory | null;
  technicalSpecs: ProductTechnicalSpecsDraft;
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
  family: ProductFamily;
  category: ProjectCategory | null;
  spaSubcategory: SpaSubcategory | null;
  pergolaSubcategory: PergolaSubcategory | null;
  technicalSpecs: ProductTechnicalSpecsDraft;
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
