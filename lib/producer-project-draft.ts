import type { useTranslations } from "next-intl";
import type { ProducerProductFields } from "./producer-product-actions";
import {
  CLIENT_REQUIREMENT_CATALOG_KEYS,
  type ClientRequirementCatalogKey,
  type ClientRequirementRow,
  type ClientRequirementTranslationRow,
} from "./product-client-requirements";
import type { FaqRow, FaqTranslationRow } from "./product-faq";
import { FLOOR_LEVELS, type FloorLevel, type RoomLayoutRow, type RoomLayoutTranslationRow } from "./product-room-layout";
import { CONSTRUCTION_TECHNOLOGIES, ENERGY_CLASSES, HEAT_SOURCES, VENTILATION_TYPES } from "./product-technical-specs";
import type {
  CompletionStandard,
  ContainerSubcategory,
  CostLineItemStatus,
  ProductFamily,
  ProjectCategory,
  ProjectDraft,
  SpaSubcategory,
  TimelineStageKey,
} from "./data/types";

// Callable shape shared by client `useTranslations()` and awaited server
// `getTranslations()` (next-intl, spec 0028): lets the get*Options helpers
// below accept either without depending on one entry point.
type Translate = ReturnType<typeof useTranslations>;

export type WizardStepId = "podstawowe" | "techniczne" | "pliki" | "warianty" | "faq" | "tlumaczenia" | "podsumowanie";

export interface WizardStep {
  id: WizardStepId;
  label: string;
}

// Krok 1 zbiera family i podkategorię (spec 0022 AC-6), plus uklad pomieszczen
// (spec 0045 AC-5); dawne trzy kroki techniczne domu (konstrukcja/instalacje/
// odpornosc) zwijają się w jeden krok "techniczne", ktorego pola zależą od
// family i ktory od zadania 9 niesie tez sekcje logistyki i zgodnosci (AC-8).
//
// Dawny krok "cena" zostal usuniety (spec 0045 Build plan zadanie 12): jego
// pola cenowe (housePriceMinEur/Max, completionStandard) i stara reguła
// walidacji zastapione przez "warianty" (product_variant z cena minimalna,
// AC-4/AC-17); termin produkcji/montazu (productionLeadTimeWeeksMin/Max,
// onSiteAssemblyDaysMin/Max) sa superseded przez product_timeline_stage per
// wariant (spec 0041) i przestaly byc zbierane; gwarancja konstrukcyjna
// (structuralWarrantyYears) przeniosla sie do sekcji logistyki kroku
// "techniczne", bo nadal jest realnie wyswietlana klientowi (patrz
// ProjectTechnicalSpecs.tsx), w odroznieniu od pol superseded wyzej.
// Kolejnosc reorganizowana docelowo dopiero w zadaniu 17 (audyt, AC-20) —
// ta lista zostaje w dzisiejszej kolejnosci (podstawowe/techniczne/pliki),
// tylko z "cena" usunieta i "faq" dodanym po "warianty".
export const WIZARD_STEPS: WizardStep[] = [
  { id: "podstawowe", label: "Informacje podstawowe" },
  { id: "techniczne", label: "Dane techniczne" },
  { id: "pliki", label: "Pliki" },
  { id: "warianty", label: "Warianty i cennik" },
  { id: "faq", label: "FAQ" },
  { id: "tlumaczenia", label: "Tłumaczenia" },
  { id: "podsumowanie", label: "Podsumowanie" },
];

export const FLOOR_AREA_MIN_M2 = 20;
export const FLOOR_AREA_MAX_M2 = 500;
export const BEDROOMS_MIN = 0;
export const BEDROOMS_MAX = 10;

// Etykiety wybierane przez t() z namespace "ProjectOptions" (messages/*.json,
// spec 0028 AC-1: "etykiety filtrów/enumów"), value listy zostają value listami
// (klucze domenowe, nie tekst). Współdzielone przez kreator, edycję produktu i
// SubcategoryFilterBar (klient) — jedno źródło etykiet, nie duplikat per ekran.
export function getCompletionStandardOptions(t: Translate): { value: CompletionStandard; label: string }[] {
  return [
    { value: "surowy-zamkniety", label: t("completionStandard.surowy-zamkniety") },
    { value: "deweloperski", label: t("completionStandard.deweloperski") },
    { value: "pod-klucz", label: t("completionStandard.pod-klucz") },
  ];
}

