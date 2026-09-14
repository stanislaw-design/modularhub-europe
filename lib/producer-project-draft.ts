import type { useTranslations } from "next-intl";
import { ENERGY_CLASSES, HEAT_SOURCES, VENTILATION_TYPES } from "./product-technical-specs";
import type {
  CompletionStandard,
  ContainerSubcategory,
  ProductFamily,
  ProjectCategory,
  ProjectDraft,
  SpaSubcategory,
} from "./data/types";

// Callable shape shared by client `useTranslations()` and awaited server
// `getTranslations()` (next-intl, spec 0028): lets the get*Options helpers
// below accept either without depending on one entry point.
type Translate = ReturnType<typeof useTranslations>;

export type WizardStepId = "podstawowe" | "techniczne" | "pliki" | "cena" | "podsumowanie";

export interface WizardStep {
  id: WizardStepId;
  label: string;
}

// Krok 1 zbiera family i podkategorię (spec 0022 AC-6); dawne trzy kroki
// techniczne domu (konstrukcja/instalacje/odpornosc) zwijają się w jeden krok
// "techniczne", którego pola zależą od family.
export const WIZARD_STEPS: WizardStep[] = [
  { id: "podstawowe", label: "Informacje podstawowe" },
  { id: "techniczne", label: "Dane techniczne" },
  { id: "pliki", label: "Pliki" },
  { id: "cena", label: "Cena i sprzedaż" },
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
};
export const VENTILATION_TYPE_OPTIONS: { value: (typeof VENTILATION_TYPES)[number]; label: string }[] =
  VENTILATION_TYPES.map((value) => ({ value, label: VENTILATION_TYPE_LABELS[value] }));

// "nieznana" celowo pominięta: to bezpieczna wartość domyślna jednorazowego
// backfillu (spec 0026 AC-12), nie prawdziwa opcja wyboru producenta.
export const ENERGY_CLASS_OPTIONS: { value: Exclude<(typeof ENERGY_CLASSES)[number], "nieznana">; label: string }[] =
  ENERGY_CLASSES.filter((value): value is Exclude<(typeof ENERGY_CLASSES)[number], "nieznana"> => value !== "nieznana").map(
    (value) => ({ value, label: `Klasa ${value}` }),
  );

export interface TechnicalFieldConfig {
  key: keyof import("./data/types").ProductTechnicalSpecsDraft;
  label: string;
  hint: string;
  // "boolean" (spec 0039): pole wyboru tak/nie w kreatorze, dziś tylko
  // kontenery-modulowe/mieszkalne (bathroomIncluded) — patrz
  // CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY i isTechnicalSpecsComplete niżej.
  type: "text" | "number" | "select" | "boolean";
  options?: { value: string; label: string }[];
}

// Pola techniczne per rodzina (spec 0022 Feature design, technicalSpecs).
// Napędza zarówno jeden skonsolidowany krok "techniczne" kreatora, jak i jego
// walidację (isTechnicalSpecsComplete niżej) oraz podsumowanie. Nie niesie już
// "kontenery-modulowe" (spec 0039): jej pola zależą od containerSubcategory,
// nie samej family — patrz CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY i
// getTechnicalFieldsFor niżej.
export const TECHNICAL_FIELDS_BY_FAMILY: Record<Exclude<ProductFamily, "kontenery-modulowe">, TechnicalFieldConfig[]> = {
  dom: [
    {
      key: "wallBuildUp",
      label: "Układ ścian",
      hint: "Warstwy ściany od zewnątrz do wewnątrz, np. konstrukcja, izolacja, poszycie",
      type: "text",
    },
    {
      key: "insulation",
      label: "Izolacja",
      hint: "Współczynnik U dla ścian i dachu (W/m²K)",
      type: "text",
    },
    {
      key: "heatTransferCoefficients",
      label: "Klasa energetyczna",
      hint: "Pasmo klasy energetycznej budynku",
      type: "select",
      options: ENERGY_CLASS_OPTIONS,
    },
    { key: "windowClass", label: "Klasa okien", hint: "Klasa energetyczna i typ szyby", type: "text" },
    {
      key: "ventilation",
      label: "Wentylacja",
      hint: "Typ wentylacji",
      type: "select",
      options: VENTILATION_TYPE_OPTIONS,
    },
    {
      key: "heatSource",
      label: "Źródło ciepła",
      hint: "Główne źródło ogrzewania",
      type: "select",
      options: HEAT_SOURCE_OPTIONS,
    },
    {
      key: "fireResistance",
      label: "Odporność ogniowa",
      hint: "Klasa odporności ogniowej konstrukcji, np. REI 30",
      type: "text",
    },
    {
      key: "windResistance",
      label: "Odporność wiatrowa",
      hint: "Strefa wiatrowa i maksymalna prędkość wiatru",
      type: "text",
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
          ? t("energyClassPrefix", { code: option.value })
          : t(`technicalFields.${family}.${field.key}.options.${option.value}`),
    })),
  }));
}

export function createEmptyDraft(): ProjectDraft {
  return {
    name: "",
    floorAreaM2: null,
    bedrooms: null,
    countryOfProduction: null,
    description: "",
    nameEn: "",
    nameNl: "",
    descriptionEn: "",
    descriptionNl: "",
    family: null,
    category: null,
    spaSubcategory: null,
    containerSubcategory: null,
    technicalSpecs: {},
    floorPlanFiles: [],
    photoFiles: [],
    housePriceMinEur: null,
    housePriceMaxEur: null,
    completionStandard: null,
    productionLeadTimeWeeksMin: null,
    productionLeadTimeWeeksMax: null,
    onSiteAssemblyDaysMin: null,
    onSiteAssemblyDaysMax: null,
    structuralWarrantyYears: null,
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
    case "techniczne":
      return isTechnicalSpecsComplete(draft);
    case "pliki":
      return draft.floorPlanFiles.length > 0 && draft.photoFiles.length > 0;
    case "cena":
      return (
        draft.housePriceMinEur !== null &&
        draft.completionStandard !== null &&
        draft.productionLeadTimeWeeksMin !== null &&
        draft.productionLeadTimeWeeksMax !== null &&
        draft.productionLeadTimeWeeksMin <= draft.productionLeadTimeWeeksMax &&
        draft.onSiteAssemblyDaysMin !== null &&
        draft.onSiteAssemblyDaysMax !== null &&
        draft.onSiteAssemblyDaysMin <= draft.onSiteAssemblyDaysMax &&
        draft.structuralWarrantyYears !== null &&
        Number.isInteger(draft.structuralWarrantyYears) &&
        draft.structuralWarrantyYears >= 0
      );
    case "podsumowanie":
      return WIZARD_STEPS.slice(0, -1).every((step) => isStepComplete(step.id, draft));
  }
}

