"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Country, CountryCode } from "@/lib/data/types";
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

interface PlaceholderFieldProps {
  label: string;
  placeholder: string;
}

// Visually matches SearchSegment's stacked label/value look (same classes),
// but is a plain disabled button: no state, no options, no filter behind it
// (spec 0014 AC-3, carried into spec 0015 AC-3 — Typ domu / Budżet / Dostawa
// have no data model yet, same decorative-placeholder pattern as
// CategoryFilterBar's chips on /wyniki).
function PlaceholderField({ label, placeholder }: PlaceholderFieldProps) {
  return (
    <div className="flex-1">
      <button
        type="button"
        disabled
        className="flex w-full flex-col items-start gap-0.5 px-brand-3 py-brand-2 text-left disabled:cursor-default"
      >
        <span className="text-label font-semibold text-brand-foundation-navy">{label}</span>
        <span className="text-body text-brand-technical-graphite/60">{placeholder}</span>
      </button>
    </div>
  );
}

// The white toolbar-like card sitting inside Hero (spec 0015 AC-3 dropped the
// old "Znajdź idealny dom dla siebie" heading + subcopy so it reads as one
// tool, not a second section with its own intro). Gdzie and Powierzchnia are
// real SearchSegment instances (unmodified public API); Budżet remains a
// decorative placeholder. Navigation contract to /wyniki (country, sizeMin,
// sizeMax) is unchanged from spec 0003/0004.
export function SearchCard({ locale, countries }: SearchCardProps) {
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode | null>(null);
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
    if (window.location.hash === "#search-card") setIsExpanded(true);
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
        <span className="text-body-l text-brand-v5-muted">W czym mogę pomóc?</span>
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
            className={`flex flex-col divide-y divide-brand-v5-line rounded-v5-card p-brand-2 transition-opacity duration-300 ${
              isExpanded ? "opacity-100 delay-200" : "opacity-0"
            } sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0`}
          >
            <SearchSegment
              label="Gdzie?"
              value={country}
              onChange={(value) => setCountry(value as CountryCode)}
              options={countryOptions}
              placeholder="Kraj, region lub miasto"
              ariaLabel="Kraj docelowy"
            />
            <PlaceholderField label="Budżet" placeholder="Dowolny budżet" />
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
  );
}
