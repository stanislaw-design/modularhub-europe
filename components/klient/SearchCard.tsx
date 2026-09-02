"use client";

import { Droplets, Home, LayoutGrid, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WordRotate } from "@/components/ui";
import type { Country, CountryCode } from "@/lib/data/types";
import type { ProductFamily } from "@/lib/product-technical-specs";
import { SIZE_RANGE_OPTIONS } from "@/lib/size-thresholds";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

// Same three families/order as categoryTabs below and CategoryShowcase.
const teaserWords = ["Dom?", "Pergole?", "SPA?"];

interface SearchCardProps {
  locale: string;
  countries: Country[];
}

const sizeRangeOptions: SegmentOption[] = SIZE_RANGE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

// Mock ranges only — no budget field on Project yet, so unlike country/size
// this selection never reaches handleSearch's params (spec 0014/0015 AC-3
// deferred the underlying data model). Interactive so the toolbar reads as
// one consistent control, same visual/keyboard behavior as Gdzie/Powierzchnia.
const budgetRangeOptions: SegmentOption[] = [
  { value: "any", label: "Dowolny budżet" },
  { value: "upTo50k", label: "do 50K €" },
  { value: "50to100k", label: "50K–100K €" },
  { value: "100to200k", label: "100K–200K €" },
  { value: "over200k", label: "powyżej 200K €" },
];

// Same three families as CategoryShowcase's FAMILY_DISPLAY. Selection is
// visual only for now (mirrors CategoryFilterBar's decorative-placeholder
// pattern below) — /wyniki has no family filter yet (spec 0022 defers real
// filtering to a later feature).
const categoryTabs: { family: ProductFamily; icon: typeof Home; label: string }[] = [
  { family: "dom", icon: Home, label: "Domy" },
  { family: "pergola", icon: LayoutGrid, label: "Pergole" },
  { family: "spa-modulowe", icon: Droplets, label: "SPA" },
];

