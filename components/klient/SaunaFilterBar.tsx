import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SaunaProducerOption } from "@/lib/data/projects";
import {
  SAUNA_PRICE_RANGES,
  SAUNA_SEATING_THRESHOLDS,
  buildSaunaHref,
  hasActiveSaunaFilter,
  saunaPriceKey,
  type SaunaFilter,
  type SaunaPriceRange,
} from "@/lib/sauna-filters";
import { SaunaFilterFields } from "./SaunaFilterFields";
import type { SegmentOption } from "./SearchSegment";

interface SaunaFilterBarProps {
  locale: string;
  filter: SaunaFilter;
  producers: SaunaProducerOption[];
  /** Przełącznik Domy / Więcej niż dom (FamilyTabs, składa go strona), nad polami filtra. */
  familyTabs?: ReactNode;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 0,
});

// Filtry strony /sauna (spec 0068 AC-7 do AC-10): lewy, przyklejony panel jak
// w ResultsFilterBar (od `lg`, niżej blok nad wynikami), listy rozwijane i przycisk
// "Szukaj" jak tam, a stan nadal tylko w URL. Serwer składa opcje, a
// SaunaFilterFields po kliknięciu "Szukaj" nawiguje pod adres z buildSaunaHref
// (jedno miejsce serializacji). Opcja „wszystkie" czyści tylko swój wymiar.
export async function SaunaFilterBar({ locale, filter, producers, familyTabs }: SaunaFilterBarProps) {
  const t = await getTranslations({ locale, namespace: "SaunaCategoryPage" });

  function priceRangeLabel(range: SaunaPriceRange): string {
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

  const seatingOptions: SegmentOption[] = [
    allOption(),
    ...SAUNA_SEATING_THRESHOLDS.map((threshold) => ({
      value: String(threshold),
      label: t("seatingOption", { count: threshold }),
    })),
  ];
  const priceOptions: SegmentOption[] = [
    allOption(),
    ...SAUNA_PRICE_RANGES.map((range) => ({ value: saunaPriceKey(range), label: priceRangeLabel(range) })),
  ];
  const producerOptions: SegmentOption[] = [
    allOption(),
    ...producers.map((option) => ({ value: option.id, label: option.name })),
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
      <SaunaFilterFields
        locale={locale}
        filter={filter}
        seatingOptions={seatingOptions}
        priceOptions={priceOptions}
        producerOptions={producerOptions}
        sortOptions={sortOptions}
        labels={{
          seating: t("seatingLabel"),
          price: t("priceLabel"),
          producer: t("producerLabel"),
          sort: t("sortLabel"),
        }}
      />
      {hasActiveSaunaFilter(filter) && (
        <Link
          href={buildSaunaHref(locale)}
          className="focus-ring w-fit rounded-data text-body font-medium text-brand-v5-muted underline underline-offset-2"
        >
          {t("clearFilters")}
        </Link>
      )}
    </nav>
  );
}
