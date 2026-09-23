import type { ClientRequirementRow, ClientRequirementTranslationRow } from "../product-client-requirements";
import type { FaqRow, FaqTranslationRow } from "../product-faq";
import type { FloorLevel, RoomLayoutRow, RoomLayoutTranslationRow } from "../product-room-layout";

export type CountryCode = "PL" | "DE" | "NL";

export interface Country {
  code: CountryCode;
  name: string;
}

// "wynajem-hotel" dopisana spec 0041 AC-6, mirror productCategoryEnum
// (lib/db/schema.ts); dziś żaden produkt w katalogu pilotażowym jej nie używa.
export type ProjectCategory = "caloroczny" | "rekreacyjny-caloroczny" | "mobilny" | "wynajem-hotel";
export type CompletionStandard = "surowy-zamkniety" | "deweloperski" | "pod-klucz";

// Rodzina produktu (spec 0022), niezależna od ProjectCategory (który zostaje
// znaczący tylko dla family = "dom"). Project (klient, dane przykładowe)
// zachowuje swoje płaskie pola techniczne niezmienione — tylko ProjectDraft/
// SavedProduct (kreator producenta, spec 0016) przechodzą na family +
// technicalSpecs (spec 0022 Build plan, zadania 3, 6, 7). getProjects()
// filtruje do family "dom" (katalog wyszukiwania domów); dwa przykładowe
// wpisy spa-modulowe/kontenery-modulowe istnieją tylko jako teaser
// CategoryShowcase na stronie głównej (getFeaturedProjectByFamily), z polami
// myślanymi pod dom dopasowanymi tam gdzie to ma sens i pustymi tam, gdzie
// nie (patrz komentarz przy tych dwóch wpisach w fixtures/projects.ts).
// "pergola" zastąpiona przez "kontenery-modulowe" (spec 0039).
export type ProductFamily = "dom" | "spa-modulowe" | "kontenery-modulowe";
export type SpaSubcategory = "sauna" | "jacuzzi" | "wellness-combo";
// Zastępuje dawny PergolaSubcategory (spec 0039): trzy zastosowania kontenera
// modułowego, każde z własnym kształtem technicalSpecs (patrz
// lib/product-technical-specs.ts), pierwszy przypadek, gdzie subcategory
// decyduje o kształcie, nie tylko o klasyfikacji.
export type ContainerSubcategory = "gastronomiczne" | "uslugowe" | "mieszkalne";

// Kitchen-sink: pola wszystkich trzech rodzin naraz, opcjonalne. Które pola są
// znaczące zależy od ProjectDraft.family (i, dla kontenery-modulowe, od
// containerSubcategory) — patrz TECHNICAL_FIELDS_BY_FAMILY /
// CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY w lib/producer-project-draft.ts.
// Kompletność per rodzina/podkategoria jest sprawdzana przez schemat Zod
// (lib/product-technical-specs.ts), nie przez ten typ.
export interface ProductTechnicalSpecsDraft {
  // dom
  wallBuildUp?: string;
  insulation?: string;
  /** Pasmo klasy energetycznej, nie opisowy współczynnik U (spec 0026, nazwa pola
   * zostaje dla ciągłości historii Zod/bazy — patrz lib/product-technical-specs.ts). */
  heatTransferCoefficients?: import("../product-technical-specs").EnergyClass;
  windowClass?: string;
  ventilation?: import("../product-technical-specs").VentilationType;
  /** Znaczący tylko gdy ventilation === "inna" (spec 0050 AC-20). */
  ventilationOther?: string;
  heatSource?: import("../product-technical-specs").HeatSource;
  /** Znaczący tylko gdy heatSource === "inne" (spec 0050 AC-20). */
  heatSourceOther?: string;
  /** Nowe pole (spec 0050 AC-20). */
  constructionTechnology?: import("../product-technical-specs").ConstructionTechnology;
  /** Znaczący tylko gdy constructionTechnology === "inne". */
  constructionTechnologyOther?: string;
  fireResistance?: string;
  windResistance?: string;
  // spa-modulowe
  seatingCapacity?: number;
  waterVolumeLiters?: number;
  heatingType?: "electric" | "heat-pump" | "wood-fired";
  filtrationSystem?: string;
  shellMaterial?: string;
  electricalRequirement?: string;
  // kontenery-modulowe, wspólne trzem podkategoriom (spec 0039)
  dimensions?: string;
  structureMaterial?: string;
  insulationType?: string;
  // kontenery-modulowe: gastronomiczne
  kitchenEquipmentType?: string;
  extractionVentilation?: string;
  electricalPower?: string;
  waterSupplyType?: string;
  wasteWaterHandling?: string;
  // kontenery-modulowe: uslugowe
  intendedUse?: string;
  electricalInstallation?: string;
  // kontenery-modulowe: mieszkalne
  sleepingCapacity?: number;
  bathroomIncluded?: boolean;
  /** Nazwane spaceHeatingType, nie heatingType: heatingType już niesie typ
   * ogrzewania wody spa (inny typ) w tym samym współdzielonym interfejsie
   * (spec 0039 Feature design). Współdzielone przez uslugowe i mieszkalne. */
  spaceHeatingType?: string;
  // wspólne (spa i kontenery-modulowe)
  foundationType?: string;
}

