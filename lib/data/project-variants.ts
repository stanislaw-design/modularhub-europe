import type { ProductOptionGroup } from "@/lib/db/queries";
import type { Project, ProjectVariant } from "./types";

// Wariant "wyświetlany" gdy strona/karta nie ma jeszcze wybranego wariantu
// przez URL (spec 0042 AC-1): is_default = true, a w jego braku pierwszy wg
// sort_order (variants jest już posortowane przez resolveProductVariants w
// lib/data/projects.ts). Wydzielone do osobnego, zależnego wyłącznie od
// lib/data/types modułu, żeby prezentacyjne komponenty (ResultCard,
// FavoriteCompareTable) mogły go zaimportować bez ściągania całego
// lib/data/projects.ts, a razem z nim prawdziwego klienta Neon (lib/db/client)
// do testów komponentów, które nigdy nie dotykają bazy.
export function getDefaultProjectVariant(project: Project): ProjectVariant | undefined {
  return project.variants.find((variant) => variant.isDefault) ?? project.variants[0];
}

export interface InPriceCostLineItemSummary {
  labels: string[];
  extraCount: number;
}

// AC-6 (spec 0051): zastępuje dawne scopeSummary na ResultCard/ProjectCompareTable
// z do trzech etykiet pozycji kosztowych ze statusem "w cenie", w porządku, w
// jakim resolveProductVariants (lib/data/projects.ts) już je posortowało
// (sort_order rosnąco, puste na końcu) — czysta funkcja nad już pobranymi
// danymi, ten sam wzorzec co getDefaultProjectVariant wyżej. Wariant bez
// żadnej pozycji "w cenie" (pusta tablica albo brak tego statusu) zwraca puste
// labels — wywołujący pokazuje wtedy dzisiejszy fallback.
export function getInPriceCostLineItemLabels(variant: ProjectVariant, max = 3): InPriceCostLineItemSummary {
  const inPrice = variant.costLineItems.filter((item) => item.status === "w-cenie");
  return {
    // Karta pokazuje samą nazwę pozycji (tekst przed dwukropkiem); pełny opis zostaje na stronie produktu.
    labels: inPrice.slice(0, max).map((item) => item.label.split(":")[0].trim()),
    extraCount: Math.max(0, inPrice.length - max),
  };
}

/** Stawka użyta do wyliczenia ceny minimalnej, gdy produkt nie ma żadnej ceny. */
export const ESTIMATED_PRICE_PER_M2_EUR = 1100;

export type ProjectPriceDisplay =
  | { priceOnRequest: true }
  | {
      /** False here narrows `variant.priceMin` to a real number below — the
       * same real variant always carries the price, its label/standard and
       * its scope together, so a caller can never show a price paired with a
       * different variant's scope (spec 0044 AC-1). */
      priceOnRequest: false;
      estimated?: false;
      variant: ProjectVariant & { priceMin: number };
    }
  | {
      /** Produkt bez ceny wariantu: `priceMin` to płaskie `Project.priceMin`
       * albo, gdy go brak, powierzchnia użytkowa razy ESTIMATED_PRICE_PER_M2_EUR.
       * Nie ma wariantu, więc nie ma etykiety standardu ani zakresu. */
      priceOnRequest: false;
      estimated: true;
      priceMin: number;
    };

// Cena "od" dla produktu bez ceny w wariancie, wspólna dla karty wyniku, karty
// z głównej i strony projektu, żeby wszystkie pokazywały tę samą liczbę.
// Płaska cena produktu ma pierwszeństwo, wyliczenie z m² to ostatnia deska
// ratunku. Bez powierzchni (floorAreaM2 null/0) zwraca undefined.
export function getEstimatedMinPriceEur(project: Project): number | undefined {
  if (project.priceMin > 0) return project.priceMin;
  if (project.floorAreaM2 !== null && project.floorAreaM2 > 0) {
    return Math.round(project.floorAreaM2 * ESTIMATED_PRICE_PER_M2_EUR);
  }
  return undefined;
}

// Wspólny selektor pary cena–standard–zakres (spec 0044 Projekt rozwiązania
// #1), używany przez ResultCard, /compare i (przyszłościowo) katalog
// producenta, żeby wszystkie trzy miejsca czytały dokładnie ten sam,
// nigdy-placeholder wariant zamiast każde po swojemu zgadywać cenę.
export function getProjectPriceDisplay(project: Project): ProjectPriceDisplay {
  const variant = getDefaultProjectVariant(project);
  // Spec 0050 AC-37: `variant.priceOnRequest` sprawdzany jawnie, nie tylko
  // wywnioskowany z `priceMin === undefined` (choć CHECK product_variant_
  // price_on_request gwarantuje dziś to samo) — jasny sygnał zamiast efektu
  // ubocznego innej kolumny.
  // Jawne "wycena indywidualna" (produkt albo wariant) zostaje bez zmian; tylko
  // brak ceny bez takiej flagi dostaje cenę szacunkową.
  if (project.priceOnRequest || variant?.priceOnRequest) {
    return { priceOnRequest: true };
  }
  if (!variant || variant.priceMin === undefined) {
    const estimated = getEstimatedMinPriceEur(project);
    return estimated === undefined ? { priceOnRequest: true } : { priceOnRequest: false, estimated: true, priceMin: estimated };
  }
  // TS narrows `variant.priceMin` at this point but not the `variant`
  // binding's own declared type; the guard above already proved it.
  return { priceOnRequest: false, variant: variant as ProjectVariant & { priceMin: number } };
}

