import type { CountryCode } from "./data/types";
import { SIZE_THRESHOLDS, type SizeThreshold } from "./size-thresholds";

const VALID_COUNTRY_CODES: readonly CountryCode[] = ["PL", "DE", "NL"];

// Zawężony odpowiednik ResultsFilter (lib/results-filters.ts) dla /verified-manufacturers
// (spec 0038 AC-19): tylko trzy pola, bez sortowania i bez rodziny produktu
// (patrz index.md Follow-up). Kraj dostawy to producerDeliveryCountry, nie
// eligibility jak na /wyniki (index.md Key invariants).
export interface VerifiedManufacturersFilter {
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
  q?: string;
}

function parseSizeValue(raw: string | string[] | undefined): SizeThreshold | undefined {
  if (typeof raw !== "string") return undefined;
  const value = Number(raw);
  return (SIZE_THRESHOLDS as readonly number[]).includes(value) ? (value as SizeThreshold) : undefined;
}

// Ten sam, łagodny wzorzec co parseResultsSearchParams: nieprawidłowa wartość
// znika po cichu, nigdy błąd (index.md AC-21 przez odniesienie do /wyniki).
export function parseVerifiedManufacturersSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): VerifiedManufacturersFilter {
  const rawCountry = searchParams.country;
  const countryCode =
    typeof rawCountry === "string" && VALID_COUNTRY_CODES.includes(rawCountry as CountryCode)
      ? (rawCountry as CountryCode)
      : undefined;

  let sizeMin = parseSizeValue(searchParams.sizeMin);
  let sizeMax = parseSizeValue(searchParams.sizeMax);
  if (sizeMin !== undefined && sizeMax !== undefined && sizeMin > sizeMax) {
    sizeMin = undefined;
    sizeMax = undefined;
  }

  const rawQ = searchParams.q;
  const trimmedQ = typeof rawQ === "string" ? rawQ.trim() : "";
  const q = trimmedQ.length > 0 ? trimmedQ : undefined;

  return { countryCode, sizeMin, sizeMax, q };
}

function verifiedManufacturersFilterToSearchParams(filter: VerifiedManufacturersFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.countryCode) params.set("country", filter.countryCode);
  if (filter.sizeMin !== undefined) params.set("sizeMin", String(filter.sizeMin));
  if (filter.sizeMax !== undefined) params.set("sizeMax", String(filter.sizeMax));
  if (filter.q !== undefined) params.set("q", filter.q);
  return params;
}

export function buildVerifiedManufacturersHref(locale: string, filter: VerifiedManufacturersFilter): string {
  const query = verifiedManufacturersFilterToSearchParams(filter).toString();
  return `/${locale}/verified-manufacturers${query ? `?${query}` : ""}`;
}