// Warianty produktu (spec 0041/0042): zastępują dawny płaski
// ProjectCommercialProfile. Każdy wariant niesie własną, pełną parę cena i
// zakres, więc cena nigdy nie może być pokazana obok zakresu innego standardu
// (spec 0042 Kluczowe niezmienniki).
export type CostLineItemStatus =
  | "w-cenie"
  | "obowiazkowa-doplata"
  | "opcja"
  | "po-stronie-klienta"
  | "do-wyceny";

export interface CostLineItem {
  id: string;
  label: string;
  status: CostLineItemStatus;
  responsibleParty?: string;
}

export type TimelineStageKey = "formalnosci" | "produkcja" | "transport" | "montaz" | "wykonczenie";

export interface TimelineStage {
  stageKey: TimelineStageKey;
  durationMinDays?: number;
  durationMaxDays?: number;
  startsFromLabel?: string;
  responsibleParty?: string;
}

export interface ProjectVariant {
  id: string;
  completionStandard: CompletionStandard;
  variantLabel?: string;
  // Spec 0051 AC-1: jedna cena "od" na wariant, price_max_cents usunięty z
  // bazy (schema fazy 1/2, kolumna fizycznie usunięta w fazie 3).
  priceMin?: number;
  currency: "EUR";
  // Spec 0050 AC-13, AC-37: gdy true, priceMin jest zawsze undefined
  // (wymuszone CHECK-em product_variant_price_on_request), karta klienta
  // pokazuje "wycena indywidualna" zamiast liczby i wariant jest wykluczony z
  // filtrowania/sortowania po cenie (lib/results-filters.ts#sortResults).
  priceOnRequest: boolean;
  isDefault: boolean;
  costLineItems: CostLineItem[];
  timelineStages: TimelineStage[];
  /** True for a synthetic entry standing in for a completion standard that
   * has no real `product_variant` row yet (see getDisplayProjectVariants).
   * Never set by the data layer itself — only by presentation code that
   * fills the fixed 3-standard picker so the layout renders before the
   * producer has entered real variant data. */
  isPlaceholder?: boolean;
}

export interface RoomLayoutEntry {
  name: string;
  areaM2?: number;
  function?: string;
  // Zastępuje dawne isMezzanine (spec 0050 AC-8): migracja starych wierszy
  // (isMezzanine: true -> floorLevel: "poddasze") dzieje się przy odczycie w
  // lib/data/projects.ts, ten typ widzi już tylko wynik.
  floorLevel?: FloorLevel;
}

export interface ProjectFaqItem {
  question: string;
  answer: string;
}

// Tylko te trzy wartości document_purpose dotyczą kart projektu klienta
// (spec 0041 AC-9); reszta enuma (order_stage, company_verification,
// producer_photo) żyje poza tym ekranem.
export type ProjectDocumentPurpose = "product_photo" | "product_floor_plan" | "product_realization_photo" | "product_specification";

