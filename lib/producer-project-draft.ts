import type { ProjectDraft } from "./data/types";

export type WizardStepId =
  | "podstawowe"
  | "konstrukcja"
  | "instalacje"
  | "odpornosc"
  | "pliki"
  | "podsumowanie";

export interface WizardStep {
  id: WizardStepId;
  label: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: "podstawowe", label: "Informacje podstawowe" },
  { id: "konstrukcja", label: "Konstrukcja i izolacja" },
  { id: "instalacje", label: "Instalacje i okna" },
  { id: "odpornosc", label: "Odporność" },
  { id: "pliki", label: "Pliki" },
  { id: "podsumowanie", label: "Podsumowanie" },
];

export const FLOOR_AREA_MIN_M2 = 20;
export const FLOOR_AREA_MAX_M2 = 500;
export const BEDROOMS_MIN = 0;
export const BEDROOMS_MAX = 10;

// Podpowiedzi treściowe pod ośmioma polami technicznymi (spec 0008, Feature design).
export const TECHNICAL_FIELD_HINTS = {
  wallBuildUp: "Warstwy ściany od zewnątrz do wewnątrz, np. konstrukcja, izolacja, poszycie",
  insulation: "Współczynnik U dla ścian i dachu (W/m²K)",
  heatTransferCoefficients: "Współczynniki U dla okien i drzwi (W/m²K)",
  windowClass: "Klasa energetyczna i typ szyby",
  ventilation: "Typ wentylacji, np. mechaniczna z odzyskiem ciepła",
  heatSource: "Główne źródło ogrzewania, np. pompa ciepła",
  fireResistance: "Klasa odporności ogniowej konstrukcji, np. REI 30",
  windResistance: "Strefa wiatrowa i maksymalna prędkość wiatru",
} as const satisfies Record<string, string>;

export function createEmptyDraft(): ProjectDraft {
  return {
    name: "",
    floorAreaM2: null,
    bedrooms: null,
    countryOfProduction: null,
    description: "",
    wallBuildUp: "",
    insulation: "",
    heatTransferCoefficients: "",
    windowClass: "",
    ventilation: "",
    heatSource: "",
    fireResistance: "",
    windResistance: "",
    floorPlanFiles: [],
    photoFiles: [],
  };
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
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
        isNonEmpty(draft.description)
      );
    case "konstrukcja":
      return (
        isNonEmpty(draft.wallBuildUp) &&
        isNonEmpty(draft.insulation) &&
        isNonEmpty(draft.heatTransferCoefficients)
      );
    case "instalacje":
      return isNonEmpty(draft.windowClass) && isNonEmpty(draft.ventilation) && isNonEmpty(draft.heatSource);
    case "odpornosc":
      return isNonEmpty(draft.fireResistance) && isNonEmpty(draft.windResistance);
    case "pliki":
      return draft.floorPlanFiles.length > 0 && draft.photoFiles.length > 0;
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
