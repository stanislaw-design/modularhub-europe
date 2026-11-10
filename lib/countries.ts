// Jedyne miejsce z listą krajów rynku (spec 0082 AC-1). Kolejny kraj to zmiana tutaj
// i w mapach Record<CountryCode, ...>, które tsc wskaże. Test countries-single-source
// pilnuje, żeby nikt nie wpisał tej listy osobno w kodzie aplikacji.
export const MARKET_COUNTRY_CODES = ["PL", "DE", "NL", "BE", "IT", "FR"] as const;

export type CountryCode = (typeof MARKET_COUNTRY_CODES)[number];

export function isMarketCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && (MARKET_COUNTRY_CODES as readonly string[]).includes(value);
}

// Flagi do kart producentów i projektów: jedna mapa zamiast trzech kopii w komponentach.
export const COUNTRY_FLAGS: Record<CountryCode, string> = {
  PL: "🇵🇱",
  DE: "🇩🇪",
  NL: "🇳🇱",
  BE: "🇧🇪",
  IT: "🇮🇹",
  FR: "🇫🇷",
};
