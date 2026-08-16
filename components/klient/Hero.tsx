"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Country, CountryCode } from "@/lib/data/types";
import { SIZE_THRESHOLDS } from "@/lib/size-thresholds";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface HeroProps {
  locale: string;
  countries: Country[];
}

const sizeOptions: SegmentOption[] = SIZE_THRESHOLDS.map((threshold) => ({
  value: String(threshold),
  label: `${threshold} m²`,
}));

export function Hero({ locale, countries }: HeroProps) {
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [sizeMin, setSizeMin] = useState<number | null>(null);
  const [sizeMax, setSizeMax] = useState<number | null>(null);

  const countryOptions: SegmentOption[] = countries.map((c) => ({ value: c.code, label: c.name }));
  const sizeMaxOptions = sizeOptions.filter(
    (option) => sizeMin === null || Number(option.value) >= sizeMin
  );

  function handleSizeMinChange(value: string) {
    const next = Number(value);
    setSizeMin(next);
    setSizeMax((prev) => (prev !== null && prev < next ? null : prev));
  }

  function handleSearch() {
    if (!country) return;
    const params = new URLSearchParams({ country });
    if (sizeMin !== null) params.set("sizeMin", String(sizeMin));
    if (sizeMax !== null) params.set("sizeMax", String(sizeMax));
    router.push(`/${locale}/klient/wyniki?${params.toString()}`);
  }

  return (
    <div className="flex flex-col items-center gap-brand-3 py-brand-3">
      <h1 className="sr-only">
        ModularHub Europe — wyszukiwarka domów modułowych dopuszczonych w Twoim kraju
      </h1>
      <div className="flex w-full max-w-3xl flex-col divide-y divide-brand-steel rounded-[2.5rem] border border-brand-steel bg-brand-warm-white shadow-lg sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
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
          value={sizeMin === null ? null : String(sizeMin)}
          onChange={handleSizeMinChange}
          options={sizeOptions}
          placeholder="Dowolny"
          ariaLabel="Metraż od"
        />
        <SearchSegment
          label="Metraż do"
          value={sizeMax === null ? null : String(sizeMax)}
          onChange={(value) => setSizeMax(Number(value))}
          options={sizeMaxOptions}
          placeholder="Dowolny"
          ariaLabel="Metraż do"
        />
        <div className="flex items-center justify-center p-brand-2">
          <button
            type="button"
            onClick={handleSearch}
            disabled={!country}
            aria-label="Szukaj"
            className="focus-ring flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-passage-blue text-brand-warm-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
