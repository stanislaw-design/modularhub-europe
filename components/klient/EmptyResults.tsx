import { Button, Card, Heading, Text } from "@/components/ui";
import type { ProductFamily } from "@/lib/data/types";
import { buildResultsHref } from "@/lib/results-filters";
import { FAMILY_NOUN } from "./ResultsHeader";

interface EmptyResultsProps {
  locale: string;
  family: ProductFamily;
}

// Treść świadoma rodziny produktu (spec 0026 AC-11), reużywa FAMILY_NOUN z
// ResultsHeader.tsx zamiast duplikować formy odmiany. "Wyczyść filtry" zachowuje
// aktywną rodzinę (spa/pergola dziś i tak zwykle puste, patrz spec Follow-up) —
// czyszczenie nie powinno po cichu przełączać z powrotem na dom.
export function EmptyResults({ locale, family }: EmptyResultsProps) {
  return (
    <Card padding="lg" surface="v5" className="flex flex-col items-center gap-brand-2 py-brand-5 text-center">
      <Heading level="h2" surface="v5">
        Brak {FAMILY_NOUN[family].many} pasujących do wybranych kryteriów
      </Heading>
      <Text tone="muted" surface="v5" measure className="mx-auto">
        Żaden projekt nie spełnia jednocześnie wybranych kryteriów. Zmień filtry powyżej albo zacznij od
        nowa bez ograniczeń.
      </Text>
      <Button as="a" href={buildResultsHref(locale, { family })} variant="secondary" surface="v5">
        Wyczyść filtry
      </Button>
    </Card>
  );
}
