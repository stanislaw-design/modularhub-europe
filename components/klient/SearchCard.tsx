"use client";

import { Home, Layers, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Country, CountryCode } from "@/lib/data/types";
import type { FamilyFilterValue } from "@/lib/product-family-groups";
import { SIZE_RANGE_OPTIONS } from "@/lib/size-thresholds";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface SearchCardProps {
  locale: string;
  countries: Country[];
}

const sizeRangeOptions: SegmentOption[] = SIZE_RANGE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

// The white toolbar-like card sitting inside Hero (spec 0015 AC-3 dropped the
// old "Znajdź idealny dom dla siebie" heading + subcopy so it reads as one
// tool, not a second section with its own intro). Renders as the final,
// always-expanded filter bar straight away — an earlier version collapsed to
// a single Google-style teaser field that expanded on click/focus, but that
// step turned out unintuitive (users didn't realize it was a real form) and
// was dropped. Gdzie, Budżet and Powierzchnia are all real SearchSegment
// instances; Budżet's selection is visual only (see budgetRangeOptions
// below). Navigation contract to /wyniki (country, sizeMin, sizeMax) is
// unchanged from spec 0003/0004, plus family once the active category tab
// differs from the "dom" default.
export function SearchCard({ locale, countries }: SearchCardProps) {
  const t = useTranslations("SearchCard");
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<FamilyFilterValue>("dom");
  // Pre-fill Gdzie from the active locale (pl -> PL, de -> DE, nl -> NL) so the
  // most likely target country is already picked and Szukaj is usable right
  // away — one less required step. "en" has no matching country code, so it
  // falls back to unselected same as before. Only a default, not a lock: the
  // visitor can still change it via the same SearchSegment as any other field.
  const [country, setCountry] = useState<CountryCode | null>(
    () => (countries.find((c) => c.code === locale.toUpperCase())?.code as CountryCode | undefined) ?? null,
  );
  const [budgetRangeValue, setBudgetRangeValue] = useState<string | null>(null);
  const [sizeRangeValue, setSizeRangeValue] = useState<string | null>(null);

  const countryOptions: SegmentOption[] = countries.map((c) => ({ value: c.code, label: c.name }));

  // Mock ranges only — no budget field on Project yet, so unlike country/size
  // this selection never reaches handleSearch's params (spec 0014/0015 AC-3
  // deferred the underlying data model). Interactive so the toolbar reads as
  // one consistent control, same visual/keyboard behavior as Gdzie/Powierzchnia.
  const budgetRangeOptions: SegmentOption[] = [
    { value: "any", label: t("budgetAny") },
    { value: "upTo50k", label: t("budgetUpTo50k") },
    { value: "50to100k", label: t("budget50to100k") },
    { value: "100to200k", label: t("budget100to200k") },
    { value: "over200k", label: t("budgetOver200k") },
  ];

  // Two groups instead of three flat family tabs (spec 0035 AC-1): "Więcej
  // niż dom" is the same grouping CategoryShowcase already shows lower on
  // this page. Forwarded to /wyniki as the `family` param on search (spec
  // 0022/0023/0035 wired real filtering there); "dom" is the default so it's
  // omitted from the URL.
  const categoryTabs: { family: FamilyFilterValue; icon: typeof Home; label: string }[] = [
    { family: "dom", icon: Home, label: t("categoryHome") },
    { family: "wiecej-niz-dom", icon: Layers, label: t("categoryMore") },
  ];

  function handleSearch() {
    if (!country) return;
    const params = new URLSearchParams({ country });
    if (activeCategory !== "dom") params.set("family", activeCategory);
    const range = SIZE_RANGE_OPTIONS.find((option) => option.value === sizeRangeValue);
    if (range?.sizeMin !== undefined) params.set("sizeMin", String(range.sizeMin));
    if (range?.sizeMax !== undefined) params.set("sizeMax", String(range.sizeMax));
    router.push(`/${locale}/results?${params.toString()}`);
  }

  return (
    <div
      id="search-card"
      className="relative z-10 scroll-mt-brand-6 rounded-v5-panel border-2 border-brand-v5-amber bg-brand-v5-surface shadow-xl"
    >
      <div className="flex flex-col gap-brand-2 p-brand-2">
        <div
          role="tablist"
          aria-label={t("categoryAriaLabel")}
          className="flex items-center gap-brand-1 overflow-x-auto px-brand-1 [scrollbar-width:none] sm:gap-brand-2 [&::-webkit-scrollbar]:hidden"
        >
          {categoryTabs.map(({ family, icon: Icon, label }) => {
            const isActive = activeCategory === family;
            return (
              <button
                key={family}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(family)}
                className={`focus-ring relative flex shrink-0 items-center gap-1.5 rounded-v5-pill px-brand-2 py-brand-1 text-body font-semibold whitespace-nowrap transition-colors sm:px-brand-3 ${
                  isActive ? "text-brand-v5-paper" : "text-brand-v5-muted hover:bg-brand-v5-line/60"
                }`}
              >
                {isActive ? (
                  // layoutId shares this pill across renders, so switching
                  // the active tab slides the existing indicator to its
                  // new position/size instead of it popping in fresh.
                  <motion.span
                    layoutId="category-tab-indicator"
                    className="absolute inset-0 rounded-v5-pill bg-brand-v5-night"
                    transition={
                      prefersReducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.4 }
                    }
                  />
                ) : null}
                <Icon className="relative size-4" aria-hidden="true" />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col divide-y divide-brand-v5-line rounded-v5-card sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
          <SearchSegment
            label={t("whereLabel")}
            value={country}
            onChange={(value) => setCountry(value as CountryCode)}
            options={countryOptions}
            placeholder={t("wherePlaceholder")}
            ariaLabel={t("whereAriaLabel")}
          />
          <SearchSegment
            label={t("budgetLabel")}
            value={budgetRangeValue}
            onChange={setBudgetRangeValue}
            options={budgetRangeOptions}
            placeholder={t("budgetAny")}
            ariaLabel={t("budgetAriaLabel")}
          />
          <SearchSegment
            label={t("areaLabel")}
            value={sizeRangeValue}
            onChange={setSizeRangeValue}
            options={sizeRangeOptions}
            placeholder={t("areaPlaceholder")}
            ariaLabel={t("areaLabel")}
          />
          <div className="flex items-center justify-center p-brand-2">
            <button
              type="button"
              onClick={handleSearch}
              disabled={!country}
              className="focus-ring flex w-full items-center justify-center gap-brand-1 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground transition-opacity hover:bg-brand-v5-amber-strong disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Search className="size-4" aria-hidden="true" />
              {t("searchButton")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