export function getProductFamilyOptions(t: Translate): { value: ProductFamily; label: string }[] {
  return [
    { value: "dom", label: t("family.dom") },
    { value: "spa-modulowe", label: t("family.spa-modulowe") },
    { value: "kontenery-modulowe", label: t("family.kontenery-modulowe") },
  ];
}

// Spec 0050 AC-5, AC-8: kondygnacja pomieszczenia, zastępuje dawne isMezzanine.
export function getFloorLevelOptions(t: Translate): { value: FloorLevel; label: string }[] {
  return FLOOR_LEVELS.map((value) => ({ value, label: t(`floorLevel.${value}`) }));
}

export function getProjectCategoryOptions(t: Translate): { value: ProjectCategory; label: string }[] {
  return [
    { value: "caloroczny", label: t("category.caloroczny") },
    { value: "rekreacyjny-caloroczny", label: t("category.rekreacyjny-caloroczny") },
    { value: "mobilny", label: t("category.mobilny") },
  ];
}

export function getSpaSubcategoryOptions(t: Translate): { value: SpaSubcategory; label: string }[] {
  return [
    { value: "sauna", label: t("spaSubcategory.sauna") },
    { value: "jacuzzi", label: t("spaSubcategory.jacuzzi") },
    { value: "wellness-combo", label: t("spaSubcategory.wellness-combo") },
  ];
}

export function getContainerSubcategoryOptions(t: Translate): { value: ContainerSubcategory; label: string }[] {
  return [
    { value: "gastronomiczne", label: t("containerSubcategory.gastronomiczne") },
    { value: "uslugowe", label: t("containerSubcategory.uslugowe") },
    { value: "mieszkalne", label: t("containerSubcategory.mieszkalne") },
  ];
}

// Spec 0045 AC-1: te same pięć statusów, które ProjectCostComparisonTable
// (klient) już tłumaczy pod swoim własnym namespace — zduplikowane tu pod
// ProjectOptions zamiast reużyte wprost, żeby zachować konwencję "jedno
// źródło etykiet dla kreatora/edycji" z komentarza wyżej bez łączenia
// namespace'u klienta z namespace'em producenta.
export function getCostLineItemStatusOptions(t: Translate): { value: CostLineItemStatus; label: string }[] {
  return [
    { value: "w-cenie", label: t("costLineItemStatus.w-cenie") },
    { value: "obowiazkowa-doplata", label: t("costLineItemStatus.obowiazkowa-doplata") },
    { value: "opcja", label: t("costLineItemStatus.opcja") },
    { value: "po-stronie-klienta", label: t("costLineItemStatus.po-stronie-klienta") },
    { value: "do-wyceny", label: t("costLineItemStatus.do-wyceny") },
  ];
}

// Spec 0045 AC-1: kolejność stała, zgodna z product_timeline_stage_key (pięć
// etapów realizacji, ten sam porządek co ProjectTimeline po stronie klienta).
export const TIMELINE_STAGE_KEYS: TimelineStageKey[] = [
  "formalnosci",
  "produkcja",
  "transport",
  "montaz",
  "wykonczenie",
];

export function getTimelineStageKeyOptions(t: Translate): { value: TimelineStageKey; label: string }[] {
  return TIMELINE_STAGE_KEYS.map((value) => ({ value, label: t(`timelineStageKey.${value}`) }));
}

// Zamknięte listy dla trzech pól technicznych domu (spec 0026 AC-2, Feature design),
// zastępujące dawne pola tekstowe w kreatorze. HEAT_SOURCES/VENTILATION_TYPES/
// ENERGY_CLASSES pochodzą z lib/product-technical-specs.ts (ten sam Zod, który
// waliduje zapis) — etykiety tylko tu, bo enum tam nie niesie tekstu dla klienta.
const HEAT_SOURCE_LABELS: Record<(typeof HEAT_SOURCES)[number], string> = {
  "pompa-ciepla-powietrze-woda": "Pompa ciepła powietrze-woda",
  "pompa-ciepla-grunt-woda": "Pompa ciepła gruntowa (grunt-woda)",
  gazowe: "Gazowe",
  elektryczne: "Elektryczne",
  "biomasa-pellet": "Biomasa / pellet",
  inne: "Inne",
};
export const HEAT_SOURCE_OPTIONS: { value: (typeof HEAT_SOURCES)[number]; label: string }[] = HEAT_SOURCES.map(
  (value) => ({ value, label: HEAT_SOURCE_LABELS[value] }),
);

