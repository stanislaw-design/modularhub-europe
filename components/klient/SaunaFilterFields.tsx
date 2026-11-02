"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SAUNA_PRICE_RANGES,
  SAUNA_SEATING_THRESHOLDS,
  buildSaunaHref,
  saunaPriceKey,
  type SaunaFilter,
  type SaunaSortOption,
} from "@/lib/sauna-filters";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface SaunaFilterFieldsProps {
  locale: string;
  filter: SaunaFilter;
  seatingOptions: SegmentOption[];
  priceOptions: SegmentOption[];
  producerOptions: SegmentOption[];
  sortOptions: SegmentOption[];
  labels: { seating: string; price: string; producer: string; sort: string };
}

// Pola filtra /sauna z tym samym przyciskiem "Szukaj" co ResultsFilterBar:
// wybór w liście zmienia tylko lokalny stan, a adres (jedyne źródło stanu
// filtra, spec 0068) zmienia się dopiero po kliknięciu "Szukaj". Wartość ""
// to opcja "wszystkie", czyści swój wymiar.
export function SaunaFilterFields({
  locale,
  filter,
  seatingOptions,
  priceOptions,
  producerOptions,
  sortOptions,
  labels,
}: SaunaFilterFieldsProps) {
  const t = useTranslations("ResultsFilterBar");
  const router = useRouter();
  const [seating, setSeating] = useState(filter.seatingMin === undefined ? "" : String(filter.seatingMin));
  const [price, setPrice] = useState(() => {
    const active = SAUNA_PRICE_RANGES.find(
      (range) => filter.priceMin === range.priceMin && filter.priceMax === range.priceMax,
    );
    return active ? saunaPriceKey(active) : "";
  });
  const [producer, setProducer] = useState(filter.producer ?? "");
  const [sort, setSort] = useState<string>(filter.sort ?? "");

  function handleSearch() {
    const range = SAUNA_PRICE_RANGES.find((candidate) => saunaPriceKey(candidate) === price);
    const seatingMin = SAUNA_SEATING_THRESHOLDS.find((threshold) => String(threshold) === seating);
    router.push(
      buildSaunaHref(locale, {
        seatingMin,
        priceMin: range?.priceMin,
        priceMax: range?.priceMax,
        producer: producer || undefined,
        sort: (sort || undefined) as SaunaSortOption | undefined,
      }),
      { scroll: false },
    );
  }

  return (
    <div className="flex w-full flex-col divide-y divide-brand-v5-line rounded-v5-card border border-brand-v5-line bg-brand-v5-surface shadow-sm sm:flex-row sm:divide-x sm:divide-y-0 lg:flex-col lg:divide-x-0 lg:divide-y">
      <SearchSegment
        label={labels.seating}
        value={seating}
        options={seatingOptions}
        onChange={setSeating}
        placeholder={seatingOptions[0]?.label ?? labels.seating}
        ariaLabel={labels.seating}
        surface="v5"
      />
      <SearchSegment
        label={labels.price}
        value={price}
        options={priceOptions}
        onChange={setPrice}
        placeholder={priceOptions[0]?.label ?? labels.price}
        ariaLabel={labels.price}
        surface="v5"
      />
      {producerOptions.length > 1 && (
        <SearchSegment
          label={labels.producer}
          value={producer}
          options={producerOptions}
          onChange={setProducer}
          placeholder={producerOptions[0]?.label ?? labels.producer}
          ariaLabel={labels.producer}
          surface="v5"
        />
      )}
      <SearchSegment
        label={labels.sort}
        value={sort}
        options={sortOptions}
        onChange={setSort}
        placeholder={sortOptions[0]?.label ?? labels.sort}
        ariaLabel={labels.sort}
        surface="v5"
      />
      <div className="flex items-center justify-center p-brand-2 lg:p-brand-3">
        <button
          type="button"
          onClick={handleSearch}
          aria-label={t("searchAriaLabel")}
          className="focus-ring flex size-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong lg:h-12 lg:w-full lg:rounded-v5-pill lg:text-body lg:font-semibold"
        >
          <Search className="size-5" aria-hidden="true" />
          <span className="hidden lg:inline" aria-hidden="true">
            {t("searchAriaLabel")}
          </span>
        </button>
      </div>
    </div>
  );
}
