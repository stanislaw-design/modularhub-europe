import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { SaunaProducerOption } from "@/lib/data/projects";
import {
  SAUNA_PRICE_RANGES,
  SAUNA_SEATING_THRESHOLDS,
  buildSaunaHref,
  hasActiveSaunaFilter,
  type SaunaFilter,
  type SaunaPriceRange,
} from "@/lib/sauna-filters";

interface SaunaFilterBarProps {
  locale: string;
  filter: SaunaFilter;
  producers: SaunaProducerOption[];
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function chipClass(active: boolean): string {
  return `focus-ring shrink-0 whitespace-nowrap rounded-full border px-brand-2 py-1 text-body transition-colors ${
    active
      ? "border-brand-v5-amber-strong bg-brand-v5-amber/10 text-brand-v5-ink"
      : "border-brand-v5-line text-brand-v5-muted hover:text-brand-v5-ink"
  }`;
}

// Chipy filtrów strony /sauna (spec 0068 AC-7 do AC-10): prawdziwe linki
// <Link> jak SubcategoryFilterBar, bez stanu klienta, ponowne kliknięcie
// aktywnego chipa czyści ten wymiar, a reszta filtra zostaje. Każdy href
// buduje buildSaunaHref, jedno miejsce serializacji. Aktywny chip niesie
// aria-current, nie tylko kolor.
export async function SaunaFilterBar({ locale, filter, producers }: SaunaFilterBarProps) {
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

  const groups = [
    <FilterGroup key="seating" label={t("seatingLabel")}>
      {SAUNA_SEATING_THRESHOLDS.map((threshold) => {
        const active = filter.seatingMin === threshold;
        return (
          <Link
            key={threshold}
            href={buildSaunaHref(locale, { ...filter, seatingMin: active ? undefined : threshold })}
            aria-current={active ? "true" : undefined}
            className={chipClass(active)}
          >
            {t("seatingOption", { count: threshold })}
          </Link>
        );
      })}
    </FilterGroup>,
    <FilterGroup key="price" label={t("priceLabel")}>
      {SAUNA_PRICE_RANGES.map((range) => {
        const active = filter.priceMin === range.priceMin && filter.priceMax === range.priceMax;
        return (
          <Link
            key={`${range.priceMin ?? "x"}-${range.priceMax ?? "x"}`}
            href={buildSaunaHref(locale, {
              ...filter,
              priceMin: active ? undefined : range.priceMin,
              priceMax: active ? undefined : range.priceMax,
            })}
            aria-current={active ? "true" : undefined}
            className={chipClass(active)}
          >
            {priceRangeLabel(range)}
          </Link>
        );
      })}
    </FilterGroup>,
  ];

  if (producers.length > 0) {
    groups.push(
      <FilterGroup key="producer" label={t("producerLabel")}>
        {producers.map((option) => {
          const active = filter.producer === option.id;
          return (
            <Link
              key={option.id}
              href={buildSaunaHref(locale, { ...filter, producer: active ? undefined : option.id })}
              aria-current={active ? "true" : undefined}
              className={chipClass(active)}
            >
              {option.name}
            </Link>
          );
        })}
      </FilterGroup>,
    );
  }

  groups.push(
    <FilterGroup key="sort" label={t("sortLabel")}>
      {(["price-asc", "price-desc"] as const).map((sort) => {
        const active = filter.sort === sort;
        return (
          <Link
            key={sort}
            href={buildSaunaHref(locale, { ...filter, sort: active ? undefined : sort })}
            aria-current={active ? "true" : undefined}
            className={chipClass(active)}
          >
            {sort === "price-asc" ? t("sortPriceAsc") : t("sortPriceDesc")}
          </Link>
        );
      })}
    </FilterGroup>,
  );

  return (
    <nav aria-label={t("filtersAriaLabel")} className="flex flex-col gap-brand-2 border-b border-brand-v5-line pb-brand-3">
      {groups}
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

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-brand-2">
      <span className="text-data font-medium text-brand-v5-muted">{label}</span>
      <div className="flex items-center gap-brand-2 overflow-x-auto">{children}</div>
    </div>
  );
}
