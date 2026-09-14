import type {
  ContainerSubcategory,
  CountryCode,
  EligibilityStatus,
  ProductFamily,
  Project,
  SpaSubcategory,
} from "./data/types";
import { resolveFamilies, type FamilyFilterValue } from "./product-family-groups";
import { ENERGY_CLASSES, HEAT_SOURCES, VENTILATION_TYPES, type EnergyClass, type HeatSource, type VentilationType } from "./product-technical-specs";
import { SIZE_THRESHOLDS, type SizeThreshold } from "./size-thresholds";

const VALID_COUNTRY_CODES: readonly CountryCode[] = ["PL", "DE", "NL"];
// Trzy prawdziwe rodziny plus sentinel grupy "wiecej-niz-dom" (spec 0035 AC-2).
const VALID_FAMILY_FILTER_VALUES: readonly FamilyFilterValue[] = ["dom", "spa-modulowe", "kontenery-modulowe", "wiecej-niz-dom"];
const DEFAULT_FAMILY: FamilyFilterValue = "dom";

const VALID_SPA_SUBCATEGORIES: readonly SpaSubcategory[] = ["sauna", "jacuzzi", "wellness-combo"];
const VALID_CONTAINER_SUBCATEGORIES: readonly ContainerSubcategory[] = ["gastronomiczne", "uslugowe", "mieszkalne"];

// Skala progów ceny "od" w EUR, ten sam wzorzec zamkniętych progów co SIZE_THRESHOLDS
// (spec 0026 AC-4): dobrana do rozstawu dzisiejszego katalogu (patrz spec rationale).
export const PRICE_THRESHOLDS = [50000, 100000, 150000, 250000] as const;
export type PriceThreshold = (typeof PRICE_THRESHOLDS)[number];

export type StoreysFilter = "parterowy" | "pietrowy";
const VALID_STOREYS: readonly StoreysFilter[] = ["parterowy", "pietrowy"];

// Skrót "pompa-ciepla" (chip "Pompa ciepła", spec 0026 AC-2) obok pełnych wartości enuma:
// nadal dokładnie jedna wartość URL, rozwijana do dwóch przez resolveHeatSourceValues.
export type HeatSourceFilterValue = HeatSource | "pompa-ciepla";
const VALID_HEAT_SOURCE_FILTER_VALUES: readonly HeatSourceFilterValue[] = [...HEAT_SOURCES, "pompa-ciepla"];

export const SORT_OPTIONS = ["price-asc", "price-desc", "size-asc", "size-desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export interface ResultsFilter {
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
  // Domyślnie "dom" (spec 0023 AC-4): niepodany lub nieprawidłowy parametr URL
  // pada łagodnie na dom, ten sam wzorzec co country/sizeMin/sizeMax. Poza
  // trzema prawdziwymi rodzinami dopuszcza sentinel grupy "wiecej-niz-dom"
  // (spec 0035 AC-2), rozwiązywany przez FAMILY_GROUPS w getProjects()/
  // matchesResultsFilter.
  family: FamilyFilterValue;
  // Poniższe cztery są znaczące tylko dla family "dom" (spec 0026 Key invariants);
  // parseResultsSearchParams je zawsze parsuje niezależnie od family — o tym, czy
  // mają zastosowanie, decyduje getProjects() w chwili budowania zapytania.
  heatSource?: HeatSourceFilterValue;
  ventilation?: VentilationType;
  energyClass?: EnergyClass;
  storeys?: StoreysFilter;
  priceMin?: PriceThreshold;
  priceMax?: PriceThreshold;
  // Znaczące tylko dla family dopasowanej do ich nazwy (spec 0026 Key invariants,
  // ta sama granica co pole category z spec 0022).
  spaSubcategory?: SpaSubcategory;
  containerSubcategory?: ContainerSubcategory;
  sort?: SortOption;
  q?: string;
}

function parseSizeValue(raw: string | string[] | undefined): SizeThreshold | undefined {
  if (typeof raw !== "string") return undefined;
  const value = Number(raw);
  return (SIZE_THRESHOLDS as readonly number[]).includes(value) ? (value as SizeThreshold) : undefined;
}

