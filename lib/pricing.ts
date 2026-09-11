import type { CountryCode } from "./data/types";

// First shared pricing module in the project (spec 0006's Neutral); the
// producer side's own paid gateway mock (function 14) reuses this constant
// instead of defining its own, per that spec's Follow-up.
export const PLOT_ANALYSIS_PRICE_EUR = 149;
export const PLOT_ANALYSIS_CURRENCY = "EUR";

// Flat mock assembly figure per delivery country, same placeholder spirit as
// the plot analysis price above. Feeds the broken-down price on /wyniki when
// a target country is known (spec 0015 AC-14).
const MOCK_ASSEMBLY_PRICE_EUR_BY_COUNTRY: Record<CountryCode, number> = {
  PL: 1800,
  DE: 2600,
  NL: 2900,
};

export function getMockAssemblyPriceEur(countryCode: CountryCode): number {
  return MOCK_ASSEMBLY_PRICE_EUR_BY_COUNTRY[countryCode];
}
