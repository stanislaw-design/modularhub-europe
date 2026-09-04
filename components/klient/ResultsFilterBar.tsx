"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Country, CountryCode, ProductFamily } from "@/lib/data/types";
import { SIZE_THRESHOLDS, type SizeThreshold } from "@/lib/size-thresholds";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface ResultsFilterBarProps {
  locale: string;
  countries: Country[];
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
  family: ProductFamily;
}

const sizeOptions: SegmentOption[] = SIZE_THRESHOLDS.map((threshold) => ({
  value: String(threshold),
  label: `${threshold} m²`,
}));

export function ResultsFilterBar({
  locale,
  countries,
  countryCode,
  sizeMin,
  sizeMax,
  family,
}: ResultsFilterBarProps) {
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode | null>(countryCode ?? null);
  const [min, setMin] = useState<number | null>(sizeMin ?? null);
  const [max, setMax] = useState<number | null>(sizeMax ?? null);

  const countryOptions: SegmentOption[] = countries.map((c) => ({ value: c.code, label: c.name }));
  const sizeMaxOptions = sizeOptions.filter((option) => min === null || Number(option.value) >= min);

  function handleMinChange(value: string) {
    const next = Number(value);
    setMin(next);
    setMax((prev) => (prev !== null && prev < next ? null : prev));
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (family !== "dom") params.set("family", family);
    if (country) params.set("country", country);
    if (min !== null) params.set("sizeMin", String(min));
    if (max !== null) params.set("sizeMax", String(max));
    const query = params.toString();
    router.push(`/${locale}/klient/wyniki${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex w-full flex-col divide-y divide-brand-steel rounded-[2.5rem] border border-brand-steel bg-brand-warm-white shadow-sm sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
      <SearchSegment
        label="Kraj"
        value={country}
        onChange={(value) => setCountry(value as CountryCode)}
        options={countryOptions}
        placeholder="Wybierz kraj"
        ariaLabel="Kraj docelowy"
      />
      <SearchSegment
        label="Metraż od"
        value={min === null ? null : String(min)}
        onChange={handleMinChange}
        options={sizeOptions}
        placeholder="Dowolny"
        ariaLabel="Metraż od"
      />
      <SearchSegment
        label="Metraż do"
        value={max === null ? null : String(max)}
        onChange={(value) => setMax(Number(value))}
        options={sizeMaxOptions}
        placeholder="Dowolny"
        ariaLabel="Metraż do"
      />
      <div className="flex items-center justify-center p-brand-2">
        <button
          type="button"
          onClick={handleSearch}
          aria-label="Szukaj"
          className="focus-ring flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-passage-blue text-brand-action-foreground transition-colors hover:bg-brand-electric-plane"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
