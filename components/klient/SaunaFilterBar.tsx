import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SaunaProducerOption } from "@/lib/data/projects";
import {
  SAUNA_PRICE_RANGES,
  SAUNA_SEATING_THRESHOLDS,
  buildSaunaHref,
  hasActiveSaunaFilter,
  type SaunaFilter,
  type SaunaPriceRange,
} from "@/lib/sauna-filters";
import { SaunaFilterSelect, type SaunaFilterSelectOption } from "./SaunaFilterSelect";

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
// w ResultsFilterBar (od `lg`, niżej blok nad wynikami), listy rozwijane, ale stan
// nadal tylko w URL. Serwer liczy href każdej opcji przez buildSaunaHref (jedno
// miejsce serializacji), a SaunaFilterSelect po wyborze nawiguje pod ten href.
// Opcja „wszystkie" czyści tylko swój wymiar, reszta filtra zostaje.
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

  const allOption = (cleared: SaunaFilter, label = t("allOption")): SaunaFilterSelectOption => ({
    value: "",
    label,
    href: buildSaunaHref(locale, cleared),
  });

  const seatingOptions: SaunaFilterSelectOption[] = [
    allOption({ ...filter, seatingMin: undefined }),
    ...SAUNA_SEATING_THRESHOLDS.map((threshold) => ({
      value: String(threshold),
      label: t("seatingOption", { count: threshold }),
      href: buildSaunaHref(locale, { ...filter, seatingMin: threshold }),
    })),
  ];

  const priceKey = (range: Pick<SaunaPriceRange, "priceMin" | "priceMax">) =>
    `${range.priceMin ?? "x"}-${range.priceMax ?? "x"}`;
  const priceOptions: SaunaFilterSelectOption[] = [
    allOption({ ...filter, priceMin: undefined, priceMax: undefined }),
    ...SAUNA_PRICE_RANGES.map((range) => ({
      value: priceKey(range),
      label: priceRangeLabel(range),
      href: buildSaunaHref(locale, {
        ...filter,
        priceMin: range.priceMin,
        priceMax: range.priceMax,
      }),
    })),
  ];
  const activePrice = SAUNA_PRICE_RANGES.find(
    (range) => filter.priceMin === range.priceMin && filter.priceMax === range.priceMax,
  );

  const producerOptions: SaunaFilterSelectOption[] = [
    allOption({ ...filter, producer: undefined }),
    ...producers.map((option) => ({
      value: option.id,
      label: option.name,
      href: buildSaunaHref(locale, { ...filter, producer: option.id }),
    })),
  ];

  const sortOptions: SaunaFilterSelectOption[] = [
    allOption({ ...filter, sort: undefined }, t("sortDefault")),
    ...(["price-asc", "price-desc"] as const).map((sort) => ({
      value: sort,
      label: sort === "price-asc" ? t("sortPriceAsc") : t("sortPriceDesc"),
      href: buildSaunaHref(locale, { ...filter, sort }),
    })),
  ];

  return (
    <nav
      aria-label={t("filtersAriaLabel")}
      className="flex flex-col gap-brand-3 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1"
    >
      {familyTabs}
      <div className="flex w-full flex-col divide-y divide-brand-v5-line rounded-v5-card border border-brand-v5-line bg-brand-v5-surface shadow-sm sm:flex-row sm:divide-x sm:divide-y-0 lg:flex-col lg:divide-x-0 lg:divide-y">
        <SaunaFilterSelect
          label={t("seatingLabel")}
          value={filter.seatingMin === undefined ? "" : String(filter.seatingMin)}
          options={seatingOptions}
        />
        <SaunaFilterSelect
          label={t("priceLabel")}
          value={activePrice ? priceKey(activePrice) : ""}
          options={priceOptions}
        />
        {producers.length > 0 && (
          <SaunaFilterSelect label={t("producerLabel")} value={filter.producer ?? ""} options={producerOptions} />
        )}
        <SaunaFilterSelect label={t("sortLabel")} value={filter.sort ?? ""} options={sortOptions} />
      </div>
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