/** groupId -> selected option id(s), already defaulted/tolerant (spec 0059 AC-2, AC-6). */
export type SelectedProductOptionsByGroup = Map<string, string[]>;

// Rozwiązuje parametr adresu `opcje` (lista id rozdzielona przecinkami) na
// faktycznie zaznaczone opcje per grupa, tolerancyjnie (spec 0059 AC-6):
// nieznane/nieaktualne id są po cichu ignorowane, a dla grupy single więcej
// niż jedno id z tej samej grupy w adresie rozwiązuje się do pierwszego z
// nich (reszta z tej grupy jest pomijana). Grupa single bez żadnego
// prawidłowego id w adresie spada na jej is_default opcję, a w jej braku (błąd
// danych) na pierwszą wg sort_order — ten sam fallback co
// getDefaultProjectVariant wyżej (spec 0059 AC-2).
export function resolveSelectedProductOptions(
  groups: ProductOptionGroup[],
  rawParam: string | undefined,
): SelectedProductOptionsByGroup {
  const rawIds = rawParam ? rawParam.split(",").filter(Boolean) : [];
  const resolved: SelectedProductOptionsByGroup = new Map();
  for (const group of groups) {
    const ownOptionIds = new Set(group.options.map((option) => option.id));
    const matchingRawIds = rawIds.filter((id) => ownOptionIds.has(id));
    if (group.selectionType === "single") {
      const chosenId =
        matchingRawIds[0] ?? group.options.find((option) => option.isDefault)?.id ?? group.options[0]?.id;
      resolved.set(group.id, chosenId ? [chosenId] : []);
    } else {
      const deduped: string[] = [];
      for (const id of matchingRawIds) {
        if (!deduped.includes(id)) deduped.push(id);
      }
      resolved.set(group.id, deduped);
    }
  }
  return resolved;
}

export function flattenSelectedProductOptionIds(selected: SelectedProductOptionsByGroup): string[] {
  return [...selected.values()].flat();
}

// Wylicza nową wartość parametru `opcje` po zaznaczeniu/odznaczeniu jednej
// opcji (spec 0059 AC-3): serializuje PEŁNY, już rozwiązany wybór wszystkich
// grup (defaulty włącznie), nie tylko zmienioną grupę — żeby skopiowany link
// odtwarzał dokładnie tę konfigurację, nawet jeśli domyślna opcja grupy
// zmieni się później. Grupa single: zamienia zaznaczenie na optionId. Grupa
// multi: przełącza przynależność (dodaje/usuwa).
export function toggleProductOption(
  groups: ProductOptionGroup[],
  currentSelection: SelectedProductOptionsByGroup,
  groupId: string,
  optionId: string,
): string {
  const group = groups.find((candidate) => candidate.id === groupId);
  if (!group) return flattenSelectedProductOptionIds(currentSelection).join(",");

  const next = new Map(currentSelection);
  if (group.selectionType === "single") {
    next.set(groupId, [optionId]);
  } else {
    const current = next.get(groupId) ?? [];
    next.set(groupId, current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]);
  }
  return flattenSelectedProductOptionIds(next).join(",");
}

export type SelectedProductOptionsPrice = { priceOnRequest: true } | { priceOnRequest: false; totalEur: number };

// Czysta funkcja liczenia ceny zaznaczonych opcji (spec 0059 AC-4): propaguje
// priceOnRequest z DOWOLNEJ zaznaczonej opcji, nigdy nie pokazuje mylącej
// dokładnej sumy, gdy jeden ze składników nie ma ustalonej ceny. Jednostka
// euro, ten sam wzorzec co ProjectVariant.priceMin/Project.priceMin (cena w
// bazie jest w centach, przeliczana tu raz).
export function getSelectedProductOptionsPrice(
  groups: ProductOptionGroup[],
  selectedOptionIds: string[],
): SelectedProductOptionsPrice {
  const selectedIdSet = new Set(selectedOptionIds);
  const selectedOptions = groups.flatMap((group) => group.options.filter((option) => selectedIdSet.has(option.id)));
  if (selectedOptions.some((option) => option.priceOnRequest)) return { priceOnRequest: true };
  const totalCents = selectedOptions.reduce((sum, option) => sum + (option.priceCents ?? 0), 0);
  return { priceOnRequest: false, totalEur: totalCents / 100 };
}
