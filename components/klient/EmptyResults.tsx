import { Button, Card, Heading, Text } from "@/components/ui";

interface EmptyResultsProps {
  locale: string;
}

export function EmptyResults({ locale }: EmptyResultsProps) {
  return (
    <Card padding="lg" className="flex flex-col items-center gap-brand-2 py-brand-5 text-center">
      <Heading level="h2">Brak domów pasujących do wybranych kryteriów</Heading>
      <Text tone="muted" measure className="mx-auto">
        Żaden projekt nie spełnia jednocześnie wybranego kraju i przedziału metrażu. Zmień filtr powyżej
        albo zacznij od nowa bez ograniczeń.
      </Text>
      <Button as="a" href={`/${locale}/klient/wyniki`} variant="secondary">
        Wyczyść filtry
      </Button>
    </Card>
  );
}
