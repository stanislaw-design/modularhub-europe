"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Country, CountryCode } from "@/lib/data/types";
import { buildResultsHref, SORT_OPTIONS, type ResultsFilter, type SortOption } from "@/lib/results-filters";
import { SIZE_THRESHOLDS, type SizeThreshold } from "@/lib/size-thresholds";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface ResultsFilterBarProps {
  locale: string;
  countries: Country[];
  filter: ResultsFilter;
}

const sizeOptions: SegmentOption[] = SIZE_THRESHOLDS.map((threshold) => ({
  value: String(threshold),
  label: `${threshold} m²`,
}));

// Pole wyszukiwania i sortowanie (spec 0026 AC-5, AC-9) dzielą wzorzec nawigacji z
// country/metraż poniżej: lokalny stan, nawigacja dopiero po kliknięciu "Szukaj"
// (albo Enter w polu tekstowym), nigdy filtr atrybutów/podkategorii/ceny —
// te przychodzą przez `filter` i zostają nietknięte (chipy je ustawiają osobno).
export function ResultsFilterBar({ locale, countries, filter }: ResultsFilterBarProps) {
  const t = useTranslations("ResultsFilterBar");
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode | null>(filter.countryCode ?? null);
  const [min, setMin] = useState<number | null>(filter.sizeMin ?? null);
  const [max, setMax] = useState<number | null>(filter.sizeMax ?? null);
  const [sort, setSort] = useState<SortOption | null>(filter.sort ?? null);
  const [q, setQ] = useState(filter.q ?? "");

  const sortLabels: Record<SortOption, string> = {
    "price-asc": t("sortPriceAsc"),
    "price-desc": t("sortPriceDesc"),
    "size-asc": t("sortSizeAsc"),
    "size-desc": t("sortSizeDesc"),
  };
  const sortOptions: SegmentOption[] = SORT_OPTIONS.map((value) => ({ value, label: sortLabels[value] }));
  const countryOptions: SegmentOption[] = countries.map((c) => ({ value: c.code, label: c.name }));
  const sizeMaxOptions = sizeOptions.filter((option) => min === null || Number(option.value) >= min);

  function handleMinChange(value: string) {
    const next = Number(value);
    setMin(next);
    setMax((prev) => (prev !== null && prev < next ? null : prev));
  }

  function handleSearch() {
    const trimmedQ = q.trim();
    const merged: ResultsFilter = {
      ...filter,
      countryCode: country ?? undefined,
      sizeMin: min === null ? undefined : (min as SizeThreshold),
      sizeMax: max === null ? undefined : (max as SizeThreshold),
      sort: sort ?? undefined,
      q: trimmedQ.length > 0 ? trimmedQ : undefined,
    };
    router.push(buildResultsHref(locale, merged));
  }

  return (
    <div className="flex w-full flex-col divide-y divide-brand-v5-line rounded-[2.5rem] border border-brand-v5-line bg-brand-v5-surface shadow-sm sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
      <SearchSegment
        label={t("countryLabel")}
        value={country}
        onChange={(value) => setCountry(value as CountryCode)}
        options={countryOptions}
        placeholder={t("countryPlaceholder")}
        ariaLabel={t("countryAriaLabel")}
        surface="v5"
      />
      <SearchSegment
        label={t("sizeMinLabel")}
        value={min === null ? null : String(min)}
        onChange={handleMinChange}
        options={sizeOptions}
        placeholder={t("anyPlaceholder")}
        ariaLabel={t("sizeMinLabel")}
        surface="v5"
      />
      <SearchSegment
        label={t("sizeMaxLabel")}
        value={max === null ? null : String(max)}
        onChange={(value) => setMax(Number(value))}
        options={sizeMaxOptions}
        placeholder={t("anyPlaceholder")}
        ariaLabel={t("sizeMaxLabel")}
        surface="v5"
      />
      <SearchSegment
        label={t("sortLabel")}
        value={sort}
        onChange={(value) => setSort(value as SortOption)}
        options={sortOptions}
        placeholder={t("sortPlaceholder")}
        ariaLabel={t("sortAriaLabel")}
        surface="v5"
      />
      <div className="flex flex-1 flex-col justify-center gap-0.5 px-brand-3 py-brand-2">
        <label htmlFor="results-search-q" className="text-label font-semibold text-brand-v5-ink">
          {t("keywordLabel")}
        </label>
        <input
          id="results-search-q"
          type="text"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSearch();
          }}
          placeholder={t("keywordPlaceholder")}
          className="focus-ring w-full rounded-data bg-transparent text-body text-brand-v5-ink placeholder:text-brand-v5-muted/70"
        />
      </div>
      <div className="flex items-center justify-center p-brand-2">
        <button
          type="button"
          onClick={handleSearch}
          aria-label={t("searchAriaLabel")}
          className="focus-ring flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
