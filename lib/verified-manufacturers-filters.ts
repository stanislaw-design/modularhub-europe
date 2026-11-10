import { SIZE_THRESHOLDS, type SizeThreshold } from "./size-thresholds";

// Zawężony odpowiednik ResultsFilter (lib/results-filters.ts) dla /verified-manufacturers
// (spec 0038 AC-19): tylko metraż i słowo kluczowe, bez sortowania i bez rodziny
// produktu (patrz index.md Follow-up). Spec 0082 AC-9: bez kraju, kraje dostawy
// producenta to deklaracja na karcie, nie filtr.
export interface VerifiedManufacturersFilter {
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
  let sizeMin = parseSizeValue(searchParams.sizeMin);
  let sizeMax = parseSizeValue(searchParams.sizeMax);
  if (sizeMin !== undefined && sizeMax !== undefined && sizeMin > sizeMax) {
    sizeMin = undefined;
    sizeMax = undefined;
  }

  const rawQ = searchParams.q;
  const trimmedQ = typeof rawQ === "string" ? rawQ.trim() : "";
  const q = trimmedQ.length > 0 ? trimmedQ : undefined;

  return { sizeMin, sizeMax, q };
}

function verifiedManufacturersFilterToSearchParams(filter: VerifiedManufacturersFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.sizeMin !== undefined) params.set("sizeMin", String(filter.sizeMin));
  if (filter.sizeMax !== undefined) params.set("sizeMax", String(filter.sizeMax));
  if (filter.q !== undefined) params.set("q", filter.q);
  return params;
}

export function buildVerifiedManufacturersHref(locale: string, filter: VerifiedManufacturersFilter): string {
  const query = verifiedManufacturersFilterToSearchParams(filter).toString();
  return `/${locale}/verified-manufacturers${query ? `?${query}` : ""}`;
}
