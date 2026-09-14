"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Country, CountryCode } from "@/lib/data/types";
import { SIZE_THRESHOLDS, type SizeThreshold } from "@/lib/size-thresholds";
import { buildVerifiedManufacturersHref, type VerifiedManufacturersFilter } from "@/lib/verified-manufacturers-filters";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface VerifiedManufacturersFilterBarProps {
  locale: string;
  countries: Country[];
  filter: VerifiedManufacturersFilter;
}

const sizeOptions: SegmentOption[] = SIZE_THRESHOLDS.map((threshold) => ({
  value: String(threshold),
  label: `${threshold} m²`,
}));

// Pionowy pasek, stały na lewej stronie ekranu (na życzenie zamawiającego):
// reużywa SearchSegment/SIZE_THRESHOLDS z ResultsFilterBar, ale bez
// sortowania i bez rodziny produktu. Pola układają się w kolumnę (zamiast
// segmentów obok siebie jak ResultsFilterBar), żeby zmieściły się w wąskiej
// bocznej kolumnie strony (VerifiedManufacturersPage ustawia ją jako
// `sticky`, więc pasek zostaje widoczny podczas przewijania listy kart).
// Ten sam wzorzec nawigacji: lokalny stan aż do kliknięcia "Szukaj" albo Enter.
export function VerifiedManufacturersFilterBar({ locale, countries, filter }: VerifiedManufacturersFilterBarProps) {
  const t = useTranslations("VerifiedManufacturersFilterBar");
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode | null>(filter.countryCode ?? null);
  const [min, setMin] = useState<number | null>(filter.sizeMin ?? null);
  const [max, setMax] = useState<number | null>(filter.sizeMax ?? null);
  const [q, setQ] = useState(filter.q ?? "");

  const countryOptions: SegmentOption[] = countries.map((c) => ({ value: c.code, label: c.name }));
  const sizeMaxOptions = sizeOptions.filter((option) => min === null || Number(option.value) >= min);

  function handleMinChange(value: string) {
    const next = Number(value);
    setMin(next);
    setMax((prev) => (prev !== null && prev < next ? null : prev));
  }

  function handleSearch() {
    const trimmedQ = q.trim();
    const next: VerifiedManufacturersFilter = {
      countryCode: country ?? undefined,
      sizeMin: min === null ? undefined : (min as SizeThreshold),
      sizeMax: max === null ? undefined : (max as SizeThreshold),
      q: trimmedQ.length > 0 ? trimmedQ : undefined,
    };
    router.push(buildVerifiedManufacturersHref(locale, next));
  }

  return (
    <div className="flex w-full flex-col divide-y divide-brand-v5-line rounded-v5-card border border-brand-v5-line bg-brand-v5-surface shadow-sm">
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
      <div className="flex flex-col gap-0.5 px-brand-3 py-brand-2">
        <label htmlFor="verified-manufacturers-search-q" className="text-label font-semibold text-brand-v5-ink">
          {t("keywordLabel")}
        </label>
        <input
          id="verified-manufacturers-search-q"
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
      <div className="p-brand-3">
        <button
          type="button"
          onClick={handleSearch}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
        >
          <Search className="size-4" aria-hidden="true" />
          {t("searchAriaLabel")}
        </button>
      </div>
    </div>
  );
}
