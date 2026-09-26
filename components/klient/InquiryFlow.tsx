"use client";

import {
  Home,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState, useTransition } from "react";
import {
  Button,
  Card,
  Heading,
  Input,
  Label,
  Select,
  Stack,
  Text,
  Textarea,
} from "@/components/ui";
import { submitAdvisoryInquiry } from "@/lib/case-actions";
import type { Country, CountryCode, Project } from "@/lib/data/types";

interface InquiryFlowProps {
  projects: Project[];
  resultsHref: string;
  countries: Country[];
  initialCountryCode: CountryCode | null;
}

const HOW_IT_WORKS_STEPS: { icon: LucideIcon; key: string }[] = [
  { icon: Send, key: "howItWorksStep1" },
  { icon: MessageCircle, key: "howItWorksStep2" },
  { icon: ShieldCheck, key: "howItWorksStep3" },
];

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-brand-v5-amber-strong" aria-hidden="true" />
      <Text as="span" variant="label" surface="v5">
        {children}
      </Text>
    </div>
  );
}

// Formularz zapytania do ModularHub (spec 0048 AC-1, AC-2): wybrane domy tylko
// do odczytu, pełny adres działki, kraj z listy obsługiwanych, wolny tekst.
// Bez budżetu, terminu i usług: te pytania zadaje doradca w rozmowie.
export function InquiryFlow({
  projects,
  resultsHref,
  countries,
  initialCountryCode,
}: InquiryFlowProps) {
  const t = useTranslations("InquiryFlow");
  const locale = useLocale();
  const router = useRouter();
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode | null>(
    initialCountryCode,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Wygenerowany raz, przy otwarciu formularza: ponowienie po błędzie wysyła
  // ten sam klucz, więc serwer zwraca tę samą sprawę (AC-3).
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const canSubmit =
    street.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    city.trim().length > 0 &&
    countryCode !== null &&
    !isPending;

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

  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.name,
  }));

  return (
    <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] px-4 sm:px-8 lg:pl-10 lg:pr-10 xl:pl-14 xl:pr-14 2xl:pl-16 2xl:pr-16">
      <h1 className="sr-only">{t("heading")}</h1>
      <div className="grid grid-cols-1 gap-brand-6 lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr] 2xl:grid-cols-[520px_1fr] lg:items-start lg:gap-10 xl:gap-14">
        <Stack gap={4} className="lg:sticky lg:top-brand-4">
          <Heading level="h2" surface="v5" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("howItWorksTitle")}
          </Heading>
          <ol className="flex flex-col">
            {HOW_IT_WORKS_STEPS.map(({ icon: Icon, key }, index) => (
              <li
                key={key}
                className="relative flex gap-4 pb-8 last:pb-0 xl:pb-10"
              >
                {index < HOW_IT_WORKS_STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[23px] top-12 h-[calc(100%-2.5rem)] w-px bg-brand-v5-line"
                  />
                )}
                <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-xl border border-brand-v5-amber/30 bg-brand-v5-amber/12 text-brand-v5-amber-strong shadow-sm">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <p className="pt-2 text-base leading-relaxed text-brand-v5-ink sm:text-lg lg:text-xl font-normal">
                  <span className="sr-only">{index + 1}. </span>
                  {t(key)}
                </p>
              </li>
            ))}
          </ol>
        </Stack>

        <Card
          surface="v5"
          padding="lg"
          className="w-full p-brand-5 shadow-sm sm:p-brand-6 xl:p-8"
        >
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-brand-5"
            noValidate
          >
            <div className="grid grid-cols-1 gap-brand-5 sm:grid-cols-[1fr_1.3fr] sm:gap-brand-6 xl:gap-brand-8">
              <Stack gap={3}>
                <SectionHeading icon={Home}>
                  {t("selectedHomesLabel")}
                </SectionHeading>
                <ul className="flex flex-col gap-brand-3">
                  {projects.map((project) => (
                    <li key={project.id} className="flex min-w-0 flex-col gap-0.5">
                      <Text surface="v5" className="truncate font-medium">
                        {project.name}
                      </Text>
                      <Text
                        tone="muted"
                        surface="v5"
                        className="truncate text-data"
                      >
                        {t("homeMeta", {
                          producer: project.producerName,
                          area: project.floorAreaM2,
                        })}
                      </Text>
                    </li>
                  ))}
                </ul>
                <Stack gap={1}>
                  <Label htmlFor="inquiry-message" surface="v5">
                    {t("messageLabel")}
                  </Label>
                  <Textarea
                    id="inquiry-message"
                    name="message"
                    rows={6}
                    maxLength={4000}
                    surface="v5"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </Stack>
              </Stack>

              <Stack
                gap={3}
                className="sm:border-l sm:border-brand-v5-line sm:pl-brand-5"
              >
                <SectionHeading icon={MapPin}>
                  {t("sectionAddressHeading")}
                </SectionHeading>
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
                <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-[minmax(0,7rem)_1fr]">
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
                </div>
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
              </Stack>
            </div>

            <Stack gap={3} className="border-t border-brand-v5-line pt-brand-4">
              {error && (
                <p
                  className="font-sans text-body text-status-blocked"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <Stack direction="row" gap={2} className="flex-wrap">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  surface="v5"
                  size="lg"
                  className="w-fit"
                >
                  {isPending
                    ? t("sendingLabel")
                    : error
                      ? t("retrySendLabel")
                      : t("sendLabel")}
                </Button>
                <Button
                  as="a"
                  href={resultsHref}
                  variant="secondary"
                  surface="v5"
                  size="lg"
                  className="w-fit"
                >
                  {t("backToResults")}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Card>
      </div>
    </div>
  );
}
