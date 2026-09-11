"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { Filter, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { Country, CountryCode } from "@/lib/data/types";
import { buildResultsHref, SORT_OPTIONS, type ResultsFilter, type SortOption } from "@/lib/results-filters";
import { SIZE_THRESHOLDS, type SizeThreshold } from "@/lib/size-thresholds";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface ResultsFilterBarProps {
  locale: string;
  countries: Country[];
  filter: ResultsFilter;
  /** FamilyTabs/CategoryFilterBar/SubcategoryFilterBar (server components,
   * page.tsx composes them in) — rendered only inside the mobile bottom
   * sheet below, so results start right at the top of the phone screen. */
  mobileFilters: ReactNode;
}

const sizeOptions: SegmentOption[] = SIZE_THRESHOLDS.map((threshold) => ({
  value: String(threshold),
  label: `${threshold} m²`,
}));

// Pole wyszukiwania i sortowanie (spec 0026 AC-5, AC-9) dzielą wzorzec nawigacji z
// country/metraż poniżej: lokalny stan, nawigacja dopiero po kliknięciu "Szukaj"
// (albo Enter w polu tekstowym), nigdy filtr atrybutów/podkategorii/ceny —
// te przychodzą przez `filter` i zostają nietknięte (chipy je ustawiają osobno).
export function ResultsFilterBar({ locale, countries, filter, mobileFilters }: ResultsFilterBarProps) {
  const t = useTranslations("ResultsFilterBar");
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode | null>(filter.countryCode ?? null);
  const [min, setMin] = useState<number | null>(filter.sizeMin ?? null);
  const [max, setMax] = useState<number | null>(filter.sizeMax ?? null);
  const [sort, setSort] = useState<SortOption | null>(filter.sort ?? null);
  const [q, setQ] = useState(filter.q ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const inlineBarRef = useRef<HTMLDivElement>(null);
  // Starts false (Filtruj shown) so it's already there for the SSR-rendered
  // first paint, before this effect can even run — the one case that
  // matters most, since below `sm` the inline row is `display:none` and
  // never intersects, so this only ever flips true on `sm` and up, where
  // Filtruj then fades out for as long as the inline row is still on
  // screen and back in once it scrolls out of view.
  const [inlineBarVisible, setInlineBarVisible] = useState(false);

  useEffect(() => {
    const el = inlineBarRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInlineBarVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sortLabels: Record<SortOption, string> = {
    "price-asc": t("sortPriceAsc"),
    "price-desc": t("sortPriceDesc"),
    "size-asc": t("sortSizeAsc"),
    "size-desc": t("sortSizeDesc"),
  };
  const sortOptions: SegmentOption[] = SORT_OPTIONS.map((value) => ({ value, label: sortLabels[value] }));
  const countryOptions: SegmentOption[] = countries.map((c) => ({ value: c.code, label: c.name }));
  const sizeMaxOptions = sizeOptions.filter((option) => min === null || Number(option.value) >= min);
  const activeFilterCount = [country, min, max, sort, q.trim() || null].filter((value) => value !== null).length;

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
    <>
      {/* Desktop/tablet (`sm` up) only: the fields inline, at the top of the
          page above the grid, on the first frame — no scrolling or opening
          anything needed to search right away. Below `sm` this row is 5 full
          width stacked fields, well over half a phone screen tall, so it
          only lives in the bottom sheet there (see the Dialog below). Shares
          this component's own `country`/`min`/`max`/`sort`/`q` state with
          that sheet, so the two never drift out of sync. */}
      <div
        ref={inlineBarRef}
        className="hidden w-full flex-col divide-y divide-brand-v5-line rounded-[2.5rem] border border-brand-v5-line bg-brand-v5-surface shadow-sm sm:flex sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0"
      >
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

      {/* Every width: a compact pill stays pinned to the bottom of the
          viewport and opens a bottom sheet with every field. Below `sm`
          (inline row is `display:none`, never intersects) it's just always
          there — mobile's only way in. From `sm` up it only appears once
          the inline row above has scrolled fully out of view (an
          IntersectionObserver on that row drives `inlineBarVisible`), so
          the two are never both on screen fighting for attention. The
          `.results-filter-bar` marker plus `.results-shell:has(...)` rule in
          globals.css shifts it up above ShortlistActionBar when that's also
          on screen (selection made) — CSS only, so neither component needs
          to know about the other's state. */}
      <div
        aria-hidden={inlineBarVisible}
        className={`results-filter-bar fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-brand-v5-line bg-brand-v5-surface/95 p-brand-2 backdrop-blur transition-all duration-300 ease-out ${
          inlineBarVisible ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="focus-ring flex items-center gap-2 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong"
        >
          <Filter className="size-4" aria-hidden="true" />
          {t("filterTrigger")}
          {activeFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-v5-amber-foreground/15 text-label font-semibold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <Dialog open={mobileOpen} onClose={setMobileOpen} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-brand-v5-ink/40 transition duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-x-0 bottom-0 flex max-h-[85vh] flex-col">
          <DialogPanel
            transition
            className="flex max-h-[85vh] flex-col gap-brand-4 overflow-y-auto rounded-t-[2rem] bg-brand-v5-surface p-brand-4 shadow-xl transition duration-200 ease-out data-[closed]:translate-y-full"
          >
            <div className="flex items-center justify-between">
              <span className="text-body font-semibold text-brand-v5-ink">{t("filterTrigger")}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t("closeFilters")}
                className="focus-ring flex items-center justify-center rounded-data p-1 text-brand-v5-ink hover:opacity-70"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-brand-3">{mobileFilters}</div>
            <div className="flex flex-col divide-y divide-brand-v5-line rounded-v5-card border border-brand-v5-line">
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
              <div className="flex flex-col gap-0.5 px-brand-3 py-brand-2">
                <label htmlFor="results-search-q-sheet" className="text-label font-semibold text-brand-v5-ink">
                  {t("keywordLabel")}
                </label>
                <input
                  id="results-search-q-sheet"
                  type="text"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                      setMobileOpen(false);
                    }
                  }}
                  placeholder={t("keywordPlaceholder")}
                  className="focus-ring w-full rounded-data bg-transparent text-body text-brand-v5-ink placeholder:text-brand-v5-muted/70"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                handleSearch();
                setMobileOpen(false);
              }}
              className="focus-ring flex items-center justify-center gap-2 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-3 text-body font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong"
            >
              <Search className="size-4" aria-hidden="true" />
              {t("applyFilters")}
            </button>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
