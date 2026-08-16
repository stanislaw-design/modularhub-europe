// First shared pricing module in the project (spec 0006's Neutral); the
// producer side's own paid gateway mock (function 14) reuses this constant
// instead of defining its own, per that spec's Follow-up.
export const PLOT_ANALYSIS_PRICE_EUR = 149;
export const PLOT_ANALYSIS_CURRENCY = "EUR";

// Oferta wiążąca (feature 9) shows one committed price for dom + transport +
// montaż instead of the range shown earlier on /wyniki and /zapytanie
// (Project.priceMin/priceMax already covers all three, per feature 6's scope
// description). Mock choice for this Facade stage: the top of that range, so
// the binding price a client sees here never exceeds what they were already
// quoted. Per-address transport cost is explicitly deferred (docs/design.md).
export function getBindingOfferPriceEur(project: { priceMax: number }): number {
  return project.priceMax;
}
