import { ShieldCheck, Truck, Workflow } from "lucide-react";
import { RegistrationForm } from "@/components/producent/RegistrationForm";
import { Button, Card, Grid, Heading, Stack, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";

const benefits = [
  {
    icon: Workflow,
    title: "Jedna rejestracja, wszystkie kraje",
    description: "Zaznacz kraje dostawy raz — dopuszczalność projektów sprawdzamy dla każdego z nich.",
  },
  {
    icon: Truck,
    title: "Zapytania z gotowym kontekstem",
    description: "Klienci wysyłają zapytania od razu z wybranym projektem i danymi kontaktowymi.",
  },
  {
    icon: ShieldCheck,
    title: "Status realizacji w jednym miejscu",
    description: "Produkcja, transport, montaż i odbiór — jedna oś statusu, ta sama co u klienta.",
  },
];

export default async function ProducentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const countries = await getCountries();

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <Heading level="h1">Zostań producentem ModularHub Europe</Heading>
        <Text variant="bodyL" tone="muted" measure>
          Krótka rejestracja, bez logowania — trzy pola i przechodzisz od razu do dodania pierwszego
          projektu.
        </Text>
      </Stack>
      <Grid gap={4}>
        <Stack gap={3} className="col-span-12 lg:col-span-5">
          <Heading level="h2">Dlaczego ModularHub Europe</Heading>
          {benefits.map((benefit) => (
            <Card key={benefit.title} padding="md">
              <Stack direction="row" gap={3} align="start">
                <benefit.icon
                  className="size-6 shrink-0 text-brand-passage-blue"
                  aria-hidden="true"
                />
                <Stack gap={1}>
                  <Heading level="h3">{benefit.title}</Heading>
                  <Text tone="muted">{benefit.description}</Text>
                </Stack>
              </Stack>
            </Card>
          ))}
          <Button as="a" href={`/${locale}/producent/zapytania`} variant="ghost" className="w-fit">
            Masz już konto? Sprawdź przychodzące zapytania
          </Button>
          <Button as="a" href={`/${locale}/producent/realizacje`} variant="ghost" className="w-fit">
            Masz już zamówienie w realizacji? Sprawdź status i wypłatę
          </Button>
        </Stack>
        <Card padding="lg" className="col-span-12 lg:col-span-7">
          <Stack gap={4}>
            <Heading level="h2">Dane firmy</Heading>
            <RegistrationForm locale={locale} countries={countries} />
          </Stack>
        </Card>
      </Grid>
    </Stack>
  );
}
