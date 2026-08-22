"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
// (spec 0014 AC-3 — Typ domu / Budżet / Dostawa have no data model yet, same
// decorative-placeholder pattern as CategoryFilterBar's chips on /wyniki).
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

// The white card that overlaps Hero's bottom edge. Gdzie and Powierzchnia
// are real SearchSegment instances (unmodified public API); Budżet remains
// a decorative placeholder. Navigation contract to /wyniki
// (country, sizeMin, sizeMax) is unchanged from spec 0003/0004.
export function SearchCard({ locale, countries }: SearchCardProps) {
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [sizeRangeValue, setSizeRangeValue] = useState<string | null>(null);

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
      className="relative z-10 flex flex-col gap-brand-3 rounded-v4-panel border-2 border-brand-v4-amber bg-brand-v4-surface p-brand-3 shadow-xl scroll-mt-brand-4 lg:-mt-brand-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-brand-1">
        <h2 className="text-h3 font-display font-semibold text-brand-foundation-navy">
          Znajdź idealny dom dla siebie
        </h2>
        <p className="text-body text-brand-technical-graphite">
          Ponad 1 000 projektów od 250+ producentów
        </p>
      </div>
      <div className="flex flex-col divide-y divide-brand-steel rounded-card border border-brand-steel sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
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
            className="focus-ring flex w-full items-center justify-center gap-brand-1 rounded-v4-pill bg-brand-v4-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v4-amber-foreground transition-opacity hover:bg-brand-v4-amber-strong disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            <Search className="size-4" aria-hidden="true" />
            Szukaj domów
          </button>
        </div>
      </div>
    </div>
  );
}
