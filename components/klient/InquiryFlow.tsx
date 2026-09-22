"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Heading, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
import { submitAdvisoryInquiry } from "@/lib/case-actions";
import type { Country, CountryCode, Project } from "@/lib/data/types";

interface InquiryFlowProps {
  projects: Project[];
  resultsHref: string;
  countries: Country[];
  initialCountryCode: CountryCode | null;
}

// Formularz zapytania do ModularHub (spec 0048 AC-1, AC-2): wybrane domy tylko
// do odczytu, pełny adres działki, kraj z listy obsługiwanych, wolny tekst.
// Bez budżetu, terminu i usług: te pytania zadaje doradca w rozmowie.
export function InquiryFlow({ projects, resultsHref, countries, initialCountryCode }: InquiryFlowProps) {
  const t = useTranslations("InquiryFlow");
  const locale = useLocale();
  const router = useRouter();
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode | null>(initialCountryCode);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Wygenerowany raz, przy otwarciu formularza: ponowienie po błędzie wysyła
  // ten sam klucz, więc serwer zwraca tę samą sprawę (AC-3).
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const canSubmit =
    street.trim().length > 0 && postalCode.trim().length > 0 && city.trim().length > 0 && countryCode !== null && !isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || countryCode === null) return;
    setError(null);

    startTransition(async () => {
      const result = await submitAdvisoryInquiry({
        projectIds: projects.map((project) => project.id),
        plot: { street, postalCode, city, countryCode },
        message: message.trim() || undefined,
        idempotencyKey,
        locale,
      });

      if (!result.ok || !result.inquiryId) {
        setError(
          result.error === "unsupported_country"
            ? t("unsupportedCountryError")
            : result.error === "auth"
              ? t("authError")
              : t("genericSendError"),
        );
        return;
      }

      router.push(`/${locale}/panel/inquiries/${result.inquiryId}`);
    });
  }

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading")}
      </Heading>
      <div className="max-w-xl rounded-v5-card border border-brand-v5-line p-brand-3">
        <Text as="p" surface="v5" className="font-medium">
          {t("howItWorksTitle")}
        </Text>
        <Text tone="muted" surface="v5">
          {t("howItWorksBody")}
        </Text>
      </div>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-brand-3" noValidate>
        <Stack gap={1}>
          <Text as="p" surface="v5" className="font-medium">
            {t("selectedHomesLabel")}
          </Text>
          <ul className="flex flex-col gap-1">
            {projects.map((project) => (
              <li key={project.id}>
                <Text surface="v5">{project.name}</Text>
              </li>
            ))}
          </ul>
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="inquiry-street" required surface="v5">
            {t("streetLabel")}
          </Label>
          <Input
            id="inquiry-street"
            name="street"
            type="text"
            autoComplete="street-address"
            required
            surface="v5"
            value={street}
            onChange={(event) => setStreet(event.target.value)}
          />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="inquiry-postal-code" required surface="v5">
            {t("postalCodeLabel")}
          </Label>
          <Input
            id="inquiry-postal-code"
            name="postalCode"
            type="text"
            autoComplete="postal-code"
            required
            surface="v5"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
          />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="inquiry-city" required surface="v5">
            {t("cityLabel")}
          </Label>
          <Input
            id="inquiry-city"
            name="city"
            type="text"
            autoComplete="address-level2"
            required
            surface="v5"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </Stack>
        <Stack gap={1}>
          <Label id="inquiry-country-label" required surface="v5">
            {t("countryLabel")}
          </Label>
          <Select
            value={countryCode}
            onChange={setCountryCode}
            options={countryOptions}
            aria-labelledby="inquiry-country-label"
            surface="v5"
          />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="inquiry-message" surface="v5">
            {t("messageLabel")}
          </Label>
          <Textarea
            id="inquiry-message"
            name="message"
            maxLength={4000}
            surface="v5"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </Stack>
        {error && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {error}
          </p>
        )}
        <Stack direction="row" gap={2}>
          <Button type="submit" disabled={!canSubmit} surface="v5" className="w-fit">
            {isPending ? t("sendingLabel") : error ? t("retrySendLabel") : t("sendLabel")}
          </Button>
          <Button as="a" href={resultsHref} variant="secondary" surface="v5" className="w-fit">
            {t("backToResults")}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
