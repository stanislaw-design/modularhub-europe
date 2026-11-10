"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Card, Checkbox, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
import {
  COMMERCIAL_INQUIRY_LIMITS,
  COMMERCIAL_INQUIRY_RATE_LIMIT_ERROR,
  COMMERCIAL_INTERESTS,
  COMMERCIAL_USE_CASES,
  type CommercialInterest,
  type CommercialUseCase,
} from "@/lib/commercial-display-inquiry-specs";
import { submitCommercialDisplayInquiry } from "@/lib/commercial-display-inquiry-actions";
import { isMarketCountryCode } from "@/lib/countries";
import type { Country, CountryCode } from "@/lib/data/types";

interface CommercialDisplayInquiryFormProps {
  locale: string;
  countries: Country[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USE_CASE_KEYS: Record<CommercialUseCase, string> = {
  hotel: "useCaseHotel",
  restaurant: "useCaseRestaurant",
  "pool-spa": "useCasePoolSpa",
  residential: "useCaseResidential",
  retail: "useCaseRetail",
  other: "useCaseOther",
};

const INTEREST_KEYS: Record<CommercialInterest, string> = {
  displays: "interestDisplays",
  signage: "interestSignage",
  "led-wall": "interestLedWall",
  unsure: "interestUnsure",
};

type FieldName = "name" | "email" | "country" | "useCase" | "interests" | "screenCount" | "message";

// Prosty formularz zgłoszeniowy ze strony /commercial-displays (spec 0083). Walidacja po stronie
// klienta jest tylko wygodą: ta sama lista reguł działa w akcji na serwerze (Zod).
export function CommercialDisplayInquiryForm({ locale, countries }: CommercialDisplayInquiryFormProps) {
  const t = useTranslations("CommercialDisplayInquiryForm");
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode | null>(null);
  const [useCase, setUseCase] = useState<CommercialUseCase | null>(null);
  const [interests, setInterests] = useState<CommercialInterest[]>([]);
  const [screenCount, setScreenCount] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [serverError, setServerError] = useState<"rate_limit" | "failed" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const countryOptions = countries
    .filter((country) => isMarketCountryCode(country.code))
    .map((country) => ({ value: country.code as CountryCode, label: country.name }));
  const useCaseOptions = COMMERCIAL_USE_CASES.map((value) => ({ value, label: t(USE_CASE_KEYS[value]) }));

  const screenCountNumber = screenCount.trim() === "" ? undefined : Number(screenCount);
  const errors: Partial<Record<FieldName, string>> = {};
  if (name.trim().length < COMMERCIAL_INQUIRY_LIMITS.nameMin) errors.name = t("errorRequired");
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = email.trim() === "" ? t("errorRequired") : t("errorEmail");
  if (countryCode === null) errors.country = t("errorRequired");
  if (useCase === null) errors.useCase = t("errorRequired");
  if (interests.length === 0) errors.interests = t("errorInterests");
  if (message.trim().length < COMMERCIAL_INQUIRY_LIMITS.messageMin) errors.message = t("errorMessageShort");
  if (
    screenCountNumber !== undefined &&
    (!Number.isInteger(screenCountNumber) ||
      screenCountNumber < 1 ||
      screenCountNumber > COMMERCIAL_INQUIRY_LIMITS.screenCountMax)
  ) {
    errors.screenCount = t("errorScreens");
  }
  const hasErrors = Object.keys(errors).length > 0;
  const showError = (field: FieldName) => (submitted || (field === "email" && emailTouched) ? errors[field] : undefined);

  function toggleInterest(value: CommercialInterest) {
    setInterests((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (hasErrors) {
      const firstId = (["name", "email", "message", "screenCount"] as const).find((field) => errors[field]);
      if (firstId) document.getElementById(`cdi-${firstId}`)?.focus();
      return;
    }
    startTransition(async () => {
      const result = await submitCommercialDisplayInquiry({
        name,
        company,
        email,
        phone,
        countryCode: countryCode as CountryCode,
        useCase: useCase as CommercialUseCase,
        interests,
        screenCount: screenCountNumber,
        message,
        locale: locale as "pl" | "en" | "de" | "nl",
        website,
      });
      if (result.ok) {
        setSentTo(email.trim());
        return;
      }
      setServerError(result.error === COMMERCIAL_INQUIRY_RATE_LIMIT_ERROR ? "rate_limit" : "failed");
    });
  }

  if (sentTo !== null) {
    return (
      <div role="status">
        <Card surface="v5" padding="lg" className="flex flex-col gap-brand-2">
          <CheckCircle2 className="size-8 text-status-approved" aria-hidden="true" />
          <h3 className="font-display text-h3 font-semibold text-brand-v5-ink">{t("successHeading")}</h3>
          <Text surface="v5" tone="muted">
            {t("successText", { email: sentTo })}
          </Text>
        </Card>
      </div>
    );
  }

  const errorText = (field: FieldName) => {
    const message = showError(field);
    return message ? (
      <p id={`cdi-${field}-error`} className="font-sans text-body text-status-blocked">
        {message}
      </p>
    ) : null;
  };

  return (
    <Card surface="v5" padding="lg">
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-brand-3 md:grid-cols-2">
        <Stack gap={1}>
          <Label htmlFor="cdi-name" required surface="v5">
            {t("nameLabel")}
          </Label>
          <Input
            id="cdi-name"
            name="name"
            autoComplete="name"
            required
            surface="v5"
            maxLength={COMMERCIAL_INQUIRY_LIMITS.nameMax}
            invalid={Boolean(showError("name"))}
            aria-describedby={showError("name") ? "cdi-name-error" : undefined}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {errorText("name")}
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="cdi-company" surface="v5">
            {t("companyLabel")}
          </Label>
          <Input
            id="cdi-company"
            name="company"
            autoComplete="organization"
            surface="v5"
            maxLength={COMMERCIAL_INQUIRY_LIMITS.companyMax}
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="cdi-email" required surface="v5">
            {t("emailLabel")}
          </Label>
          <Input
            id="cdi-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            surface="v5"
            maxLength={COMMERCIAL_INQUIRY_LIMITS.emailMax}
            invalid={Boolean(showError("email"))}
            aria-describedby={showError("email") ? "cdi-email-error" : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setEmailTouched(true)}
          />
          {errorText("email")}
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="cdi-phone" surface="v5">
            {t("phoneLabel")}
          </Label>
          <Input
            id="cdi-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            surface="v5"
            maxLength={COMMERCIAL_INQUIRY_LIMITS.phoneMax}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Stack>
        <Stack gap={1}>
          <span id="cdi-country-label" className="text-label font-medium uppercase tracking-[0.1em] text-brand-v5-muted">
            {t("countryLabel")} <span className="text-status-blocked" aria-hidden="true">*</span>
          </span>
          <Select
            surface="v5"
            name="country"
            aria-labelledby="cdi-country-label"
            placeholder={t("countryPlaceholder")}
            options={countryOptions}
            value={countryCode}
            onChange={setCountryCode}
            invalid={Boolean(showError("country"))}
          />
          {errorText("country")}
        </Stack>
        <Stack gap={1}>
          <span id="cdi-usecase-label" className="text-label font-medium uppercase tracking-[0.1em] text-brand-v5-muted">
            {t("useCaseLabel")} <span className="text-status-blocked" aria-hidden="true">*</span>
          </span>
          <Select
            surface="v5"
            name="useCase"
            aria-labelledby="cdi-usecase-label"
            placeholder={t("useCasePlaceholder")}
            options={useCaseOptions}
            value={useCase}
            onChange={setUseCase}
            invalid={Boolean(showError("useCase"))}
          />
          {errorText("useCase")}
        </Stack>

        <fieldset className="flex flex-col gap-brand-2 md:col-span-2">
          <legend className="mb-1 text-label font-medium uppercase tracking-[0.1em] text-brand-v5-muted">
            {t("interestsLegend")} <span className="text-status-blocked" aria-hidden="true">*</span>
          </legend>
          {COMMERCIAL_INTERESTS.map((value) => (
            <label key={value} className="flex cursor-pointer items-start gap-brand-2 text-body text-brand-v5-ink">
              <Checkbox
                surface="v5"
                name="interests"
                value={value}
                className="mt-0.5 shrink-0"
                checked={interests.includes(value)}
                onChange={() => toggleInterest(value)}
              />
              <span>{t(INTEREST_KEYS[value])}</span>
            </label>
          ))}
          {errorText("interests")}
        </fieldset>

        <Stack gap={1}>
          <Label htmlFor="cdi-screenCount" surface="v5">
            {t("screenCountLabel")}
          </Label>
          <Input
            id="cdi-screenCount"
            name="screenCount"
            type="number"
            inputMode="numeric"
            min={1}
            max={COMMERCIAL_INQUIRY_LIMITS.screenCountMax}
            surface="v5"
            invalid={Boolean(showError("screenCount"))}
            aria-describedby={showError("screenCount") ? "cdi-screenCount-error" : undefined}
            value={screenCount}
            onChange={(event) => setScreenCount(event.target.value)}
          />
          {errorText("screenCount")}
        </Stack>
        <div className="hidden md:block" aria-hidden="true" />

        <Stack gap={1} className="md:col-span-2">
          <Label htmlFor="cdi-message" required surface="v5">
            {t("messageLabel")}
          </Label>
          <Textarea
            id="cdi-message"
            name="message"
            rows={5}
            required
            surface="v5"
            maxLength={COMMERCIAL_INQUIRY_LIMITS.messageMax}
            invalid={Boolean(showError("message"))}
            aria-describedby={showError("message") ? "cdi-message-error" : "cdi-message-hint"}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <p id="cdi-message-hint" className="font-sans text-data text-brand-v5-muted">
            {t("messageHint")}
          </p>
          {errorText("message")}
        </Stack>

        {/* Pole-pułapka na boty: poza ekranem, bez fokusu, bez autouzupełniania. Człowiek go nie wypełnia. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-brand-2 md:col-span-2">
          {submitted && hasErrors && (
            <p role="alert" className="font-sans text-body text-status-blocked">
              {t("errorSummary")}
            </p>
          )}
          {serverError && (
            <p role="alert" className="font-sans text-body text-status-blocked">
              {serverError === "rate_limit" ? t("errorRateLimit") : t("errorGeneric")}
            </p>
          )}
          <Text surface="v5" tone="muted" className="text-data">
            {t("privacyBefore")}
            <Link href={`/${locale}/privacy`} className="focus-ring rounded-data underline">
              {t("privacyLink")}
            </Link>
            {t("privacyAfter")}
          </Text>
          <Button type="submit" size="lg" surface="v5" disabled={isPending} className="w-full sm:w-fit">
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
