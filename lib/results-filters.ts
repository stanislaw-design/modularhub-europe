import type { CountryCode, EligibilityStatus, Project } from "./data/types";
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

// Ta sama reguła filtra co w getProjects() (lib/data/projects.ts), wyodrębniona żeby
// lokalne produkty producenta doklejone po stronie przeglądarki (spec 0016, AC-11)
// przechodziły dokładnie ten sam test co lista serwerowa, bez duplikowania logiki.
export function matchesResultsFilter(
  floorAreaM2: number,
  eligibilityStatus: EligibilityStatus | undefined,
  filter: ResultsFilter
): boolean {
  if (filter.countryCode && (eligibilityStatus === undefined || eligibilityStatus === "blocked")) return false;
  if (filter.sizeMin !== undefined && floorAreaM2 < filter.sizeMin) return false;
  if (filter.sizeMax !== undefined && floorAreaM2 > filter.sizeMax) return false;
  return true;
}

// Ten sam porządek co dziś: wyróżnione projekty najpierw, potem rosnąco po cenie od.
// Reużywany przez stronę serwerową i przez doklejenie lokalne (spec 0016, AC-11).
export function sortResults(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.priceMin - b.priceMin;
  });
}
