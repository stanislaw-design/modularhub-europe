import type {
  CompletionStandard,
  PergolaSubcategory,
  ProductFamily,
  ProjectCategory,
  ProjectDraft,
  SpaSubcategory,
} from "./data/types";

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

export const COMPLETION_STANDARD_OPTIONS: { value: CompletionStandard; label: string }[] = [
  { value: "surowy-zamkniety", label: "Stan surowy zamknięty" },
  { value: "deweloperski", label: "Standard deweloperski" },
  { value: "pod-klucz", label: "Pod klucz" },
];

export const PRODUCT_FAMILY_OPTIONS: { value: ProductFamily; label: string }[] = [
  { value: "dom", label: "Dom" },
  { value: "spa-modulowe", label: "Spa modułowe" },
  { value: "pergola", label: "Pergola" },
];

export const PROJECT_CATEGORY_OPTIONS: { value: ProjectCategory; label: string }[] = [
  { value: "caloroczny", label: "Całoroczny" },
  { value: "rekreacyjny-caloroczny", label: "Rekreacyjny całoroczny" },
  { value: "mobilny", label: "Mobilny" },
];

export const SPA_SUBCATEGORY_OPTIONS: { value: SpaSubcategory; label: string }[] = [
  { value: "sauna", label: "Sauna" },
  { value: "jacuzzi", label: "Jacuzzi" },
  { value: "wellness-combo", label: "Kabina wellness (sauna + jacuzzi)" },
];

export const PERGOLA_SUBCATEGORY_OPTIONS: { value: PergolaSubcategory; label: string }[] = [
  { value: "bioklimatyczna", label: "Bioklimatyczna" },
  { value: "aluminiowa-stala", label: "Aluminiowa stała" },
  { value: "drewniana", label: "Drewniana" },
  { value: "wolnostojaca-przyscienna", label: "Wolnostojąca / przyścienna" },
];

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
      label: "Współczynniki przenikania ciepła",
      hint: "Współczynniki U dla okien i drzwi (W/m²K)",
      type: "text",
    },
    { key: "windowClass", label: "Klasa okien", hint: "Klasa energetyczna i typ szyby", type: "text" },
    {
      key: "ventilation",
      label: "Wentylacja",
      hint: "Typ wentylacji, np. mechaniczna z odzyskiem ciepła",
      type: "text",
    },
    {
      key: "heatSource",
      label: "Źródło ciepła",
      hint: "Główne źródło ogrzewania, np. pompa ciepła",
      type: "text",
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

export function createEmptyDraft(): ProjectDraft {
  return {
    name: "",
    floorAreaM2: null,
    bedrooms: null,
    countryOfProduction: null,
    description: "",
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
        draft.housePriceMaxEur !== null &&
        draft.housePriceMinEur <= draft.housePriceMaxEur &&
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

export interface StoredWizardState {
  draft: ProjectDraft;
  step: number;
}

function draftStorageKey(nip: string): string {
  return `producent:${nip}:projekt-szkic`;
}

function clampStepIndex(step: number): number {
  return Math.min(Math.max(0, Math.trunc(step)), WIZARD_STEPS.length - 1);
}

// Uszkodzony/nieczytelny zapis jest po cichu odrzucany (zwraca null zamiast rzucać),
// kreator startuje pusty zamiast pokazać błąd (spec 0008, AC-8).
export function loadDraft(nip: string): StoredWizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(nip));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { draft?: unknown; step?: unknown };
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.draft !== "object" || parsed.draft === null) return null;
    if (typeof parsed.step !== "number") return null;
    return {
      draft: { ...createEmptyDraft(), ...parsed.draft },
      step: clampStepIndex(parsed.step),
    };
  } catch {
    return null;
  }
}

// Zapis opakowany w bezpieczną próbę: nieudany zapis (limit magazynu, tryb prywatny)
// po cichu pomija tę aktualizację, nigdy nie blokuje pracy w kreatorze (spec 0008, Key invariants).
export function saveDraft(nip: string, draft: ProjectDraft, step: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftStorageKey(nip), JSON.stringify({ draft, step }));
  } catch {
    // fail soft — pomiń tę jedną aktualizację
  }
}

export function clearDraft(nip: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftStorageKey(nip));
  } catch {
    // fail soft
  }
}
