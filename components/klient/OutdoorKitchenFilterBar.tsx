import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import {
  OUTDOOR_KITCHEN_PRICE_RANGES,
  buildOutdoorKitchenHref,
  hasActiveOutdoorKitchenFilter,
  outdoorKitchenPriceKey,
  type OutdoorKitchenFilter,
  type OutdoorKitchenPriceRange,
} from "@/lib/outdoor-kitchen-filters";
import { OUTDOOR_KITCHEN_TYPES } from "@/lib/product-technical-specs";
import { OutdoorKitchenFilterFields } from "./OutdoorKitchenFilterFields";
import type { SegmentOption } from "./SearchSegment";

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

interface OutdoorKitchenFilterBarProps {
  locale: string;
  filter: OutdoorKitchenFilter;
  familyTabs?: ReactNode;
}

// Lewy panel /outdoor-kitchen (ten sam układ co SaunaFilterBar): przełącznik rodziny, typ kuchni, cena i sortowanie.
// Etykiety typu kluczowane po wartości enum (Key invariants spec 0086).
export async function OutdoorKitchenFilterBar({ locale, filter, familyTabs }: OutdoorKitchenFilterBarProps) {
  const t = await getTranslations({ locale, namespace: "OutdoorKitchenCategoryPage" });

  function priceRangeLabel(range: OutdoorKitchenPriceRange): string {
    if (range.priceMin !== undefined && range.priceMax !== undefined) {
      return t("priceRange", {
        min: priceFormatter.format(range.priceMin),
        max: priceFormatter.format(range.priceMax),
      });
    }
    if (range.priceMax !== undefined) return t("priceUpTo", { max: priceFormatter.format(range.priceMax) });
    return t("priceFrom", { min: priceFormatter.format(range.priceMin ?? 0) });
  }

  const allOption = (label = t("allOption")): SegmentOption => ({ value: "", label });
  const typeOptions: SegmentOption[] = [
    allOption(),
    ...OUTDOOR_KITCHEN_TYPES.map((type) => ({ value: type, label: t(`typeOption.${type}`) })),
  ];
  const priceOptions: SegmentOption[] = [
    allOption(),
    ...OUTDOOR_KITCHEN_PRICE_RANGES.map((range) => ({
      value: outdoorKitchenPriceKey(range),
      label: priceRangeLabel(range),
    })),
  ];
  const sortOptions: SegmentOption[] = [
    allOption(t("sortDefault")),
    { value: "price-asc", label: t("sortPriceAsc") },
    { value: "price-desc", label: t("sortPriceDesc") },
  ];

  return (
    <nav
      aria-label={t("filtersAriaLabel")}
      className="flex flex-col gap-brand-3 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1"
    >
      {familyTabs}
      <OutdoorKitchenFilterFields
        locale={locale}
        filter={filter}
        typeOptions={typeOptions}
        priceOptions={priceOptions}
        sortOptions={sortOptions}
        labels={{ type: t("typeLabel"), price: t("priceLabel"), sort: t("sortLabel") }}
      />
      {hasActiveOutdoorKitchenFilter(filter) && (
        <Link
          href={buildOutdoorKitchenHref(locale)}
          className="focus-ring w-fit rounded-data text-body font-medium text-brand-v5-muted underline underline-offset-2"
        >
          {t("clearFilters")}
        </Link>
      )}
    </nav>
  );
}
