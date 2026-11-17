// Filtry strony kategorii /outdoor-kitchen (spec 0086, panel po lewej jak na /sauna, spec 0068). Ten sam wzorzec co
// lib/sauna-filters.ts: każde pole czyszczone osobno, zła wartość odrzucana po cichu, stan wyłącznie w URL.
// Filtrowanie idzie po już wczytanej liście kuchni (kilkanaście produktów), bez osobnego zapytania do bazy.
import type { Project } from "@/lib/data/types";
import { OUTDOOR_KITCHEN_TYPES, type OutdoorKitchenType } from "@/lib/product-technical-specs";

// Progi ceny "od" w EUR, dobrane do katalogu 2026 (4 554 do 15 600 €).
export const OUTDOOR_KITCHEN_PRICE_THRESHOLDS = [5000, 7500, 10000] as const;
export type OutdoorKitchenPriceThreshold = (typeof OUTDOOR_KITCHEN_PRICE_THRESHOLDS)[number];

export const OUTDOOR_KITCHEN_SORT_OPTIONS = ["price-asc", "price-desc"] as const;
export type OutdoorKitchenSortOption = (typeof OUTDOOR_KITCHEN_SORT_OPTIONS)[number];

export interface OutdoorKitchenFilter {
  type?: OutdoorKitchenType;
  priceMin?: OutdoorKitchenPriceThreshold;
  priceMax?: OutdoorKitchenPriceThreshold;
  sort?: OutdoorKitchenSortOption;
}

export interface OutdoorKitchenPriceRange {
  priceMin?: OutdoorKitchenPriceThreshold;
  priceMax?: OutdoorKitchenPriceThreshold;
}

const T = OUTDOOR_KITCHEN_PRICE_THRESHOLDS;
export const OUTDOOR_KITCHEN_PRICE_RANGES: readonly OutdoorKitchenPriceRange[] = [
  { priceMax: T[0] },
  ...T.slice(0, -1).map((min, index) => ({ priceMin: min, priceMax: T[index + 1] })),
  { priceMin: T[T.length - 1] },
];

export function outdoorKitchenPriceKey(range: OutdoorKitchenPriceRange): string {
  return `${range.priceMin ?? "x"}-${range.priceMax ?? "x"}`;
}

function parseThreshold(raw: string | string[] | undefined): OutdoorKitchenPriceThreshold | undefined {
  if (typeof raw !== "string") return undefined;
  const value = Number(raw);
  return (T as readonly number[]).includes(value) ? (value as OutdoorKitchenPriceThreshold) : undefined;
}

export function parseOutdoorKitchenSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): OutdoorKitchenFilter {
  const rawType = searchParams.type;
  const type =
    typeof rawType === "string" && (OUTDOOR_KITCHEN_TYPES as readonly string[]).includes(rawType)
      ? (rawType as OutdoorKitchenType)
      : undefined;
  let priceMin = parseThreshold(searchParams.priceMin);
  let priceMax = parseThreshold(searchParams.priceMax);
  // Odwrócona para kasuje obie wartości zamiast zgadywać, która jest poprawna.
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    priceMin = undefined;
    priceMax = undefined;
  }
  const rawSort = searchParams.sort;
  const sort =
    typeof rawSort === "string" && (OUTDOOR_KITCHEN_SORT_OPTIONS as readonly string[]).includes(rawSort)
      ? (rawSort as OutdoorKitchenSortOption)
      : undefined;
  return { type, priceMin, priceMax, sort };
}

export function hasActiveOutdoorKitchenFilter(filter: OutdoorKitchenFilter): boolean {
  return (
    filter.type !== undefined ||
    filter.priceMin !== undefined ||
    filter.priceMax !== undefined ||
    filter.sort !== undefined
  );
}

export function buildOutdoorKitchenHref(locale: string, filter: OutdoorKitchenFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.type !== undefined) params.set("type", filter.type);
  if (filter.priceMin !== undefined) params.set("priceMin", String(filter.priceMin));
  if (filter.priceMax !== undefined) params.set("priceMax", String(filter.priceMax));
  if (filter.sort !== undefined) params.set("sort", filter.sort);
  const query = params.toString();
  return query ? `/${locale}/outdoor-kitchen?${query}` : `/${locale}/outdoor-kitchen`;
}

// Cena "od" w przedziale (granice włącznie, jak filtr ceny saun). Produkt "na zapytanie" odpada przy filtrze ceny.
export function filterOutdoorKitchens(projects: Project[], filter: OutdoorKitchenFilter): Project[] {
  return projects.filter((project) => {
    if (filter.type && project.outdoorKitchenTechnicalSpecs?.kitchenType !== filter.type) return false;
    if (filter.priceMin === undefined && filter.priceMax === undefined) return true;
    if (project.priceOnRequest) return false;
    if (filter.priceMin !== undefined && project.priceMin < filter.priceMin) return false;
    if (filter.priceMax !== undefined && project.priceMin > filter.priceMax) return false;
    return true;
  });
}
