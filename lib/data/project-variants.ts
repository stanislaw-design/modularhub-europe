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
    labels: inPrice.slice(0, max).map((item) => item.label),
    extraCount: Math.max(0, inPrice.length - max),
  };
}

export type ProjectPriceDisplay =
  | { priceOnRequest: true }
  | {
      /** False here narrows `variant.priceMin` to a real number below — the
       * same real variant always carries the price, its label/standard and
       * its scope together, so a caller can never show a price paired with a
       * different variant's scope (spec 0044 AC-1). */
      priceOnRequest: false;
      variant: ProjectVariant & { priceMin: number };
    };

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
  if (project.priceOnRequest || !variant || variant.priceOnRequest || variant.priceMin === undefined) {
    return { priceOnRequest: true };
  }
  // TS narrows `variant.priceMin` at this point but not the `variant`
  // binding's own declared type; the guard above already proved it.
  return { priceOnRequest: false, variant: variant as ProjectVariant & { priceMin: number } };
}
