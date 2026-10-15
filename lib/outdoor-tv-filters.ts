// Filtry paska Outdoor TV na /results (spec 0071). Ten sam wzorzec co
// lib/sauna-filters.ts: zła wartość odrzucana po cichu (nigdy błąd), stan wyłącznie
// w URL, osobny plik, żeby te filtry nie przeciekały do ResultsFilter poza
// polami mounting/purpose (Key invariants). Bez importu bazy, dostępny też z
// komponentów klienckich.
import type { ResultsFilter } from "./results-filters";

export const OUTDOOR_TV_MOUNTINGS = ["na-sciane", "w-szafie-z-winda"] as const;
export type OutdoorTvMounting = (typeof OUTDOOR_TV_MOUNTINGS)[number];

// Kolejność jest też kolejnością sortowania wyników (AC-6): cień, częściowe słońce, pełne słońce.
export const OUTDOOR_TV_PURPOSES = [
  "cien",
  "czesciowe-slonce",
  "pelne-slonce",
] as const;
export type OutdoorTvPurpose = (typeof OUTDOOR_TV_PURPOSES)[number];

export type OutdoorTvFilterKey = "mounting" | "purpose";

export interface OutdoorTvFilterValues {
  mounting: OutdoorTvMounting[];
  purpose: OutdoorTvPurpose[];
}

function parseMany<T extends string>(
  raw: string | string[] | undefined,
  valid: readonly T[],
): T[] {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? [raw]
      : [];
  // Kolejność z listy dozwolonych, bez duplikatów: ten sam zestaw daje ten sam adres.
  return valid.filter((value) => values.includes(value));
}

export function parseOutdoorTvSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): OutdoorTvFilterValues {
  return {
    mounting: parseMany(searchParams.mounting, OUTDOOR_TV_MOUNTINGS),
    purpose: parseMany(searchParams.purpose, OUTDOOR_TV_PURPOSES),
  };
}

export function hasActiveOutdoorTvFilter(
  filter: Pick<ResultsFilter, "mounting" | "purpose" | "q">,
): boolean {
  return Boolean(filter.mounting?.length || filter.purpose?.length || filter.q);
}

// Przełącza jedną wartość chipa w grupie, resztę filtra zostawia bez zmian
// (AC-2: ponowne kliknięcie aktywnego chipa zdejmuje tylko ten chip).
export function toggleOutdoorTvValue(
  filter: ResultsFilter,
  key: "mounting",
  value: OutdoorTvMounting,
): ResultsFilter;
export function toggleOutdoorTvValue(
  filter: ResultsFilter,
  key: "purpose",
  value: OutdoorTvPurpose,
): ResultsFilter;
export function toggleOutdoorTvValue(
  filter: ResultsFilter,
  key: OutdoorTvFilterKey,
  value: string,
): ResultsFilter {
  const current: string[] = filter[key] ?? [];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
  return { ...filter, [key]: next.length > 0 ? next : undefined };
}

// Klucz sortowania z AC-6: najpierw produkty z przeznaczeniem w kolejności
// OUTDOOR_TV_PURPOSES, potem bez przeznaczenia, w obrębie grupy alfabetycznie po nazwie.
export function sortOutdoorTvResults<
  T extends { name: string; outdoorTvSunExposure?: string | null },
>(projects: T[], locale: string): T[] {
  const rank = (project: T) => {
    const index = OUTDOOR_TV_PURPOSES.indexOf(
      (project.outdoorTvSunExposure ?? "") as OutdoorTvPurpose,
    );
    return index === -1 ? OUTDOOR_TV_PURPOSES.length : index;
  };
  return [...projects].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, locale),
  );
}