// The white toolbar-like card sitting inside Hero (spec 0015 AC-3 dropped the
// old "Znajdź idealny dom dla siebie" heading + subcopy so it reads as one
// tool, not a second section with its own intro). Gdzie, Budżet and
// Powierzchnia are all real SearchSegment instances; Budżet's selection is
// visual only (see budgetRangeOptions above). Navigation contract to /wyniki
// (country, sizeMin, sizeMax) is unchanged from spec 0003/0004.
export function SearchCard({ locale, countries }: SearchCardProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<ProductFamily>("dom");
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [budgetRangeValue, setBudgetRangeValue] = useState<string | null>(null);
  const [sizeRangeValue, setSizeRangeValue] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  // Stays false until the expand transition finishes, so the two
  // overflow-hidden wrappers below (needed to clip the collapse/reveal
  // animation) don't also clip the SearchSegment dropdown popovers once the
  // form is actually usable.
  const [hasOpened, setHasOpened] = useState(false);

  // ClosingCta links to "#search-card" (spec 0014 AC) expecting the real
  // form, not the collapsed teaser — land already expanded when arriving via
  // that anchor.
  useEffect(() => {
    if (window.location.hash !== "#search-card") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z window.location po hydracji, hash nie jest dostępny podczas SSR
    setIsExpanded(true);
  }, []);

  const countryOptions: SegmentOption[] = countries.map((c) => ({ value: c.code, label: c.name }));

  function handleSearch() {
    if (!country) return;
    const params = new URLSearchParams({ country });
    const range = SIZE_RANGE_OPTIONS.find((option) => option.value === sizeRangeValue);
    if (range?.sizeMin !== undefined) params.set("sizeMin", String(range.sizeMin));
    if (range?.sizeMax !== undefined) params.set("sizeMax", String(range.sizeMax));
    router.push(`/${locale}/klient/wyniki?${params.toString()}`);
  }

  return (
    <div
      id="search-card"
      className={`relative z-10 border-2 border-brand-v5-amber bg-brand-v5-surface shadow-xl scroll-mt-brand-6 transition-[border-radius] duration-500 ease-out ${
        isExpanded ? "rounded-v5-panel" : "rounded-v5-pill"
      } ${hasOpened ? "" : "overflow-hidden"}`}
    >
      {/* Collapsed teaser: a single Google-style search field. Taken out of
          flow (not just hidden) once expanded so it can't affect height. */}
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        onFocus={() => setIsExpanded(true)}
        tabIndex={isExpanded ? -1 : 0}
        aria-hidden={isExpanded}
        className={`focus-ring flex w-full items-center gap-brand-2 px-brand-4 py-brand-3 text-left transition-[opacity,transform] duration-300 ease-out ${
          isExpanded
            ? "pointer-events-none absolute inset-0 scale-95 opacity-0"
            : "scale-100 opacity-100"
        }`}
      >
        <Search className="size-5 shrink-0 text-brand-v5-muted" aria-hidden="true" />
        <span className="text-body-l text-brand-v5-muted">
          W czym mogę pomóc?{" "}
          <WordRotate
            words={teaserWords}
            duration={3000}
            className="text-brand-v5-muted"
            wrapperClassName="pb-[0.25em] -mb-[0.25em]"
            motionProps={{
              initial: { opacity: 0, y: "-0.4em" },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: "0.4em" },
              transition: { duration: 0.25, ease: "easeOut" },
            }}
          />
        </span>
      </button>

      {/* Real form: height-animated via the grid-template-rows trick (no JS
          measuring needed), content cross-fading in slightly after so it
          doesn't flash open before the container has grown. */}
      <div
        inert={!isExpanded}
        onTransitionEnd={(event) => {
          if (event.propertyName === "grid-template-rows" && isExpanded) setHasOpened(true);
        }}
        className={`grid transition-[grid-template-rows] duration-500 ease-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className={hasOpened ? "" : "overflow-hidden"}>
          <div
            className={`flex flex-col gap-brand-2 p-brand-2 transition-opacity duration-300 ${
              isExpanded ? "opacity-100 delay-200" : "opacity-0"
            }`}
          >
            <div role="tablist" aria-label="Kategoria produktu" className="flex items-center gap-brand-2 px-brand-1">
              {categoryTabs.map(({ family, icon: Icon, label }) => {
                const isActive = activeCategory === family;
                return (
                  <button
                    key={family}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(family)}
                    className={`focus-ring relative flex items-center gap-1.5 rounded-v5-pill px-brand-3 py-brand-1 text-body font-semibold transition-colors ${
                      isActive ? "text-brand-v5-paper" : "text-brand-v5-muted hover:bg-brand-v5-line/60"
                    }`}
                  >
                    {isActive ? (
                      // layoutId shares this pill across renders, so switching
                      // the active tab slides the existing indicator to its
                      // new position/size instead of it popping in fresh.
                      <motion.span
                        layoutId="category-tab-indicator"
                        className="absolute inset-0 rounded-v5-pill bg-brand-v5-ink"
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
                label="Gdzie?"
                value={country}
                onChange={(value) => setCountry(value as CountryCode)}
                options={countryOptions}
                placeholder="Kraj, region lub miasto"
                ariaLabel="Kraj docelowy"
              />
              <SearchSegment
                label="Budżet"
                value={budgetRangeValue}
                onChange={setBudgetRangeValue}
                options={budgetRangeOptions}
                placeholder="Dowolny budżet"
                ariaLabel="Budżet"
              />
              <SearchSegment
                label="Powierzchnia"
                value={sizeRangeValue}
                onChange={setSizeRangeValue}
                options={sizeRangeOptions}
                placeholder="Dowolna"
                ariaLabel="Powierzchnia"
              />
              <div className="flex items-center justify-center p-brand-2">
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={!country}
                  className="focus-ring flex w-full items-center justify-center gap-brand-1 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground transition-opacity hover:bg-brand-v5-amber-strong disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <Search className="size-4" aria-hidden="true" />
                  Szukaj domów
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
