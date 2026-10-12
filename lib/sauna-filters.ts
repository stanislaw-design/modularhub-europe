// Filtry strony kategorii /sauna (spec 0068 AC-7 do AC-10). Ten sam wzorzec co
// lib/results-filters.ts: każde pole czyszczone osobno, zła wartość odrzucana po
// cichu (nigdy błąd), stan wyłącznie w URL. Osobny plik, bo filtry saun nie mogą
// przeciekać do ResultsFilter i parseResultsSearchParams (Key invariants).

// Progi ceny "od" w EUR dla saun, dobrane do cen Kory i WDH (spec 0068 Follow-up:
// przejrzeć po dojściu kolejnych producentów).
export const SAUNA_PRICE_THRESHOLDS = [5000, 10000, 15000, 25000] as const;
export type SaunaPriceThreshold = (typeof SAUNA_PRICE_THRESHOLDS)[number];

export const SAUNA_SEATING_THRESHOLDS = [2, 4, 6, 8] as const;
export type SaunaSeatingThreshold = (typeof SAUNA_SEATING_THRESHOLDS)[number];

export const SAUNA_SORT_OPTIONS = ["price-asc", "price-desc"] as const;
export type SaunaSortOption = (typeof SAUNA_SORT_OPTIONS)[number];

export interface SaunaFilter {
  seatingMin?: SaunaSeatingThreshold;
  priceMin?: SaunaPriceThreshold;
  priceMax?: SaunaPriceThreshold;
  /** Id producenta (uuid, bo kolumna product.producer_id jest typu uuid). */
  producer?: string;
  sort?: SaunaSortOption;
}

// Przedziały cenowe pokazywane jako chipy: kolejne progi tworzą pary, a skraje
// są otwarte. Każdy chip to dokładnie jedna para priceMin/priceMax z URL.
export interface SaunaPriceRange {
  priceMin?: SaunaPriceThreshold;
  priceMax?: SaunaPriceThreshold;
}

export const SAUNA_PRICE_RANGES: readonly SaunaPriceRange[] = [
  { priceMax: SAUNA_PRICE_THRESHOLDS[0] },
  ...SAUNA_PRICE_THRESHOLDS.slice(0, -1).map((min, index) => ({
    priceMin: min,
    priceMax: SAUNA_PRICE_THRESHOLDS[index + 1],
  })),
  { priceMin: SAUNA_PRICE_THRESHOLDS[SAUNA_PRICE_THRESHOLDS.length - 1] },
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseThreshold<T extends number>(raw: string | string[] | undefined, valid: readonly T[]): T | undefined {
  if (typeof raw !== "string") return undefined;
  const value = Number(raw);
  return (valid as readonly number[]).includes(value) ? (value as T) : undefined;
}

export function parseSaunaSearchParams(searchParams: Record<string, string | string[] | undefined>): SaunaFilter {
  const seatingMin = parseThreshold(searchParams.seatingMin, SAUNA_SEATING_THRESHOLDS);

  let priceMin = parseThreshold(searchParams.priceMin, SAUNA_PRICE_THRESHOLDS);
  let priceMax = parseThreshold(searchParams.priceMax, SAUNA_PRICE_THRESHOLDS);
  // Odwrócona para kasuje obie wartości zamiast zgadywać, która jest poprawna.
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    priceMin = undefined;
    priceMax = undefined;
  }

  const rawProducer = searchParams.producer;
  const producer = typeof rawProducer === "string" && UUID_PATTERN.test(rawProducer) ? rawProducer : undefined;

  const rawSort = searchParams.sort;
  const sort =
    typeof rawSort === "string" && (SAUNA_SORT_OPTIONS as readonly string[]).includes(rawSort)
      ? (rawSort as SaunaSortOption)
      : undefined;

  return { seatingMin, priceMin, priceMax, producer, sort };
}

export function hasActiveSaunaFilter(filter: SaunaFilter): boolean {
  return (
    filter.seatingMin !== undefined ||
    filter.priceMin !== undefined ||
    filter.priceMax !== undefined ||
    filter.producer !== undefined ||
    filter.sort !== undefined
  );
}

// Jedno miejsce serializacji filtra do /{locale}/sauna?..., dla każdego linku
// chipa, który musi zachować resztę filtra przy zmianie jednego wymiaru.
export function buildSaunaHref(locale: string, filter: SaunaFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.seatingMin !== undefined) params.set("seatingMin", String(filter.seatingMin));
  if (filter.priceMin !== undefined) params.set("priceMin", String(filter.priceMin));
  if (filter.priceMax !== undefined) params.set("priceMax", String(filter.priceMax));
  if (filter.producer !== undefined) params.set("producer", filter.producer);
  if (filter.sort !== undefined) params.set("sort", filter.sort);
  const query = params.toString();
  return query ? `/${locale}/sauna?${query}` : `/${locale}/sauna`;
}
