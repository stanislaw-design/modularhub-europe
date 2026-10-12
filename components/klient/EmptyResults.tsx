import { useTranslations } from "next-intl";
import { Button, Card, Heading, Text } from "@/components/ui";
import type { FamilyFilterValue } from "@/lib/product-family-groups";
import { buildResultsHref } from "@/lib/results-filters";

interface EmptyResultsProps {
  locale: string;
  family: FamilyFilterValue;
  /** Adres przycisku czyszczenia filtrów (spec 0068 AC-2): domyślnie /results
   * z aktywną rodziną, strona kategorii (np. /sauna) podaje własny. */
  clearHref?: string;
}

// Treść świadoma rodziny produktu (spec 0026 AC-11). Only ever rendered from
// ResultsSelection ("use client"), same reason as ResultsHeader: useTranslations,
// never getTranslations. "Wyczyść filtry" zachowuje aktywną rodzinę (spa/kontenery
// modułowe dziś i tak zwykle puste, patrz spec Follow-up) — czyszczenie nie powinno
// po cichu przełączać z powrotem na dom.
export function EmptyResults({ locale, family, clearHref }: EmptyResultsProps) {
  const t = useTranslations("EmptyResults");
  const familyMany = useTranslations("ProductFamilyNoun")(`${family}.many`);
  return (
    <Card padding="lg" surface="v5" className="flex flex-col items-center gap-brand-2 py-brand-5 text-center">
      <Heading level="h2" surface="v5">
        {t("heading", { familyMany })}
      </Heading>
      <Text tone="muted" surface="v5" measure className="mx-auto">
        {t("description")}
      </Text>
      <Button as="a" href={clearHref ?? buildResultsHref(locale, { family })} variant="secondary" surface="v5">
        {t("clearFilters")}
      </Button>
    </Card>
  );
}
