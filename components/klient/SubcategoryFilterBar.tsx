import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ContainerSubcategory, SpaSubcategory } from "@/lib/data/types";
import { getContainerSubcategoryOptions, getSpaSubcategoryOptions } from "@/lib/producer-project-draft";
import type { ResultsFilter } from "@/lib/results-filters";
import { buildResultsHref, toggleFilterValue } from "@/lib/results-filters";

interface SubcategoryFilterBarProps {
  locale: string;
  filter: ResultsFilter;
}

// Rząd chipów podkategorii dla spa modułowe/kontenery modułowe (spec 0026
// AC-8, rodzina zaktualizowana spec 0039), ten sam wzorzec toggle co
// CategoryFilterBar (krok 6): prawdziwe linki, klawiaturowo obsługiwane,
// ponowne kliknięcie tego samego chipa czyści filtr. Etykiety reużywają
// getSpaSubcategoryOptions/getContainerSubcategoryOptions (kreator
// producenta, lib/producer-project-draft.ts) zamiast duplikować tekst. Bez
// dedykowanych ikon per podkategoria — brak źródła projektowego dla tego
// szczegółu, zwykłe pigułki tekstowe w stylu marki.
export async function SubcategoryFilterBar({ locale, filter }: SubcategoryFilterBarProps) {
  if (filter.family !== "spa-modulowe" && filter.family !== "kontenery-modulowe") return null;

  const [tOptions, t] = await Promise.all([
    getTranslations("ProjectOptions"),
    getTranslations("SubcategoryFilterBar"),
  ]);
  const options: { value: SpaSubcategory | ContainerSubcategory; label: string }[] =
    filter.family === "spa-modulowe" ? getSpaSubcategoryOptions(tOptions) : getContainerSubcategoryOptions(tOptions);
  const key = filter.family === "spa-modulowe" ? "spaSubcategory" : "containerSubcategory";
  const ariaLabel = filter.family === "spa-modulowe" ? t("spaAriaLabel") : t("containerAriaLabel");

  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-brand-2 overflow-x-auto border-b border-brand-v5-line py-brand-2">
      {options.map(({ value, label }) => {
        const active = filter[key] === value;
        return (
          <Link
            key={value}
            href={buildResultsHref(locale, toggleFilterValue(filter, key, value))}
            aria-current={active ? "true" : undefined}
            className={`focus-ring shrink-0 whitespace-nowrap rounded-full border px-brand-2 py-1 text-body transition-colors ${
              active
                ? "border-brand-v5-amber-strong bg-brand-v5-amber/10 text-brand-v5-ink"
                : "border-brand-v5-line text-brand-v5-muted hover:text-brand-v5-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