const VENTILATION_TYPE_LABELS: Record<(typeof VENTILATION_TYPES)[number], string> = {
  grawitacyjna: "Grawitacyjna",
  "mechaniczna-nawiewno-wywiewna": "Mechaniczna nawiewno-wywiewna",
  rekuperacja: "Rekuperacja (mechaniczna z odzyskiem ciepła)",
  brak: "Brak",
  inna: "Inna",
};
export const VENTILATION_TYPE_OPTIONS: { value: (typeof VENTILATION_TYPES)[number]; label: string }[] =
  VENTILATION_TYPES.map((value) => ({ value, label: VENTILATION_TYPE_LABELS[value] }));

// "nieznana" wraca jako prawdziwa opcja wyboru, relabelowana "Nie podano"
// (spec 0050 AC-20): pole jest teraz jawnie opcjonalne w kreatorze, nie
// tylko domyślna wartość jednorazowego backfillu (spec 0026 AC-12).
export const ENERGY_CLASS_OPTIONS: { value: (typeof ENERGY_CLASSES)[number]; label: string }[] = ENERGY_CLASSES.map(
  (value) => ({ value, label: value === "nieznana" ? "Nie podano" : `Klasa ${value}` }),
);

const CONSTRUCTION_TECHNOLOGY_LABELS: Record<(typeof CONSTRUCTION_TECHNOLOGIES)[number], string> = {
  "szkielet-drewniany": "Szkielet drewniany",
  "modulowa-stal-lekka": "Modułowa (stal lekka)",
  "plyta-warstwowa-sip": "Płyta warstwowa (SIP)",
  "beton-modulowy": "Beton modułowy",
  inne: "Inna",
};
export const CONSTRUCTION_TECHNOLOGY_OPTIONS: { value: (typeof CONSTRUCTION_TECHNOLOGIES)[number]; label: string }[] =
  CONSTRUCTION_TECHNOLOGIES.map((value) => ({ value, label: CONSTRUCTION_TECHNOLOGY_LABELS[value] }));

// Katalog gotowych pozycji "Co musi zapewnić klient" (spec 0050 AC-23):
// etykieta zapisana wprost w wierszu przy zaznaczeniu (patrz Szkic modelu
// danych spec 0050), nie tylko wyprowadzana z key przy każdym renderze, żeby
// product.client_requirements niosło pełny, czytelny opis nawet bez
// ponownego przejścia przez ten katalog (np. przy ręcznym odczycie z Neon MCP).
// Producencki kreator jest dziś wyłącznie polski (locale "pl" jedyny aktywny,
// AGENTS.md), więc ta sama t() daje zarówno etykietę wyświetlaną, jak i
// zapisywaną — jedno źródło prawdy, ten sam wzorzec co pozostałe opcje w tym pliku.
export function getClientRequirementCatalogOptions(t: Translate): { value: ClientRequirementCatalogKey; label: string }[] {
  return CLIENT_REQUIREMENT_CATALOG_KEYS.map((value) => ({ value, label: t(`clientRequirementCatalog.${value}`) }));
}

export interface TechnicalFieldConfig {
  key: keyof import("./data/types").ProductTechnicalSpecsDraft;
  label: string;
  hint: string;
  // "boolean" (spec 0039): pole wyboru tak/nie w kreatorze, dziś tylko
  // kontenery-modulowe/mieszkalne (bathroomIncluded) — patrz
  // CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY i isTechnicalSpecsComplete niżej.
  type: "text" | "number" | "select" | "boolean";
  options?: { value: string; label: string }[];
  // Spec 0050 AC-20: gdy select ma wartość równą otherValue, obok renderuje
  // się dodatkowe, opcjonalne pole tekstowe (otherKey) na własną wartość
  // producenta (np. heatSource === "inne" -> heatSourceOther).
  otherValue?: string;
  otherKey?: keyof import("./data/types").ProductTechnicalSpecsDraft;
  otherLabel?: string;
  // Spec 0050 AC-20: pole nie blokuje kompletności kroku technicznego (dziś
  // tylko heatTransferCoefficients — "Nie podano" jest zawsze poprawną,
  // domyślną wartością, patrz createEmptyDraft). Nadal się renderuje i zapisuje.
  optional?: boolean;
}

