"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("ProducerRegistrationForm");
  const [state, formAction, isPending] = useActionState(registerProducer, initialState);
  const [countryCode, setCountryCode] = useState<CountryCode | null>(null);
  const [technology, setTechnology] = useState<ProducerTechnology | null>(null);

  if (state.status === "sent") {
    return (
      <Stack gap={3}>
        <Heading level="h1">{t("checkInboxHeading")}</Heading>
        <Text tone="muted">{t("checkInboxBody")}</Text>
      </Stack>
    );
  }

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));

  return (
    <Stack gap={4}>
      <Heading level="h1">{t("heading")}</Heading>
      <Text tone="muted">{t("intro")}</Text>
      <form action={formAction} className="flex max-w-md flex-col gap-brand-3" noValidate>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Stack gap={1}>
          <Label htmlFor="producer-reg-name" required>
            {t("companyNameLabel")}
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
            {t("phoneLabel")}
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
            {t("countryLabel")}
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
            {t("technologyLabel")}
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
          {t("submitButton")}
        </Button>
      </form>
      <Text tone="muted">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href={`/${locale}/logowanie?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="focus-ring rounded-data font-medium text-brand-v5-amber-strong underline"
        >
          {t("loginLink")}
        </Link>
      </Text>
    </Stack>
  );
}
