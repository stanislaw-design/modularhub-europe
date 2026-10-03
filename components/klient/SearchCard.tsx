"use client";

import { ChevronRight, Home, Layers, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Country, CountryCode, ProductFamily } from "@/lib/data/types";
import { FAMILY_GROUPS, resolveFamilyGroup, type FamilyFilterValue } from "@/lib/product-family-groups";
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

  // Spec 0060: "Więcej niż dom" swaps the Gdzie/Budżet/Powierzchnia + Szukaj
  // row for one row of subcategory links straight to /wyniki, so the list
  // itself stays wired to FAMILY_GROUPS (AC-4) — only each link's label text
  // needs its own translation key, since a family id isn't human readable.
  const activeGroup = resolveFamilyGroup(activeCategory);
  const categoryLinkLabels: Partial<Record<ProductFamily, string>> = {
    "spa-modulowe": t("categoryLinkSpa"),
    "kontenery-modulowe": t("categoryLinkContainers"),
    "outdoor-tv": t("categoryLinkOutdoorTv"),
  };

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
        {/* Same height: 0 <-> "auto" + overflow-hidden recipe SearchSegment's
            dropdown already uses, not the `layout` prop: `layout` animates via
            a transform scale trick that only self-corrects for nested *motion*
            children, so plain children (SearchSegment, Link) visibly warped
            instead of the card calmly resizing — this animates the real
            `height` CSS property instead, which reflows normally. mode="wait"
            (collapse old, then expand new) over "popLayout" (both at once):
            with two very differently-shaped branches, overlapping them
            mid-crossfade looked worse than the brief, eased collapse/expand. */}
        <AnimatePresence mode="wait" initial={false}>
          {activeGroup === "wiecej-niz-dom" ? (
            // AC-1/AC-2: a one-click shortcut straight to filtered /wyniki, no
            // Szukaj step and no country requirement — Gdzie/Budżet/Powierzchnia
            // don't apply to a single lifestyle category pick.
            <motion.div
              key="wiecej-niz-dom"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <nav
                aria-label={t("categoryLinksAriaLabel")}
                className="flex items-center gap-brand-2 overflow-x-auto px-brand-1 py-brand-1 [scrollbar-width:none] sm:gap-brand-3 [&::-webkit-scrollbar]:hidden"
              >
                {FAMILY_GROUPS["wiecej-niz-dom"].map((family) => (
                  <Link
                    key={family}
                    href={`/${locale}/results?family=${family}`}
                    // Amber-tinted chip (same border/bg/text combo SubcategoryFilterBar
                    // already uses for an active chip), not a solid black fill: sitting
                    // right under the solid-black active category tab, an equally solid
                    // black pill row read as one undifferentiated stack with no
                    // hierarchy between "which group" (the tab) and "which category"
                    // (these links). Amber ties it to the Szukaj button's accent instead,
                    // signalling "this is the action for this tab."
                    className="group focus-ring flex shrink-0 items-center gap-1.5 rounded-v5-pill border border-brand-v5-amber-strong/30 bg-brand-v5-amber/10 px-brand-3 py-brand-2 text-body font-semibold whitespace-nowrap text-brand-v5-ink transition-colors hover:border-brand-v5-amber-strong hover:bg-brand-v5-amber/20"
                  >
                    {categoryLinkLabels[family] ?? family}
                    <ChevronRight
                      className="size-4 shrink-0 text-brand-v5-amber-strong transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </nav>
            </motion.div>
          ) : (
            <motion.div
              key="dom"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
