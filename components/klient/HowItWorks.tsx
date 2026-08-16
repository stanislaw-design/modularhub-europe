import { Card, DataText, Grid, Heading, Stack, Text } from "@/components/ui";

const steps = [
  {
    title: "Wyszukaj",
    description: "Podaj kraj i przybliżony metraż, żeby zobaczyć pasujące domy.",
  },
  {
    title: "Przeglądaj wyniki",
    description: "Widzisz wyłącznie domy dopuszczone prawnie w wybranym kraju.",
  },
  {
    title: "Wyślij zapytanie",
    description: "Wybierz kilka projektów i wyślij jedno zapytanie do producentów.",
  },
  {
    title: "Śledź realizację",
    description: "Od produkcji po montaż — status na bieżąco, w jednym miejscu.",
  },
];

export function HowItWorks() {
  return (
    <Stack gap={4}>
      <Heading level="h2">Jak to działa</Heading>
      <Grid as="ol" gap={3}>
        {steps.map((step, index) => (
          <Card
            as="li"
            key={step.title}
            padding="md"
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          >
            <Stack gap={2}>
              <DataText tone="muted">{String(index + 1).padStart(2, "0")}</DataText>
              <Heading level="h3">{step.title}</Heading>
              <Text tone="muted">{step.description}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>
    </Stack>
  );
}
