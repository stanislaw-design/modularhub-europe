import { getTranslations } from "next-intl/server";
import { getContainerSubcategoryOptions } from "@/lib/producer-project-draft";
import type { ResultsFilter } from "@/lib/results-filters";
import { buildResultsHref } from "@/lib/results-filters";
import { FamilyRefineSelect } from "./FamilyRefineSelect";

interface SubcategoryFilterBarProps {
  locale: string;
  filter: ResultsFilter;
}

// Filtr podkategorii dla kontenerów modułowych (spec 0026
// AC-8, rodzina zaktualizowana spec 0039), ten sam wzorzec toggle co
// CategoryFilterBar (krok 6), ale jako lista rozwijana (jak drugi poziom
// FamilyTabs), bo rząd pigułek zawijał się i rozjeżdżał wąski lewy panel;
// opcja "Wszystkie" czyści filtr. Etykiety reużywają
// getContainerSubcategoryOptions (kreator
// producenta, lib/producer-project-draft.ts) zamiast duplikować tekst.
export async function SubcategoryFilterBar({ locale, filter }: SubcategoryFilterBarProps) {
  // Podkategorie spa (sauna/jacuzzi/kabina) wrócą, gdy w katalogu będzie coś poza
  // saunami; do tego czasu sauny mają własną stronę /sauna.
  if (filter.family !== "kontenery-modulowe") return null;

  const [tOptions, t] = await Promise.all([
    getTranslations("ProjectOptions"),
    getTranslations("SubcategoryFilterBar"),
  ]);
  const options = getContainerSubcategoryOptions(tOptions);
  const key = "containerSubcategory";
  const ariaLabel = t("containerAriaLabel");

  const selectOptions = [
    { value: "", label: t("containerAll"), href: buildResultsHref(locale, { ...filter, [key]: undefined }) },
    ...options.map(({ value, label }) => ({
      value,
      label,
      href: buildResultsHref(locale, { ...filter, [key]: value }),
    })),
  ];

  return (
    <FamilyRefineSelect
      label={t("containerLabel")}
      ariaLabel={ariaLabel}
      value={filter[key] ?? ""}
      options={selectOptions}
    />
  );
}
