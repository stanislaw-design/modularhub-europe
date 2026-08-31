import type { ProjectDraft, SavedProduct } from "./data/types";

// Katalog produktów zapisanych przez producenta (spec 0016), localStorage kluczowany
// NIP-em, ten sam wzorzec co dzisiejszy szkic kreatora (lib/producer-project-draft.ts).
// Klucz kończy się dokładnie na `:produkty`, nigdy samym prefiksem `producent:${nip}:`,
// żeby nie kolidować ze skanem `:projekt-szkic`/`:edycja:${id}` (spec 0016, Key invariants).
function productsStorageKey(nip: string): string {
  return `producent:${nip}:produkty`;
}

function editDraftStorageKey(nip: string, id: string): string {
  return `producent:${nip}:edycja:${id}`;
}

// crypto.randomUUID() nie istnieje w niezabezpieczonym kontekście (np. http:// na
// telefonie w sieci lokalnej podczas demo); fallback nigdy nie blokuje zapisu.
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Kompletny ProjectDraft (wszystkie kroki isStepComplete) -> SavedProduct, pole po
// polu, jawne mapowanie z typów nullowalnych na właściwe (spec 0016, Feature design).
// Zakłada, że draft jest już kompletny; wywołujący sprawdza to przez isStepComplete.
function draftToSavedProduct(draft: ProjectDraft, existing?: Pick<SavedProduct, "id" | "createdAt">): SavedProduct {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? generateId(),
    name: draft.name,
    floorAreaM2: draft.floorAreaM2 as number,
    bedrooms: draft.bedrooms as number,
    countryOfProduction: draft.countryOfProduction as NonNullable<typeof draft.countryOfProduction>,
    description: draft.description,
    wallBuildUp: draft.wallBuildUp,
    insulation: draft.insulation,
    heatTransferCoefficients: draft.heatTransferCoefficients,
    windowClass: draft.windowClass,
    ventilation: draft.ventilation,
    heatSource: draft.heatSource,
    fireResistance: draft.fireResistance,
    windResistance: draft.windResistance,
    floorPlanFiles: draft.floorPlanFiles,
    photoFiles: draft.photoFiles,
    housePriceMinEur: draft.housePriceMinEur as number,
    housePriceMaxEur: draft.housePriceMaxEur as number,
    completionStandard: draft.completionStandard as NonNullable<typeof draft.completionStandard>,
    productionLeadTimeWeeksMin: draft.productionLeadTimeWeeksMin as number,
    productionLeadTimeWeeksMax: draft.productionLeadTimeWeeksMax as number,
    onSiteAssemblyDaysMin: draft.onSiteAssemblyDaysMin as number,
    onSiteAssemblyDaysMax: draft.onSiteAssemblyDaysMax as number,
    structuralWarrantyYears: draft.structuralWarrantyYears as number,
    category: draft.category as NonNullable<typeof draft.category>,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function listProducts(nip: string): SavedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(productsStorageKey(nip));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is SavedProduct => isSavedProductShape(entry));
  } catch {
    return [];
  }
}

function isSavedProductShape(value: unknown): value is SavedProduct {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SavedProduct).id === "string" &&
    typeof (value as SavedProduct).name === "string"
  );
}

export function getProduct(nip: string, id: string): SavedProduct | null {
  return listProducts(nip).find((product) => product.id === id) ?? null;
}

function persistProducts(nip: string, products: SavedProduct[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(productsStorageKey(nip), JSON.stringify(products));
    return true;
  } catch {
    return false;
  }
}

// Finalny zapis (Zapisz projekt / Zapisz zmiany) NIE jest fail soft: zwraca null przy
// niepowodzeniu, żeby wywołujący pokazał błąd zamiast po cichu nawigować dalej ze
// stanem, który się nie zapisał (spec 0016, AC-5, AC-9, AC-13).
export function createProduct(nip: string, draft: ProjectDraft): SavedProduct | null {
  const product = draftToSavedProduct(draft);
  const products = [...listProducts(nip), product];
  return persistProducts(nip, products) ? product : null;
}

export function updateProduct(nip: string, id: string, draft: ProjectDraft): SavedProduct | null {
  const products = listProducts(nip);
  const index = products.findIndex((existing) => existing.id === id);
  if (index === -1) return null;
  const updated = draftToSavedProduct(draft, products[index]);
  const next = [...products];
  next[index] = updated;
  return persistProducts(nip, next) ? updated : null;
}

export function deleteProduct(nip: string, id: string): void {
  const products = listProducts(nip).filter((product) => product.id !== id);
  persistProducts(nip, products);
  clearEditDraft(nip, id);
}

export interface StoredEditState {
  draft: ProjectDraft;
  step: number;
}

// Szkic edycji, osobny klucz od `:produkty` i od dzisiejszego `:projekt-szkic`
// (nowy produkt w toku), żeby jedno nigdy nie nadpisało drugiego (spec 0016, AC-8,
// Key invariants). Fail soft po każdej zmianie pola, tak jak dzisiejszy szkic.
export function loadEditDraft(nip: string, id: string): StoredEditState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(editDraftStorageKey(nip, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { draft?: unknown; step?: unknown };
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.draft !== "object" || parsed.draft === null) return null;
    if (typeof parsed.step !== "number") return null;
    return { draft: parsed.draft as ProjectDraft, step: parsed.step };
  } catch {
    return null;
  }
}

export function saveEditDraft(nip: string, id: string, draft: ProjectDraft, step: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(editDraftStorageKey(nip, id), JSON.stringify({ draft, step }));
  } catch {
    // fail soft — pomiń tę aktualizację
  }
}

export function clearEditDraft(nip: string, id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(editDraftStorageKey(nip, id));
  } catch {
    // fail soft
  }
}

// Odwrotność draftToSavedProduct: pole po polu, żeby id/createdAt/updatedAt (nie
// należące do ProjectDraft) nigdy nie trafiły do stanu formularza edycji.
export function savedProductToDraft(product: SavedProduct): ProjectDraft {
  return {
    name: product.name,
    floorAreaM2: product.floorAreaM2,
    bedrooms: product.bedrooms,
    countryOfProduction: product.countryOfProduction,
    description: product.description,
    wallBuildUp: product.wallBuildUp,
    insulation: product.insulation,
    heatTransferCoefficients: product.heatTransferCoefficients,
    windowClass: product.windowClass,
    ventilation: product.ventilation,
    heatSource: product.heatSource,
    fireResistance: product.fireResistance,
    windResistance: product.windResistance,
    floorPlanFiles: product.floorPlanFiles,
    photoFiles: product.photoFiles,
    housePriceMinEur: product.housePriceMinEur,
    housePriceMaxEur: product.housePriceMaxEur,
    completionStandard: product.completionStandard,
    productionLeadTimeWeeksMin: product.productionLeadTimeWeeksMin,
    productionLeadTimeWeeksMax: product.productionLeadTimeWeeksMax,
    onSiteAssemblyDaysMin: product.onSiteAssemblyDaysMin,
    onSiteAssemblyDaysMax: product.onSiteAssemblyDaysMax,
    structuralWarrantyYears: product.structuralWarrantyYears,
    category: product.category,
  };
}
