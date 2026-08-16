import { CheckCircle2 } from "lucide-react";
import { Button, Card, DataText, Heading, Stack, Text } from "@/components/ui";
import type { Country } from "@/lib/data/types";
import type { RegistrationDetails } from "@/lib/producer-registration";
import { PRODUCER_TECHNOLOGIES } from "@/lib/producer-technologies";

interface RegistrationConfirmationProps {
  locale: string;
  details: RegistrationDetails;
  countries: Country[];
}

export function RegistrationConfirmation({ locale, details, countries }: RegistrationConfirmationProps) {
  const countryNames = details.countries
    .map((code) => countries.find((country) => country.code === code)?.name ?? code)
    .join(", ");
  const technologyLabel =
    PRODUCER_TECHNOLOGIES.find((technology) => technology.value === details.technology)?.label ??
    details.technology;

  return (
    <Stack gap={4}>
      <span className="inline-flex w-fit items-center gap-brand-1 rounded-data border border-status-approved/30 bg-status-approved/10 px-brand-2 py-1 text-label font-medium uppercase tracking-[0.1em] text-status-approved">
        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
        Rejestracja zakończona
      </span>
      <Stack gap={2}>
        <Heading level="h1">Pierwszy projekt</Heading>
        <Text tone="muted" measure>
          Dane firmy zostały przyjęte. Formularz dodawania pierwszego projektu — z polami technicznymi
          i wgrywaniem rzutów — pojawi się w kolejnym etapie budowy. Poniżej podsumowanie tego, co
          właśnie zarejestrowano.
        </Text>
      </Stack>
      <Card as="dl" className="grid grid-cols-1 gap-brand-3 sm:grid-cols-3">
        <Stack gap={1}>
          <Text as="dt" variant="label" tone="muted">
            NIP
          </Text>
          <DataText as="dd">{details.nip}</DataText>
        </Stack>
        <Stack gap={1}>
          <Text as="dt" variant="label" tone="muted">
            Kraje dostawy
          </Text>
          <Text as="dd">{countryNames}</Text>
        </Stack>
        <Stack gap={1}>
          <Text as="dt" variant="label" tone="muted">
            Technologia
          </Text>
          <Text as="dd">{technologyLabel}</Text>
        </Stack>
      </Card>
      <Button as="a" href={`/${locale}/producent`} variant="secondary" className="w-fit">
        Wróć do rejestracji
      </Button>
    </Stack>
  );
}