function parsePriceValue(raw: string | string[] | undefined): PriceThreshold | undefined {
  if (typeof raw !== "string") return undefined;
  const value = Number(raw);
  return (PRICE_THRESHOLDS as readonly number[]).includes(value) ? (value as PriceThreshold) : undefined;
}

function parseEnumValue<T extends string>(raw: string | string[] | undefined, valid: readonly T[]): T | undefined {
  return typeof raw === "string" && (valid as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

// Every field is cleaned independently; an invalid value is dropped, never surfaced as an
// error (spec 0004, AC-5/AC-6; rozszerzone o nowe pola spec 0026 AC-3). A reversed
// sizeMin/sizeMax (lub priceMin/priceMax) para drops both rather than guessing which one jest poprawne.
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

  let priceMin = parsePriceValue(searchParams.priceMin);
  let priceMax = parsePriceValue(searchParams.priceMax);
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    priceMin = undefined;
    priceMax = undefined;
  }

  const rawFamily = searchParams.family;
  const family =
    typeof rawFamily === "string" && VALID_FAMILY_FILTER_VALUES.includes(rawFamily as FamilyFilterValue)
      ? (rawFamily as FamilyFilterValue)
      : DEFAULT_FAMILY;

  const heatSource = parseEnumValue(searchParams.heatSource, VALID_HEAT_SOURCE_FILTER_VALUES);
  const ventilation = parseEnumValue(searchParams.ventilation, VENTILATION_TYPES);
  const energyClass = parseEnumValue(searchParams.energyClass, ENERGY_CLASSES);
  const storeys = parseEnumValue(searchParams.storeys, VALID_STOREYS);
  const spaSubcategory = parseEnumValue(searchParams.spaSubcategory, VALID_SPA_SUBCATEGORIES);
  const containerSubcategory = parseEnumValue(searchParams.containerSubcategory, VALID_CONTAINER_SUBCATEGORIES);
  const sort = parseEnumValue(searchParams.sort, SORT_OPTIONS);

  const rawQ = searchParams.q;
  const trimmedQ = typeof rawQ === "string" ? rawQ.trim() : "";
  const q = trimmedQ.length > 0 ? trimmedQ : undefined;

  return {
    countryCode,
    sizeMin,
    sizeMax,
    family,
    heatSource,
    ventilation,
    energyClass,
    storeys,
    priceMin,
    priceMax,
    spaSubcategory,
    containerSubcategory,
    sort,
    q,
  };
}

// Serializuje cały filtr do query stringu /wyniki, jedno miejsce dla każdego
// linku, który musi zachować resztę filtra przy zmianie jednego wymiaru (chipy
// atrybutów, podkategorii — spec 0026 AC-7, AC-8; ten sam wzorzec co dzisiejsze
// ręczne budowanie w FamilyTabs/ResultsFilterBar, tylko dla kompletnego zestawu pól).
function resultsFilterToSearchParams(filter: ResultsFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.family !== DEFAULT_FAMILY) params.set("family", filter.family);
  if (filter.countryCode) params.set("country", filter.countryCode);
  if (filter.sizeMin !== undefined) params.set("sizeMin", String(filter.sizeMin));
  if (filter.sizeMax !== undefined) params.set("sizeMax", String(filter.sizeMax));
  if (filter.heatSource !== undefined) params.set("heatSource", filter.heatSource);
  if (filter.ventilation !== undefined) params.set("ventilation", filter.ventilation);
  if (filter.energyClass !== undefined) params.set("energyClass", filter.energyClass);
  if (filter.storeys !== undefined) params.set("storeys", filter.storeys);
  if (filter.priceMin !== undefined) params.set("priceMin", String(filter.priceMin));
  if (filter.priceMax !== undefined) params.set("priceMax", String(filter.priceMax));
  if (filter.spaSubcategory !== undefined) params.set("spaSubcategory", filter.spaSubcategory);
  if (filter.containerSubcategory !== undefined) params.set("containerSubcategory", filter.containerSubcategory);
  if (filter.sort !== undefined) params.set("sort", filter.sort);
  if (filter.q !== undefined) params.set("q", filter.q);
  return params;
}

