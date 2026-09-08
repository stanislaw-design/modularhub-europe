"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Heading, Input, Label, ScrollReveal, Select, Stack, Text } from "@/components/ui";
import type { Country, CountryCode, Project } from "@/lib/data/types";
import type { InquiryContact } from "@/lib/inquiry";
import { submitInquiry } from "@/lib/inquiry-actions";
import { InquiryConfirmationCard } from "./InquiryConfirmationCard";

interface InquiryFlowProps {
  projects: Project[];
  resultsHref: string;
  dzialkaHref: string;
  countries: Country[];
  initialContact: InquiryContact;
  initialCountryCode: CountryCode | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InquiryFlow({
  projects,
  resultsHref,
  dzialkaHref,
  countries,
  initialContact,
  initialCountryCode,
}: InquiryFlowProps) {
  const t = useTranslations("InquiryFlow");
  const productNoun = t(`productNoun.${projects.length === 1 ? "one" : "other"}`);
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [contact, setContact] = useState<InquiryContact>(initialContact);
  const [deliveryCountryCode, setDeliveryCountryCode] = useState<CountryCode | null>(initialCountryCode);
  const [emailTouched, setEmailTouched] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Wygenerowany raz, przy otwarciu formularza (spec 0023 AC-7, AC-8): ponów po
  // błędzie wysyła ten sam klucz, więc serwer nie tworzy drugiego wiersza.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const emailValid = EMAIL_PATTERN.test(contact.email);
  const canSubmit =
    contact.name.trim().length > 0 &&
    emailValid &&
    contact.phone.trim().length > 0 &&
    deliveryCountryCode !== null &&
    !isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || deliveryCountryCode === null) return;
    setError(null);

    startTransition(async () => {
      const result = await submitInquiry({
        contact,
        deliveryCountryCode,
        projectIds: projects.map((project) => project.id),
        idempotencyKey,
      });

      if (!result.ok) {
        setError(result.error ?? t("genericSendError"));
        return;
      }

      setSentAt(new Date());
      setPhase("sent");
    });
  }

  if (phase === "sent" && sentAt) {
    return (
      <Stack gap={4}>
        <Heading level="h1" surface="v5">
          {t("sentHeading")}
        </Heading>
        <Text tone="muted" surface="v5">
          {t("sentConfirmation", { count: projects.length, noun: productNoun })}
        </Text>
        <Stack gap={3}>
          {projects.map((project, index) => (
            <ScrollReveal key={project.id} style={{ transitionDelay: `${Math.min(index * 80, 480)}ms` }}>
              <InquiryConfirmationCard project={project} sentAt={sentAt} />
            </ScrollReveal>
          ))}
        </Stack>
        <Stack direction="row" gap={2}>
          <Button as="a" href={dzialkaHref} surface="v5" className="w-fit">
            {t("checkPlot")}
          </Button>
          <Button as="a" href={resultsHref} variant="secondary" surface="v5" className="w-fit">
            {t("backToResults")}
          </Button>
        </Stack>
      </Stack>
    );
  }

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading")}
      </Heading>
      <Text tone="muted" surface="v5">
        {t("intro", {
          count: projects.length,
          noun: productNoun,
          names: projects.map((project) => project.name).join(", "),
        })}
      </Text>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-brand-3" noValidate>
        <Stack gap={1}>
          <Label htmlFor="inquiry-name" required surface="v5">
            {t("nameLabel")}
          </Label>
          <Input
            id="inquiry-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            surface="v5"
            value={contact.name}
            onChange={(event) => setContact((prev) => ({ ...prev, name: event.target.value }))}
          />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="inquiry-email" required surface="v5">
            E-mail
          </Label>
          <Input
            id="inquiry-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            surface="v5"
            invalid={emailTouched && contact.email.length > 0 && !emailValid}
            aria-describedby={emailTouched && contact.email.length > 0 && !emailValid ? "inquiry-email-error" : undefined}
            value={contact.email}
            onChange={(event) => setContact((prev) => ({ ...prev, email: event.target.value }))}
            onBlur={() => setEmailTouched(true)}
          />
          {emailTouched && contact.email.length > 0 && !emailValid && (
            <p id="inquiry-email-error" className="font-sans text-body text-status-blocked">
              {t("emailInvalidError")}
            </p>
          )}
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="inquiry-phone" required surface="v5">
            {t("phoneLabel")}
          </Label>
          <Input
            id="inquiry-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            surface="v5"
            value={contact.phone}
            onChange={(event) => setContact((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </Stack>
        <Stack gap={1}>
          <Label id="inquiry-country-label" required surface="v5">
            {t("deliveryCountryLabel")}
          </Label>
          <Select
            value={deliveryCountryCode}
            onChange={setDeliveryCountryCode}
            options={countryOptions}
            aria-labelledby="inquiry-country-label"
            surface="v5"
          />
        </Stack>
        {error && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!canSubmit} surface="v5" className="w-fit">
          {isPending ? t("sendingLabel") : error ? t("retrySendLabel") : t("sendLabel")}
        </Button>
      </form>
    </Stack>
  );
}
