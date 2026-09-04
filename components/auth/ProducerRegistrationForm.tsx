"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Heading, Input, Label, Select, Stack, Text } from "@/components/ui";
import type { Country, CountryCode } from "@/lib/data/types";
import { PRODUCER_TECHNOLOGIES, type ProducerTechnology } from "@/lib/producer-technologies";
import { registerProducer, type RegistrationActionState } from "@/lib/auth-registration";

interface ProducerRegistrationFormProps {
  locale: string;
  callbackUrl: string;
  countries: Country[];
}

const initialState: RegistrationActionState = { status: "idle" };

export function ProducerRegistrationForm({ locale, callbackUrl, countries }: ProducerRegistrationFormProps) {
  const [state, formAction, isPending] = useActionState(registerProducer, initialState);
  const [countryCode, setCountryCode] = useState<CountryCode | null>(null);
  const [technology, setTechnology] = useState<ProducerTechnology | null>(null);

  if (state.status === "sent") {
    return (
      <Stack gap={3}>
        <Heading level="h1">Sprawdź swoją skrzynkę</Heading>
        <Text tone="muted">
          Wysłaliśmy link logowania na podany adres e mail. Kliknij go, żeby dokończyć zakładanie konta
          — link jest ważny przez 24 godziny.
        </Text>
      </Stack>
    );
  }

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));

  return (
    <Stack gap={4}>
      <Heading level="h1">Załóż konto producenta</Heading>
      <Text tone="muted">
        Podaj dane swojej firmy. Bez hasła — logujesz się linkiem wysłanym e mailem, tak samo jak
        klient.
      </Text>
      <form action={formAction} className="flex max-w-md flex-col gap-brand-3" noValidate>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Stack gap={1}>
          <Label htmlFor="producer-reg-name" required>
            Nazwa firmy
          </Label>
          <Input id="producer-reg-name" name="name" type="text" autoComplete="organization" required />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="producer-reg-email" required>
            E-mail
          </Label>
          <Input id="producer-reg-email" name="email" type="email" autoComplete="email" required />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="producer-reg-phone" required>
            Telefon
          </Label>
          <Input id="producer-reg-phone" name="phone" type="tel" autoComplete="tel" required />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="producer-reg-nip" required>
            NIP
          </Label>
          <Input id="producer-reg-nip" name="nip" type="text" required />
        </Stack>
        <Stack gap={1}>
          <Label id="producer-reg-country-label" required>
            Kraj
          </Label>
          <Select
            name="countryCode"
            value={countryCode}
            onChange={setCountryCode}
            options={countryOptions}
            aria-labelledby="producer-reg-country-label"
          />
        </Stack>
        <Stack gap={1}>
          <Label id="producer-reg-technology-label" required>
            Technologia
          </Label>
          <Select
            name="technology"
            value={technology}
            onChange={setTechnology}
            options={PRODUCER_TECHNOLOGIES as unknown as { value: ProducerTechnology; label: string }[]}
            aria-labelledby="producer-reg-technology-label"
          />
        </Stack>
        {state.status === "error" && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={isPending} className="w-fit">
          Załóż konto
        </Button>
      </form>
      <Text tone="muted">
        Masz już konto?{" "}
        <Link
          href={`/${locale}/logowanie?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="focus-ring rounded-data font-medium text-brand-v5-amber-strong underline"
        >
          Zaloguj się
        </Link>
      </Text>
    </Stack>
  );
}
