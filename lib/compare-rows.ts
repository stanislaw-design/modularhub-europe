import type { Project } from "./data/types";

// Rodzaje porównania na /compare (spec 0068 AC-13, AC-15). "dom" jest domyślny
// i odpowiada dzisiejszemu zachowaniu (spec 0044); "sauna" dodaje tabelę saun.
export const COMPARE_KINDS = ["dom", "sauna"] as const;
export type CompareKind = (typeof COMPARE_KINDS)[number];

// `kind=sauna` jest adresem kanonicznym, `spa-modulowe` przyjmujemy jako alias
// (spec 0068 AC-12 podaje tę wartość w przykładzie adresu). Nieznana wartość
// wraca po cichu do domów, nigdy nie jest błędem.
export function parseCompareKind(raw: string | string[] | undefined): CompareKind {
  if (raw === "sauna" || raw === "spa-modulowe") return "sauna";
  return "dom";
}

// Warunek dostępności kolumny per rodzaj (spec 0068 AC-14): produkt spoza
// rodzaju, np. jacuzzi w porównaniu saun, renderuje się jako "niedostępne".
export function isEligibleForCompareKind(
  kind: CompareKind,
  project: Pick<Project, "family" | "spaSubcategory">,
): boolean {
  if (kind === "sauna") return project.family === "spa-modulowe" && project.spaSubcategory === "sauna";
  return project.family === "dom";
}

export function getCompareListPath(kind: CompareKind, locale: string): string {
  return kind === "sauna" ? `/${locale}/sauna` : `/${locale}/results`;
}

export interface CompareRowDefinition {
  key: string;
}

// Wartość komórki saun: tekst, brak danych (undefined) albo tak/nie z opisem.
export type SaunaCompareValue =
  | { type: "text"; text: string | undefined }
  | { type: "price" }
  | { type: "producer" }
  | { type: "yesno"; value: boolean | null; description?: string };

export interface SaunaCompareRowDefinition extends CompareRowDefinition {
  /** Klucz etykiety w SaunaCategoryPage.compare. */
  labelKey: string;
  getValue: (project: Project) => SaunaCompareValue;
}

function specText(project: Project, field: "interiorWoodType" | "claddingMaterial" | "benchMaterial" | "insulationType" | "glazingType" | "electricalRequirement"): SaunaCompareValue {
  const value = project.saunaTechnicalSpecs?.[field]?.trim();
  return { type: "text", text: value ? value : undefined };
}

// Wiersze porównania saun (spec 0068, tabela "Wiersze porównania"). Kolejność
// tutaj jest kolejnością w tabeli. Wiersz "model" (zdjęcie i nazwa) renderuje
// sama tabela, bo to link i obraz, nie tekst.
export const SAUNA_COMPARE_ROWS: readonly SaunaCompareRowDefinition[] = [
  { key: "model", labelKey: "model", getValue: (project) => ({ type: "text", text: project.name }) },
  { key: "producer", labelKey: "producer", getValue: () => ({ type: "producer" }) },
  { key: "price", labelKey: "price", getValue: () => ({ type: "price" }) },
  {
    key: "seating",
    labelKey: "seating",
    getValue: (project) => {
      const seats = project.saunaTechnicalSpecs?.seatingCapacity;
      return { type: "text", text: typeof seats === "number" ? String(seats) : undefined };
    },
  },
  { key: "interiorWood", labelKey: "interiorWood", getValue: (project) => specText(project, "interiorWoodType") },
  { key: "cladding", labelKey: "cladding", getValue: (project) => specText(project, "claddingMaterial") },
  { key: "benchMaterial", labelKey: "benchMaterial", getValue: (project) => specText(project, "benchMaterial") },
  { key: "insulation", labelKey: "insulation", getValue: (project) => specText(project, "insulationType") },
  { key: "glazing", labelKey: "glazing", getValue: (project) => specText(project, "glazingType") },
  {
    key: "changingArea",
    labelKey: "changingArea",
    getValue: (project) => {
      const specs = project.saunaTechnicalSpecs;
      return {
        type: "yesno",
        value: specs?.hasChangingArea ?? null,
        description: specs?.hasChangingArea ? specs.changingAreaDescription?.trim() || undefined : undefined,
      };
    },
  },
  { key: "electrical", labelKey: "electrical", getValue: (project) => specText(project, "electricalRequirement") },
];

// Jedno miejsce z definicjami wierszy per rodzaj porównania (spec 0068 AC-15),
// zamiast warunków wewnątrz tabeli. Tabela domów (ProjectCompareTable) trzyma
// swoje wiersze nietknięte, tu jest tylko lista ich kluczy jako dokumentacja.
export const COMPARE_ROWS_BY_KIND = {
  dom: [
    { key: "floorArea" },
    { key: "builtUpArea" },
    { key: "bedrooms" },
    { key: "bathrooms" },
    { key: "storeys" },
    { key: "externalDimensions" },
    { key: "completionStandard" },
    { key: "productionTime" },
    { key: "floorPlan" },
  ],
  sauna: SAUNA_COMPARE_ROWS,
} as const satisfies Record<CompareKind, readonly CompareRowDefinition[]>;
