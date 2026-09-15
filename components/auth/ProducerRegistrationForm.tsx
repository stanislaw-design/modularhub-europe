"use client";

import { Building2, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Card, Heading, Input, Label, Select, Stack, Text } from "@/components/ui";
import type { Country, CountryCode } from "@/lib/data/types";
import { PRODUCER_PRODUCTION_SCALES, type ProducerProductionScale } from "@/lib/producer-production-scale";
import { registerProducer, type RegistrationActionState } from "@/lib/auth-registration";

interface ProducerRegistrationFormProps {
  locale: string;
  callbackUrl: string;
  countries: Country[];
}

const initialState: RegistrationActionState = { status: "idle" };

function SectionHeading({ icon: Icon, children }: { icon: typeof Building2; children: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-brand-v5-amber-strong" aria-hidden="true" />
      <Text as="span" variant="label" surface="v5">
        {children}
      </Text>
    </div>
  );
}

export function ProducerRegistrationForm({ locale, callbackUrl, countries }: ProducerRegistrationFormProps) {
  const t = useTranslations("ProducerRegistrationForm");
  const [state, formAction, isPending] = useActionState(registerProducer, initialState);
  const [countryCode, setCountryCode] = useState<CountryCode | null>(null);
  const [productionScale, setProductionScale] = useState<ProducerProductionScale | null>(null);

  if (state.status === "sent") {
    return (
      <Stack gap={3}>
        <Heading level="h1" surface="v5">
          {t("checkInboxHeading")}
        </Heading>
        <Text tone="muted" surface="v5">
          {t("checkInboxBody")}
        </Text>
      </Stack>
    );
  }

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));

  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text tone="muted" surface="v5">
          {t("intro")}
        </Text>
      </Stack>
      <Card surface="v5" padding="lg" className="p-brand-3 shadow-sm sm:p-brand-4">
        <form action={formAction} className="flex flex-col gap-brand-4" noValidate>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-2 lg:gap-brand-6">
            <Stack gap={2}>
              <SectionHeading icon={Building2}>{t("sectionCompanyHeading")}</SectionHeading>
              <Stack gap={1}>
                <Label htmlFor="producer-reg-name" required surface="v5">
                  {t("companyNameLabel")}
                </Label>
                <Input id="producer-reg-name" name="name" type="text" autoComplete="organization" required surface="v5" />
              </Stack>
              <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
                <Stack gap={1}>
                  <Label htmlFor="producer-reg-email" required surface="v5">
                    E-mail
                  </Label>
                  <Input id="producer-reg-email" name="email" type="email" autoComplete="email" required surface="v5" />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="producer-reg-phone" required surface="v5">
                    {t("phoneLabel")}
                  </Label>
                  <Input id="producer-reg-phone" name="phone" type="tel" autoComplete="tel" required surface="v5" />
                </Stack>
              </div>
              <Stack gap={1}>
                <Label htmlFor="producer-reg-nip" required surface="v5">
                  NIP
                </Label>
                <Input id="producer-reg-nip" name="nip" type="text" required surface="v5" />
              </Stack>
            </Stack>

            <Stack gap={2} className="lg:border-l lg:border-brand-v5-line lg:pl-brand-5">
              <SectionHeading icon={MapPin}>{t("sectionLocationHeading")}</SectionHeading>
              <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
                <Stack gap={1}>
                  <Label id="producer-reg-country-label" required surface="v5">
                    {t("countryLabel")}
                  </Label>
                  <Select
                    name="countryCode"
                    value={countryCode}
                    onChange={setCountryCode}
                    options={countryOptions}
                    aria-labelledby="producer-reg-country-label"
                    surface="v5"
                  />
                </Stack>
                <Stack gap={1}>
                  <Label id="producer-reg-production-scale-label" required surface="v5">
                    {t("productionScaleLabel")}
                  </Label>
                  <Select
                    name="productionScale"
                    value={productionScale}
                    onChange={setProductionScale}
                    options={PRODUCER_PRODUCTION_SCALES as unknown as { value: ProducerProductionScale; label: string }[]}
                    aria-labelledby="producer-reg-production-scale-label"
                    surface="v5"
                  />
                </Stack>
              </div>
            </Stack>
          </div>

          {state.status === "error" && (
            <p className="font-sans text-body text-status-blocked" role="alert">
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={isPending} surface="v5" size="lg" className="w-full sm:w-fit sm:self-end">
            {t("submitButton")}
          </Button>
        </form>
      </Card>
      <Text tone="muted" surface="v5">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href={`/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="focus-ring rounded-data font-medium text-brand-v5-ink underline"
        >
          {t("loginLink")}
        </Link>
      </Text>
    </Stack>
  );
}