// Pola techniczne per rodzina (spec 0022 Feature design, technicalSpecs).
// Napędza zarówno jeden skonsolidowany krok "techniczne" kreatora, jak i jego
// walidację (isTechnicalSpecsComplete niżej) oraz podsumowanie. Nie niesie już
// "kontenery-modulowe" (spec 0039): jej pola zależą od containerSubcategory,
// nie samej family — patrz CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY i
// getTechnicalFieldsFor niżej.
export const TECHNICAL_FIELDS_BY_FAMILY: Record<Exclude<ProductFamily, "kontenery-modulowe">, TechnicalFieldConfig[]> = {
  // wallBuildUp/insulation/windowClass/fireResistance/windResistance usunięte
  // (spec 0049 AC-1, AC-5): dane 65 istniejących produktów zostają w bazie
  // (technical_specs jsonb), ale kreator, katalog AI i strona klienta ich już
  // nie zbierają/pokazują. Rolę przejmuje jeden PDF specyfikacji (AC-6).
  dom: [
    {
      key: "constructionTechnology",
      label: "Technologia konstrukcji",
      hint: "Główna technologia budowy",
      type: "select",
      options: CONSTRUCTION_TECHNOLOGY_OPTIONS,
      otherValue: "inne",
      otherKey: "constructionTechnologyOther",
      otherLabel: "Podaj technologię",
    },
    {
      key: "heatTransferCoefficients",
      label: "Klasa energetyczna",
      hint: "Pasmo klasy energetycznej budynku",
      type: "select",
      options: ENERGY_CLASS_OPTIONS,
      optional: true,
    },
    {
      key: "ventilation",
      label: "Wentylacja",
      hint: "Typ wentylacji",
      type: "select",
      options: VENTILATION_TYPE_OPTIONS,
      otherValue: "inna",
      otherKey: "ventilationOther",
      otherLabel: "Podaj rodzaj wentylacji",
    },
    {
      key: "heatSource",
      label: "Źródło ciepła",
      hint: "Główne źródło ogrzewania",
      type: "select",
      options: HEAT_SOURCE_OPTIONS,
      otherValue: "inne",
      otherKey: "heatSourceOther",
      otherLabel: "Podaj źródło ciepła",
    },
  ],
  "spa-modulowe": [
    { key: "seatingCapacity", label: "Liczba miejsc", hint: "Liczba miejsc siedzących w kabinie/wannie", type: "number" },
    {
      key: "waterVolumeLiters",
      label: "Objętość wody (l)",
      hint: "Pojemność wodna niecki w litrach",
      type: "number",
    },
    {
      key: "heatingType",
      label: "Typ ogrzewania",
      hint: "Główny sposób podgrzewania wody",
      type: "select",
      options: [
        { value: "electric", label: "Elektryczne" },
        { value: "heat-pump", label: "Pompa ciepła" },
        { value: "wood-fired", label: "Na drewno" },
      ],
    },
    {
      key: "filtrationSystem",
      label: "System filtracji",
      hint: "Sposób filtrowania i uzdatniania wody",
      type: "text",
    },
    { key: "shellMaterial", label: "Materiał niecki", hint: "Materiał kabiny/niecki", type: "text" },
    {
      key: "electricalRequirement",
      label: "Wymagania elektryczne",
      hint: "Wymagane zasilanie, np. moc przyłącza",
      type: "text",
    },
    {
      key: "foundationType",
      label: "Typ fundamentu",
      hint: "Sposób posadowienia, np. płyta betonowa",
      type: "text",
    },
  ],
};

// Pola dzielone przez wszystkie trzy podkategorie kontenera modułowego (spec
// 0039 Follow-up: wspólny bazowy zestaw rozszerzany per podkategoria).
const CONTAINER_BASE_FIELDS: TechnicalFieldConfig[] = [
  { key: "dimensions", label: "Wymiary", hint: "Szerokość × głębokość × wysokość", type: "text" },
  {
    key: "structureMaterial",
    label: "Materiał konstrukcji",
    hint: "Materiał szkieletu/konstrukcji kontenera",
    type: "text",
  },
  { key: "insulationType", label: "Typ izolacji", hint: "Rodzaj izolacji termicznej", type: "text" },
  { key: "foundationType", label: "Typ fundamentu", hint: "Sposób posadowienia", type: "text" },
];

