import type { CountryCode } from "./data/types";
import { SIZE_THRESHOLDS, type SizeThreshold } from "./size-thresholds";

const VALID_COUNTRY_CODES: readonly CountryCode[] = ["PL", "DE", "NL"];

export interface ResultsFilter {
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
}

function parseSizeValue(raw: string | string[] | undefined): SizeThreshold | undefined {
  if (typeof raw !== "string") return undefined;
  const value = Number(raw);
  return (SIZE_THRESHOLDS as readonly number[]).includes(value) ? (value as SizeThreshold) : undefined;
}

// Every field is cleaned independently; an invalid value is dropped, never surfaced as an
// error (spec 0004, AC-5/AC-6). A reversed sizeMin/sizeMax pair drops both rather than
// guessing which one is right.
export function parseResultsSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): ResultsFilter {
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

  return { countryCode, sizeMin, sizeMax };
}
