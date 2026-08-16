import type { CountryCode } from "./data/types";

// First shared pricing module in the project (spec 0006's Neutral); the
// producer side's own paid gateway mock (function 14) reuses this constant
// instead of defining its own, per that spec's Follow-up.
export const PLOT_ANALYSIS_PRICE_EUR = 149;
export const PLOT_ANALYSIS_CURRENCY = "EUR";

// Flat mock transport figure per delivery country, feeding the read only
// transport line on the producer's offer template (feature 15). A real per
// carrier network is explicitly deferred (docs/scope/scope.md, Deferred);
// this is only a placeholder number, same "Facade" spirit as the plot
// analysis price above.
const MOCK_TRANSPORT_PRICE_EUR_BY_COUNTRY: Record<CountryCode, number> = {
  PL: 3200,
  DE: 4600,
  NL: 5400,
};

export function getMockTransportPriceEur(countryCode: CountryCode): number {
  return MOCK_TRANSPORT_PRICE_EUR_BY_COUNTRY[countryCode];
}

// Oferta wiążąca (feature 9) shows one committed price for dom + transport +
// montaż instead of the range shown earlier on /wyniki and /zapytanie
// (Project.priceMin/priceMax already covers all three, per feature 6's scope
// description). Mock choice for this Facade stage: the top of that range, so
// the binding price a client sees here never exceeds what they were already
// quoted. Per-address transport cost is explicitly deferred (docs/design.md).
export function getBindingOfferPriceEur(project: { priceMax: number }): number {
  return project.priceMax;
}