// Zastępuje pole techniczne pergoli w TECHNICAL_FIELDS_BY_FAMILY (spec 0039):
// każda podkategoria kontenera ma własny, rozłączny zestaw pól, zgodny 1:1 z
// kształtem Zod w lib/product-technical-specs.ts (AC-4). Napędza krok
// "techniczne" kreatora przez getTechnicalFieldsFor, nie bezpośrednio.
export const CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY: Record<ContainerSubcategory, TechnicalFieldConfig[]> = {
  gastronomiczne: [
    ...CONTAINER_BASE_FIELDS,
    {
      key: "kitchenEquipmentType",
      label: "Wyposażenie kuchenne",
      hint: "Rodzaj zainstalowanego wyposażenia kuchennego",
      type: "text",
    },
    {
      key: "extractionVentilation",
      label: "Wyciąg",
      hint: "Typ instalacji wyciągowej/wentylacyjnej",
      type: "text",
    },
    {
      key: "electricalPower",
      label: "Moc przyłącza elektrycznego",
      hint: "Wymagana moc zasilania",
      type: "text",
    },
    { key: "waterSupplyType", label: "Zasilanie w wodę", hint: "Sposób doprowadzenia wody", type: "text" },
    {
      key: "wasteWaterHandling",
      label: "Odprowadzanie ścieków",
      hint: "Sposób odprowadzania ścieków",
      type: "text",
    },
  ],
  uslugowe: [
    ...CONTAINER_BASE_FIELDS,
    {
      key: "intendedUse",
      label: "Przeznaczenie",
      hint: "Planowane wykorzystanie modułu, np. biuro, sklep",
      type: "text",
    },
    {
      key: "electricalInstallation",
      label: "Instalacja elektryczna",
      hint: "Zakres instalacji elektrycznej",
      type: "text",
    },
    { key: "spaceHeatingType", label: "Typ ogrzewania", hint: "Sposób ogrzewania pomieszczenia", type: "text" },
  ],
  mieszkalne: [
    ...CONTAINER_BASE_FIELDS,
    {
      key: "sleepingCapacity",
      label: "Liczba miejsc do spania",
      hint: "Maksymalna liczba osób",
      type: "number",
    },
    { key: "bathroomIncluded", label: "Łazienka", hint: "Czy moduł zawiera łazienkę", type: "boolean" },
    { key: "spaceHeatingType", label: "Typ ogrzewania", hint: "Sposób ogrzewania pomieszczenia", type: "text" },
    { key: "waterSupplyType", label: "Zasilanie w wodę", hint: "Sposób doprowadzenia wody", type: "text" },
    {
      key: "wasteWaterHandling",
      label: "Odprowadzanie ścieków",
      hint: "Sposób odprowadzania ścieków",
      type: "text",
    },
    {
      key: "electricalInstallation",
      label: "Instalacja elektryczna",
      hint: "Zakres instalacji elektrycznej",
      type: "text",
    },
  ],
};

// Kroki kreatora z etykietą przetłumaczoną przez t() (namespace "ProjectOptions").
// WIZARD_STEPS powyżej zostaje strukturalnym źródłem (id, kolejność, .length) dla
// logiki niezależnej od języka; ten getter buduje osobną, wyświetlaną tablicę.
export function getWizardSteps(t: Translate): WizardStep[] {
  return WIZARD_STEPS.map((step) => ({ id: step.id, label: t(`wizardSteps.${step.id}`) }));
}

// Wersja TECHNICAL_FIELDS_BY_FAMILY/CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY
// z etykietą/hintem/opcjami przetłumaczonymi przez t() (namespace
// "ProjectOptions"). Zastępuje dawne getTechnicalFieldsByFamily (spec 0039):
// dla "kontenery-modulowe" o kształcie decyduje containerSubcategory, nie
// samo family (patrz lib/product-technical-specs.ts), stąd zagnieżdżenie
// `technicalFields.kontenery-modulowe.<subcategory>.<pole>` o jeden poziom
// głębiej niż dom/spa-modulowe; brak wybranej podkategorii → pusta lista
// (krok techniczny kreatora nie ma czego pokazać, spec 0039 Kluczowe
// niezmienniki). Dla pozostałych rodzin zachowuje się jak dawny getter.
export function getTechnicalFieldsFor(
  family: ProductFamily,
  containerSubcategory: ContainerSubcategory | null,
  t: Translate,
): TechnicalFieldConfig[] {
  if (family === "kontenery-modulowe") {
    if (containerSubcategory === null) return [];
    return CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY[containerSubcategory].map((field) => ({
      ...field,
      label: t(`technicalFields.kontenery-modulowe.${containerSubcategory}.${field.key}.label`),
      hint: t(`technicalFields.kontenery-modulowe.${containerSubcategory}.${field.key}.hint`),
    }));
  }
  return TECHNICAL_FIELDS_BY_FAMILY[family].map((field) => ({
    ...field,
    label: t(`technicalFields.${family}.${field.key}.label`),
    hint: t(`technicalFields.${family}.${field.key}.hint`),
    options: field.options?.map((option) => ({
      ...option,
      label:
        field.key === "heatTransferCoefficients"
          ? option.value === "nieznana"
            ? t("energyClassNotSpecified")
            : t("energyClassPrefix", { code: option.value })
          : t(`technicalFields.${family}.${field.key}.options.${option.value}`),
    })),
    otherLabel: field.otherKey ? t(`technicalFields.${family}.${field.key}.otherLabel`) : undefined,
  }));
}