export function buildResultsHref(locale: string, filter: ResultsFilter): string {
  const query = resultsFilterToSearchParams(filter).toString();
  return `/${locale}/results${query ? `?${query}` : ""}`;
}

// Toggle jednego wymiaru filtra, zachowując resztę bez zmian: ponowne kliknięcie
// tej samej wartości czyści filtr (spec 0026 AC-7, API surface: "Ponowne
// kliknięcie tego samego chipa czyści filtr").
export function toggleFilterValue<K extends "heatSource" | "ventilation" | "energyClass" | "storeys" | "spaSubcategory" | "containerSubcategory">(
  filter: ResultsFilter,
  key: K,
  value: NonNullable<ResultsFilter[K]>
): ResultsFilter {
  return { ...filter, [key]: filter[key] === value ? undefined : value };
}

// Rozwija skrót "pompa-ciepla" (chip "Pompa ciepła") na obie podwartości enuma
// jednocześnie (spec 0026 AC-2); każda inna wartość zwraca samą siebie jako
// jednoelementową tablicę. Używane przez getProjects() do budowy WHERE ... IN (...).
export function resolveHeatSourceValues(value: HeatSourceFilterValue): HeatSource[] {
  return value === "pompa-ciepla" ? ["pompa-ciepla-powietrze-woda", "pompa-ciepla-grunt-woda"] : [value];
}

// Ta sama reguła filtra co w getProjects() (lib/data/projects.ts), wyodrębniona żeby
// lokalne produkty producenta doklejone po stronie przeglądarki (spec 0016, AC-11)
// przechodziły dokładnie ten sam test co lista serwerowa, bez duplikowania logiki.
// Ogranicza się do family/country/size (spec 0023 zakres) — nowe filtry atrybutów,
// ceny, podkategorii i wyszukiwania (spec 0026) nie sięgają tej ścieżki podglądu
// lokalnego, poza zakresem build planu tej funkcji. filter.family rozwiązywany
// przez FAMILY_GROUPS (spec 0035), więc "wiecej-niz-dom" dopasowuje zarówno
// spa-modulowe, jak i kontenery-modulowe, tak samo jak getProjects().
export function matchesResultsFilter(
  floorAreaM2: number,
  eligibilityStatus: EligibilityStatus | undefined,
  filter: ResultsFilter,
  family: ProductFamily = "dom"
): boolean {
  if (!resolveFamilies(filter.family).includes(family)) return false;
  if (filter.countryCode && (eligibilityStatus === undefined || eligibilityStatus === "blocked")) return false;
  if (filter.sizeMin !== undefined && floorAreaM2 < filter.sizeMin) return false;
  if (filter.sizeMax !== undefined && floorAreaM2 > filter.sizeMax) return false;
  return true;
}

// Jedyne miejsce sortowania (spec 0026 Feature design, API surface): brak lub
// nierozpoznany sort → dzisiejsze domyślne zachowanie, wyróżnione projekty najpierw,
// potem rosnąco po cenie od. Reużywany przez stronę serwerową, ResultsSelection po
// doklejeniu lokalnym (spec 0016, AC-11) i getProjects() już nie sortuje samo.
export function sortResults(projects: Project[], sort?: SortOption): Project[] {
  switch (sort) {
    case "price-asc":
      return [...projects].sort((a, b) => a.priceMin - b.priceMin);
    case "price-desc":
      return [...projects].sort((a, b) => b.priceMin - a.priceMin);
    case "size-asc":
      return [...projects].sort((a, b) => a.floorAreaM2 - b.floorAreaM2);
    case "size-desc":
      return [...projects].sort((a, b) => b.floorAreaM2 - a.floorAreaM2);
    default:
      return [...projects].sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.priceMin - b.priceMin;
      });
  }
}
