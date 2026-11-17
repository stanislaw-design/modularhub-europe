"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  OUTDOOR_KITCHEN_PRICE_RANGES,
  buildOutdoorKitchenHref,
  outdoorKitchenPriceKey,
  type OutdoorKitchenFilter,
  type OutdoorKitchenSortOption,
} from "@/lib/outdoor-kitchen-filters";
import type { OutdoorKitchenType } from "@/lib/product-technical-specs";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface OutdoorKitchenFilterFieldsProps {
  locale: string;
  filter: OutdoorKitchenFilter;
  typeOptions: SegmentOption[];
  priceOptions: SegmentOption[];
  sortOptions: SegmentOption[];
  labels: { type: string; price: string; sort: string };
}

// Pola filtra /outdoor-kitchen z tym samym przyciskiem "Szukaj" co SaunaFilterFields: wybór zmienia lokalny stan,
// adres (jedyne źródło stanu filtra) zmienia się dopiero po kliknięciu. Wartość "" to opcja "wszystkie".
export function OutdoorKitchenFilterFields({
  locale,
  filter,
  typeOptions,
  priceOptions,
  sortOptions,
  labels,
}: OutdoorKitchenFilterFieldsProps) {
  const t = useTranslations("ResultsFilterBar");
  const router = useRouter();
  const [type, setType] = useState<string>(filter.type ?? "");
  const [price, setPrice] = useState(() => {
    const active = OUTDOOR_KITCHEN_PRICE_RANGES.find(
      (range) => filter.priceMin === range.priceMin && filter.priceMax === range.priceMax,
    );
    return active ? outdoorKitchenPriceKey(active) : "";
  });
  const [sort, setSort] = useState<string>(filter.sort ?? "");

  function handleSearch() {
    const range = OUTDOOR_KITCHEN_PRICE_RANGES.find((candidate) => outdoorKitchenPriceKey(candidate) === price);
    router.push(
      buildOutdoorKitchenHref(locale, {
        type: (type || undefined) as OutdoorKitchenType | undefined,
        priceMin: range?.priceMin,
        priceMax: range?.priceMax,
        sort: (sort || undefined) as OutdoorKitchenSortOption | undefined,
      }),
      { scroll: false },
    );
  }

  return (
    <div className="flex w-full flex-col divide-y divide-brand-v5-line rounded-v5-card border border-brand-v5-line bg-brand-v5-surface shadow-sm sm:flex-row sm:divide-x sm:divide-y-0 lg:flex-col lg:divide-x-0 lg:divide-y">
      <SearchSegment
        label={labels.type}
        value={type}
        options={typeOptions}
        onChange={setType}
        placeholder={typeOptions[0]?.label ?? labels.type}
        ariaLabel={labels.type}
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
