import type { useTranslations } from "next-intl";
import { ENERGY_CLASSES, HEAT_SOURCES, VENTILATION_TYPES } from "./product-technical-specs";
import type {
  CompletionStandard,
  PergolaSubcategory,
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
    { value: "pergola", label: t("family.pergola") },
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

export function getPergolaSubcategoryOptions(t: Translate): { value: PergolaSubcategory; label: string }[] {
  return [
    { value: "bioklimatyczna", label: t("pergolaSubcategory.bioklimatyczna") },
    { value: "aluminiowa-stala", label: t("pergolaSubcategory.aluminiowa-stala") },
    { value: "drewniana", label: t("pergolaSubcategory.drewniana") },
    { value: "wolnostojaca-przyscienna", label: t("pergolaSubcategory.wolnostojaca-przyscienna") },
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
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
}

// Pola techniczne per rodzina (spec 0022 Feature design, technicalSpecs).
// Napędza zarówno jeden skonsolidowany krok "techniczne" kreatora, jak i jego
// walidację (isTechnicalSpecsComplete niżej) oraz podsumowanie.
export const TECHNICAL_FIELDS_BY_FAMILY: Record<ProductFamily, TechnicalFieldConfig[]> = {
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
  pergola: [
    {
      key: "roofType",
      label: "Typ dachu",
      hint: "Rodzaj dachu pergoli",
      type: "select",
      options: [
        { value: "bioklimatyczny", label: "Bioklimatyczny (regulowane lamele)" },
        { value: "staly", label: "Stały" },
        { value: "rozsuwany", label: "Rozsuwany" },
      ],
    },
    { key: "roofMaterial", label: "Materiał dachu", hint: "Materiał pokrycia dachu", type: "text" },
    { key: "dimensions", label: "Wymiary", hint: "Szerokość × głębokość × wysokość", type: "text" },
    {
      key: "windLoadRating",
      label: "Klasa obciążenia wiatrem",
      hint: "Maksymalna dopuszczalna prędkość wiatru",
      type: "text",
    },
    {
      key: "snowLoadRating",
      label: "Klasa obciążenia śniegiem",
      hint: "Maksymalne obciążenie śniegiem (kN/m²)",
      type: "text",
    },
    {
      key: "glazingType",
      label: "Typ przeszklenia",
      hint: "Panele boczne lub przeszklenie, jeśli dotyczy",
      type: "text",
    },
    {
      key: "foundationType",
      label: "Typ fundamentu",
      hint: "Sposób posadowienia słupów",
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

// Wersja TECHNICAL_FIELDS_BY_FAMILY z etykietą/hintem/opcjami przetłumaczonymi przez
// t() (namespace "ProjectOptions", klucz per field.key — "foundationType" occurs w
// dwóch rodzinach z innym hintem, stąd family w ścieżce klucza). Struktura (key, type,
// value listy opcji) zostaje z TECHNICAL_FIELDS_BY_FAMILY — ten getter tylko nakłada
// tekst do wyświetlenia, walidacja (isTechnicalSpecsComplete) niżej go nie potrzebuje.
export function getTechnicalFieldsByFamily(family: ProductFamily, t: Translate): TechnicalFieldConfig[] {
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
    pergolaSubcategory: null,
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
    case "pergola":
      return draft.pergolaSubcategory !== null;
    case null:
      return false;
  }
}

function isTechnicalSpecsComplete(draft: ProjectDraft): boolean {
  if (draft.family === null) return false;
  return TECHNICAL_FIELDS_BY_FAMILY[draft.family].every((field) => {
    const value = draft.technicalSpecs[field.key];
    if (field.type === "number") return typeof value === "number";
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

