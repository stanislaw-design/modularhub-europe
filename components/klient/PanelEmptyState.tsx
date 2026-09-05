import { Button, Card, Heading, Text } from "@/components/ui";

interface PanelEmptyStateProps {
  locale: string;
  title: string;
  description: string;
}

// Pusta lista, wspólna dla /klient/panel/ulubione i /klient/panel/zapytania
// (spec 0024 AC-11): przyjazny komunikat z linkiem powrotnym do /wyniki,
// nigdy błąd ani pusta strona.
export function PanelEmptyState({ locale, title, description }: PanelEmptyStateProps) {
  return (
    <Card padding="lg" surface="v5" className="flex flex-col items-center gap-brand-2 py-brand-5 text-center">
      <Heading level="h2" surface="v5">
        {title}
      </Heading>
      <Text tone="muted" surface="v5" measure className="mx-auto">
        {description}
      </Text>
      <Button as="a" href={`/${locale}/klient/wyniki`} variant="secondary" surface="v5">
        Przeglądaj domy
      </Button>
    </Card>
  );
}
