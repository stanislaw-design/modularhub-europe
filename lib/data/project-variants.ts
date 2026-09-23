import type { CompletionStandard, Project, ProjectVariant } from "./types";

// Fixed order the completion-standard enum is always presented in (matches
// the redesign reference): surowy zamknięty, deweloperski, pod klucz.
const ALL_COMPLETION_STANDARDS: CompletionStandard[] = ["surowy-zamkniety", "deweloperski", "pod-klucz"];

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

// The picker/comparison table always show all three completion standards
// (the enum is closed, spec 0042 AC-7 comment), even before a producer has
// entered real `product_variant` rows for every one of them — a standard
// without a real row renders as an explicit `isPlaceholder` entry so the UI
// can show "do uzupełnienia" instead of silently hiding the whole tab.
export function getDisplayProjectVariants(project: Project): ProjectVariant[] {
  return ALL_COMPLETION_STANDARDS.map((completionStandard) => {
    const existing = project.variants.find((variant) => variant.completionStandard === completionStandard);
    if (existing) return existing;
    return {
      id: `placeholder-${completionStandard}`,
      completionStandard,
      currency: "EUR",
      priceOnRequest: false,
      isDefault: false,
      costLineItems: [],
      timelineStages: [],
      isPlaceholder: true,
    };
  });
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