export interface ProjectDocument {
  url: string;
  purpose: ProjectDocumentPurpose;
  /** Puste znaczy: dokument dotyczy każdego wariantu produktu (spec 0041 AC-4). */
  productVariantId?: string;
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
  // Spec 0051 AC-1: jedna cena "od", priceMax usunięty.
  priceMin: number;
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
  // Osobna, pełna para cena/zakres na standard wykończenia (spec 0041/0042),
  // zastępuje dawny płaski Project.commercial. Pusta tablica (produkt bez
  // żadnego aktywnego wariantu) renderuje się jak priceOnRequest (spec 0042
  // AC-11), nigdy jako "od undefined €".
  variants: ProjectVariant[];
  /** Puste lub brak → sekcja "Układ domu" nie renderuje się (spec 0042 AC-4). */
  roomLayout?: RoomLayoutEntry[];
  /** Zdjęcia/rzuty produktu z ich purpose i opcjonalnym wariantem (spec 0042 AC-7, AC-8). */
  documents: ProjectDocument[];
  /** Pytania i odpowiedzi specyficzne dla modelu (sekcja "Dokumenty i pytania"
   * na karcie projektu). Puste lub brak → sekcja pokazuje placeholder "do
   * uzupełnienia", ten sam wzorzec co roomLayout wyżej. */
  faq?: ProjectFaqItem[];
  /** Co musi zapewnić klient, niezależnie od standardu (spec 0050 AC-23,
   * AC-35): puste lub brak → sekcja nie renderuje się, ten sam wzorzec co
   * roomLayout/faq wyżej. `label` jest już rozwiązane pod aktywny locale dla
   * pozycji własnych (custom: true); pozycje katalogowe (custom: false)
   * tłumaczy strona klienta przez `key` i katalog opcji (ProjectOptions),
   * ten sam wzorzec co inne katalogowe etykiety w tym pliku. */
  clientRequirements?: ClientRequirementRow[];
  /** Logistyka i serwis (spec 0041 AC-9), każde pole renderuje się niezależnie
   * tylko gdy jest wypełnione (spec 0042 AC-5). */
  installationWarrantyYears?: number;
  serviceScopeDescription?: string;
  transportDimensions?: string;
  craneRequirements?: string;
  minPlotWidthM?: number;
  featured: boolean;
  /** Gdy true, priceMin nie jest pokazywany nigdzie na stronie projektu ani na
   * kartach — w jego miejscu widoczne jest tylko CTA zapytania (spec 0020 AC-5). */
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
  /** Zamówienia tego producenta, które doszły do etapu odbioru lub gwarancji
   * (order.currentStage), czyli dom faktycznie trafił do klienta. */
  completedProjectsCount: number;
  /** Wolny tekst, np. "2 dni robocze"; puste → linia zaufania się nie pokazuje (spec 0042 AC-10). */
  inquiryResponseTimeLabel?: string;
  /** Trzy stany: true, false, null (nieznane); null renderuje się jawnie jako
   * "do potwierdzenia", nigdy jako ciche "nie" (spec 0042 AC-9). */
  showroomVisitAvailable: boolean | null;
  /** Znacząca tylko gdy showroomVisitAvailable === true (spec 0042 Feature design). */
  showroomVisitNote?: string;
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
  // Opcjonalne tłumaczenia EN/NL/DE opisu (spec 0028 AC-5, AC-16, rozszerzone
  // spec 0050 AC-28 do AC-34): polski (description) zostaje wymaganym tekstem
  // źródłowym, te pola mogą zostać puste — strona klienta wtedy pokazuje
  // polski tekst (AC-6). Wypełniane wyłącznie w kroku "Tłumaczenia"
  // (ProjectWizardTranslationsStep, jedyne miejsce z zakładkami językowymi w
  // obu kreatorach od spec 0050 AC-31/AC-32). Zawsze konkretny (choćby pusty)
  // string tutaj: to stan formularza w przeglądarce, nie payload zapisu —
  // patrz ProducerProductFields (lib/producer-product-actions.ts), gdzie te
  // pola są opcjonalne. `name` nie jest już tłumaczone wcale (spec 0050 AC-2):
  // jedna, wspólna wartość dla wszystkich języków, żadnego pola *En/*Nl/*De.
  descriptionEn: string;
  descriptionNl: string;
  descriptionDe: string;
  // Niezmienna po utworzeniu produktu (spec 0022 AC-7): ścieżka edycji nie
  // pokazuje selektora, a updateProduct (lib/producer-products.ts) ignoruje
  // to pole z draftu i zachowuje wartość istniejącego produktu.
  family: ProductFamily | null;
  // Znaczące tylko dla family dopasowanej do jej nazwy (spec 0022 AC-2, AC-3):
  // category dla "dom", spaSubcategory dla "spa-modulowe", containerSubcategory
  // dla "kontenery-modulowe".
  category: ProjectCategory | null;
  spaSubcategory: SpaSubcategory | null;
  containerSubcategory: ContainerSubcategory | null;
  technicalSpecs: ProductTechnicalSpecsDraft;
  // Uklad pomieszczen (spec 0045 AC-5): zapisywany do product.room_layout,
  // ten sam stabilny-id wzorzec co lib/product-room-layout.ts. Tlumaczenia
  // (AC-10, DE dodane spec 0050 AC-28) dopasowane po tym samym id, moga byc
  // krotsze niz lista polska.
  roomLayout: RoomLayoutRow[];
  roomLayoutEn: RoomLayoutTranslationRow[];
  roomLayoutNl: RoomLayoutTranslationRow[];
  roomLayoutDe: RoomLayoutTranslationRow[];
  // FAQ produktu (spec 0045 AC-6): zapisywany do product.faq, ten sam wzorzec
  // co roomLayout wyzej.
  faq: FaqRow[];
  faqEn: FaqTranslationRow[];
  faqNl: FaqTranslationRow[];
  faqDe: FaqTranslationRow[];
  // Co musi zapewnic klient, niezaleznie od wybranego standardu (spec 0050
  // AC-23): zapisywany do product.client_requirements, ten sam wzorzec co
  // roomLayout/faq wyzej. Tlumaczenie wlasnych pozycji (custom: true, AC-28)
  // dopasowane po tym samym id; pozycje katalogowe (custom: false) nie maja
  // tu odpowiednika (tlumacza sie z katalogu opcji przy odczycie).
  clientRequirements: ClientRequirementRow[];
  clientRequirementsEn: ClientRequirementTranslationRow[];
  clientRequirementsNl: ClientRequirementTranslationRow[];
  clientRequirementsDe: ClientRequirementTranslationRow[];
  floorPlanFiles: MockUploadedFile[];
  photoFiles: MockUploadedFile[];
  // Gwarancja konstrukcyjna (dom/materialy), niezalezna od
  // installationWarrantyYears nizej (montaz) — patrz lib/db/schema.ts komentarz
  // przy product.structuralWarrantyYears. Dawniej zbierana w usunietym kroku
  // "Cena", teraz w sekcji logistyki kroku "Dane techniczne" (spec 0045 zadanie 9).
  structuralWarrantyYears: number | null;
  // Logistyka i zgodnosc (spec 0045 AC-8): sekcja w kroku "Dane techniczne",
  // czysto deklaratywne pola producenta, bez zadnej reguly wyliczajacej.
  installationWarrantyYears: number | null;
  serviceScopeDescription: string;
  transportDimensions: string;
  craneRequirements: string;
  minPlotWidthM: number | null;
  // Trzy stany (spec 0045 AC-8): null = nieustawiony (nigdy traktowany jako
  // "nie"), true/false = jawna deklaracja producenta.
  simplifiedPermitEligible: boolean | null;
  // Migawka rzeczywistego stanu wariantów (spec 0045 AC-1, AC-4), utrzymywana
  // przez ProjectWizardVariantsStep przez onVariantsSummaryChange — ten sam
  // wzorzec co photoFiles wyżej: prawdziwe dane żyją w product_variant przez
  // osobne akcje serwerowe (lib/producer-product-variant-actions.ts), to pole
  // istnieje wyłącznie po to, żeby isStepComplete("warianty", ...) miało co
  // sprawdzić bez czytania bazy z poziomu czystej funkcji walidującej.
  variantsSummary: { isDefault: boolean; priceMinCents: number | null }[];
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
  nameEn: string;
  nameNl: string;
  descriptionEn: string;
  descriptionNl: string;
  family: ProductFamily;
  category: ProjectCategory | null;
  spaSubcategory: SpaSubcategory | null;
  containerSubcategory: ContainerSubcategory | null;
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