export function createEmptyDraft(): ProjectDraft {
  return {
    name: "",
    floorAreaM2: null,
    bedrooms: null,
    countryOfProduction: null,
    description: "",
    descriptionEn: "",
    descriptionNl: "",
    descriptionDe: "",
    family: null,
    category: null,
    spaSubcategory: null,
    containerSubcategory: null,
    // heatTransferCoefficients domyślnie "nieznana"/"Nie podano" tylko dla
    // family "dom" (spec 0050 AC-20) — nie ustawiane tu (family jeszcze
    // nieznana przy pustym draft, a "spa-modulowe"/"kontenery-modulowe" nie
    // mają wcale tego klucza w swoim .strict() schemacie, patrz
    // lib/product-technical-specs.ts). Domyślana wartość jest ustawiana przy
    // pierwszym renderze kroku technicznego z family === "dom" w
    // ProjectWizardTechnicalStep.tsx, nie tutaj.
    technicalSpecs: {},
    roomLayout: [],
    roomLayoutEn: [],
    roomLayoutNl: [],
    roomLayoutDe: [],
    faq: [],
    faqEn: [],
    faqNl: [],
    faqDe: [],
    clientRequirements: [],
    clientRequirementsEn: [],
    clientRequirementsNl: [],
    clientRequirementsDe: [],
    floorPlanFiles: [],
    photoFiles: [],
    structuralWarrantyYears: null,
    installationWarrantyYears: null,
    serviceScopeDescription: "",
    transportDimensions: "",
    craneRequirements: "",
    minPlotWidthM: null,
    simplifiedPermitEligible: null,
    variantsSummary: [],
  };
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

// Dokładnie jedno pole podkategorii wypełnione, dopasowane do family (spec
// 0022 AC-2, AC-3) — poziom aplikacji, tak jak inne pola wymagane dopiero od
// status = 'published' (spec 0022 Feature design, Kluczowe niezmienniki).
function isSubcategoryComplete(draft: ProjectDraft): boolean {
  switch (draft.family) {
    case "dom":
      return draft.category !== null;
    case "spa-modulowe":
      return draft.spaSubcategory !== null;
    case "kontenery-modulowe":
      return draft.containerSubcategory !== null;
    case null:
      return false;
  }
}

// Struktura sama (bez tekstu wyświetlanego) wystarcza tu do walidacji — patrz
// komentarz przy getTechnicalFieldsFor. Dla "kontenery-modulowe" bez wybranej
// containerSubcategory zwraca pustą listę: krok techniczny nie jest kompletny
// dopóki podkategoria nie jest wybrana (spec 0039 Kluczowe niezmienniki).
function getStructuralTechnicalFields(draft: ProjectDraft): TechnicalFieldConfig[] {
  if (draft.family === "kontenery-modulowe") {
    return draft.containerSubcategory === null
      ? []
      : CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY[draft.containerSubcategory];
  }
  return draft.family === null ? [] : TECHNICAL_FIELDS_BY_FAMILY[draft.family];
}

function isTechnicalSpecsComplete(draft: ProjectDraft): boolean {
  if (draft.family === null) return false;
  const fields = getStructuralTechnicalFields(draft);
  if (fields.length === 0) return false;
  return fields.every((field) => {
    if (field.optional) return true;
    const value = draft.technicalSpecs[field.key];
    if (field.type === "number") return typeof value === "number";
    // "boolean" (spec 0039): kompletne tylko przy dokładnie true/false, nigdy
    // undefined — analogicznie do reguły dla "number" powyżej.
    if (field.type === "boolean") return value === true || value === false;
    return typeof value === "string" && isNonEmpty(value);
  });
}

export function isStepComplete(stepId: WizardStepId, draft: ProjectDraft): boolean {
  switch (stepId) {
    case "podstawowe":
      return (
        isNonEmpty(draft.name) &&
        draft.floorAreaM2 !== null &&
        draft.floorAreaM2 >= FLOOR_AREA_MIN_M2 &&
        draft.floorAreaM2 <= FLOOR_AREA_MAX_M2 &&
        draft.bedrooms !== null &&
        Number.isInteger(draft.bedrooms) &&
        draft.bedrooms >= BEDROOMS_MIN &&
        draft.bedrooms <= BEDROOMS_MAX &&
        draft.countryOfProduction !== null &&
        isNonEmpty(draft.description) &&
        draft.family !== null &&
        isSubcategoryComplete(draft)
      );
    // Gwarancja konstrukcyjna dołączyła tu z usuniętego kroku "Cena" (spec
    // 0045 zadanie 9, 12): nadal wymagana, bo karta klienta zawsze ją
    // wyświetla (ProjectTechnicalSpecs.tsx), w odróżnieniu od pól logistyki
    // (AC-8), które są czysto deklaratywne i opcjonalne.
    case "techniczne":
      return (
        isTechnicalSpecsComplete(draft) &&
        draft.structuralWarrantyYears !== null &&
        Number.isInteger(draft.structuralWarrantyYears) &&
        draft.structuralWarrantyYears >= 0
      );
    case "pliki":
      return draft.floorPlanFiles.length > 0 && draft.photoFiles.length > 0;
    // AC-1/AC-4: krok jest kompletny gdy istnieje dokładnie jeden domyślny
    // wariant z wypełnioną ceną minimalną — ten sam warunek, który bramkuje
    // publikację na serwerze (validatePublishReadiness, spec 0045 zadanie 12).
    case "warianty":
      return draft.variantsSummary.some((variant) => variant.isDefault && variant.priceMinCents !== null);
    // FAQ jest opcjonalne (żadne AC tego spec nie wymaga wypełnienia), krok
    // jest więc zawsze przechodzialny — walidacja Zod pilnuje tylko kształtu
    // wpisanych wierszy, nie ich obecności.
    case "faq":
      return true;
    // AC-30, AC-34: producent może zaufać automatycznym tłumaczeniom i
    // przejść dalej bez zmian, albo opublikować bez tłumaczeń wcale, jeśli
    // generowanie zawiedzie — krok nigdy nie blokuje, ten sam wzorzec co "faq"
    // wyżej.
    case "tlumaczenia":
      return true;
    case "podsumowanie":
      return WIZARD_STEPS.slice(0, -1).every((step) => isStepComplete(step.id, draft));
  }
}

// AC-10: dopasowuje tłumaczenie po stabilnym `id` z listy polskiej, dopełniając
// puste wpisy tam, gdzie tłumaczenie jeszcze nie istnieje (edycja produktu,
// gdzie translation może być krótsza niż roomLayout — częściowe tłumaczenie).
// Zamienia rzadki (sparse) kształt z bazy na gęsty (dense), pozycyjnie
// wyrównany z roomLayout, żeby ProjectWizardBasicInfoStep mógł trzymać
// roomLayout/roomLayoutEn/roomLayoutNl w locku po indeksie (add/remove/move
// stosowane naraz na wszystkich trzech tablicach). Odwrotność:
// sanitizeDraftForSave niżej, wywoływana tuż przed zapisem.
export function alignRoomLayoutTranslation(
  rows: RoomLayoutRow[],
  translation: RoomLayoutTranslationRow[],
): RoomLayoutTranslationRow[] {
  return rows.map((row) => translation.find((entry) => entry.id === row.id) ?? { id: row.id, name: "" });
}

// Ten sam wzorzec co alignRoomLayoutTranslation wyżej, dla FAQ (AC-10).
export function alignFaqTranslation(rows: FaqRow[], translation: FaqTranslationRow[]): FaqTranslationRow[] {
  return rows.map((row) => translation.find((entry) => entry.id === row.id) ?? { id: row.id, question: "", answer: "" });
}

// Ten sam wzorzec dopasowania po `id` co wyżej, ale filtruje do custom: true
// (spec 0050 AC-28): pozycje katalogowe (custom: false) nie mają odpowiednika
// w product_translation.client_requirements (tłumaczą się z katalogu opcji
// przy odczycie), więc dopasowywanie po nich tylko rozjeżdżałoby długość
// tablicy od reszty listy.
export function alignClientRequirementsTranslation(
  rows: ClientRequirementRow[],
  translation: ClientRequirementTranslationRow[],
): ClientRequirementTranslationRow[] {
  return rows
    .filter((row) => row.custom)
    .map((row) => translation.find((entry) => entry.id === row.id) ?? { id: row.id, label: "" });
}

// Odwrotność alignRoomLayoutTranslation/alignFaqTranslation wyżej: kreator
// trzyma tłumaczenia w gęstym, pozycyjnie wyrównanym kształcie (UI-friendly),
// ale roomLayoutTranslationRowSchema/faqTranslationRowSchema wymagają
// niepustych pól (name/question/answer min(1)) — puste wpisy (tłumaczenie
// jeszcze nie wpisane) muszą zniknąć przed wysłaniem do serwera, inaczej
// złamałyby walidację Zod zamiast po prostu nie istnieć (AC-10, częściowe
// tłumaczenie). Wywoływana tuż przed każdym createProducerProduct/
// updateProducerProduct.
export function sanitizeDraftForSave(draft: ProjectDraft): ProjectDraft {
  return {
    ...draft,
    roomLayoutEn: draft.roomLayoutEn.filter((row) => isNonEmpty(row.name)),
    roomLayoutNl: draft.roomLayoutNl.filter((row) => isNonEmpty(row.name)),
    roomLayoutDe: draft.roomLayoutDe.filter((row) => isNonEmpty(row.name)),
    faqEn: draft.faqEn.filter((row) => isNonEmpty(row.question) && isNonEmpty(row.answer)),
    faqNl: draft.faqNl.filter((row) => isNonEmpty(row.question) && isNonEmpty(row.answer)),
    faqDe: draft.faqDe.filter((row) => isNonEmpty(row.question) && isNonEmpty(row.answer)),
    clientRequirementsEn: draft.clientRequirementsEn.filter((row) => isNonEmpty(row.label)),
    clientRequirementsNl: draft.clientRequirementsNl.filter((row) => isNonEmpty(row.label)),
    clientRequirementsDe: draft.clientRequirementsDe.filter((row) => isNonEmpty(row.label)),
  };
}

// AC-15, spec 0050 AC-33: pole tłumaczenia opisu (description × en/nl/de)
// trafia do payloadu zapisu WYŁĄCZNIE z kroku, który pokazuje jego zakładki
// (ProjectWizardTranslationsStep, stepId "tlumaczenia", jedyne miejsce z tymi
// polami w obu kreatorach od spec 0050 AC-31/AC-32); każdy inny krok kreatora
// (w tym finalny "Zapisz" z Podsumowania) wysyła ten klucz jako nieobecny
// (nie: pusty), zamiast tego, co ostatnio było w lokalnym stanie
// react-hook-form. react-hook-form trzyma cały formularz w pamięci
// przeglądarki i nigdy nie odświeża go z bazy między krokami — bez tej
// funkcji, przejście do kolejnego kroku (albo bezpośredni skok do
// Podsumowania) resubmitowałoby wciąż nieodświeżony lokalnie descriptionEn/
// itd. i mogłoby skasować tłumaczenie, które w międzyczasie dopisało AI
// (generateMissingProductTranslations, lib/producer-product-actions.ts) —
// dokładnie wyścig znaleziony przy cross checku tej funkcji (patrz spec 0028
// rationale.md), ten sam mechanizm teraz chroniący "tlumaczenia" zamiast
// dawnego "podstawowe". `name` nie ma już odpowiednika (spec 0050 AC-2, jedna
// wspólna wartość, żadnego backfillu). roomLayoutEn/Nl/De, faqEn/Nl/De i
// clientRequirementsEn/Nl/De NIE potrzebują tej ochrony: żaden backfill ich
// nie dotyka (tylko ten krok kiedykolwiek je zapisuje), więc resubmisja
// nieodświeżonej-ale-wciąż-poprawnej wartości z innego kroku jest nieszkodliwa
// — ten sam status quo co dzisiejsze roomLayoutEn/Nl/faqEn/Nl (nigdy nie
// omijane), tylko teraz wypełniane przez ten krok zamiast przez zakładki w
// "podstawowe"/"faq". Woła sanitizeDraftForSave wyżej, więc jest jedynym
// miejscem kreator musi wywołać przed createProducerProduct/updateProducerProduct.
function omitKeys<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}

export function buildProducerSavePayload(draft: ProjectDraft, stepId: WizardStepId): ProducerProductFields {
  const sanitized = sanitizeDraftForSave(draft);
  const fields = omitKeys(sanitized, ["floorPlanFiles", "photoFiles", "variantsSummary"] as const);
  if (stepId === "tlumaczenia") return fields;
  return omitKeys(fields, ["descriptionEn", "descriptionNl", "descriptionDe"] as const);
}

