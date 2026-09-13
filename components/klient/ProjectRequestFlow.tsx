"use client";

import { Building2, CheckCircle2, Mail, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, type RefObject, useEffect, useRef, useState, useTransition } from "react";
import { Button, Card, Checkbox, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
import type { Country, CountryCode, CompletionStandard, ProductFamily } from "@/lib/data/types";
import { PRODUCT_FAMILIES } from "@/lib/product-technical-specs";
import { COMPLETION_STANDARDS } from "@/lib/producer-capacity-profile-specs";
import { PROJECT_TYPES } from "@/lib/project-request-specs";
import { submitProjectRequest, type SubmitProjectRequestInput } from "@/lib/project-request-actions";
import { ProjectRequestConfirmationCard } from "./ProjectRequestConfirmationCard";

type ProjectType = (typeof PROJECT_TYPES)[number];
type WizardStep = 0 | 1 | 2;

interface ProjectRequestFlowProps {
  locale: string;
  countries: Country[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEP_COUNT = 3;

function toOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

function toOptionalString(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Step heading uses a raw <h2>, not the Heading primitive: combining a custom
// font-size token (text-h3) with a custom v5 color token through Heading's
// tv() merge collapses one of the two into the other (see BulkOrdersShowcase
// for the same finding) — a plain tag compiles both independently, and also
// gives us a real ref to move focus onto when the step changes (AC-12).
function StepHeading({
  headingRef,
  children,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}) {
  return (
    <h2 ref={headingRef} tabIndex={-1} className="font-display text-h3 font-semibold text-brand-v5-ink outline-none">
      {children}
    </h2>
  );
}

export function ProjectRequestFlow({ locale, countries }: ProjectRequestFlowProps) {
  const t = useTranslations("ProjectRequestFlow");
  const tOptions = useTranslations("ProjectOptions");

  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [step, setStep] = useState<WizardStep>(0);
  const [countryCode, setCountryCode] = useState<CountryCode | null>(null);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [locationDetail, setLocationDetail] = useState("");
  const [unitCountMin, setUnitCountMin] = useState("");
  const [unitCountMax, setUnitCountMax] = useState("");
  const [floorAreaM2Min, setFloorAreaM2Min] = useState("");
  const [floorAreaM2Max, setFloorAreaM2Max] = useState("");
  const [completionStandard, setCompletionStandard] = useState<CompletionStandard | null>(null);
  const [startWindowFrom, setStartWindowFrom] = useState("");
  const [startWindowTo, setStartWindowTo] = useState("");
  const [deliveryWindowFrom, setDeliveryWindowFrom] = useState("");
  const [deliveryWindowTo, setDeliveryWindowTo] = useState("");
  const [extrasNote, setExtrasNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (phase === "form") stepHeadingRef.current?.focus();
  }, [step, phase]);

  const emailValid = EMAIL_PATTERN.test(contactEmail);
  const unitCountMinValue = Number(unitCountMin);
  const unitCountMinValid = unitCountMin.trim().length > 0 && Number.isInteger(unitCountMinValue) && unitCountMinValue >= 10;

  const contactValid = contactName.trim().length > 0 && emailValid;
  const aboutValid = countryCode !== null && projectType !== null && families.length > 0;
  const detailsValid = unitCountMinValid;
  const canSubmit = contactValid && aboutValid && detailsValid && !isPending;

  function toggleFamily(family: ProductFamily) {
    setFamilies((prev) => (prev.includes(family) ? prev.filter((item) => item !== family) : [...prev, family]));
  }

  function goBack() {
    setStep((current) => (current > 0 ? ((current - 1) as WizardStep) : current));
  }

  function handleWizardSubmit(event: FormEvent) {
    event.preventDefault();

    if (step === 0) {
      if (!contactValid) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!aboutValid) return;
      setStep(2);
      return;
    }
    if (!canSubmit || countryCode === null || projectType === null) return;
    setError(null);

    const input: SubmitProjectRequestInput = {
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      countryCode,
      projectType,
      families,
      unitCountMin: unitCountMinValue,
      contactPhone: toOptionalString(contactPhone),
      locationDetail: toOptionalString(locationDetail),
      unitCountMax: toOptionalNumber(unitCountMax),
      floorAreaM2Min: toOptionalNumber(floorAreaM2Min),
      floorAreaM2Max: toOptionalNumber(floorAreaM2Max),
      completionStandard: completionStandard ?? undefined,
      startWindowFrom: toOptionalString(startWindowFrom),
      startWindowTo: toOptionalString(startWindowTo),
      deliveryWindowFrom: toOptionalString(deliveryWindowFrom),
      deliveryWindowTo: toOptionalString(deliveryWindowTo),
      extrasNote: toOptionalString(extrasNote),
    };

    startTransition(async () => {
      const result = await submitProjectRequest(input);
      if (!result.ok) {
        setError(result.error ?? t("genericSendError"));
        return;
      }
      setPhase("sent");
    });
  }

  if (phase === "sent") {
    return (
      <Stack gap={4} className="mx-auto max-w-2xl">
        <h1 className="font-display text-h1 font-semibold text-brand-v5-ink">{t("sentHeading")}</h1>
        <ProjectRequestConfirmationCard contactEmail={contactEmail} />
        <Button as="a" href={`/${locale}`} surface="v5" className="w-fit">
          {t("backToHome")}
        </Button>
      </Stack>
    );
  }

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));
  const projectTypeOptions = PROJECT_TYPES.map((value) => ({ value, label: t(`projectType.${value}`) }));
  const completionStandardOptions = COMPLETION_STANDARDS.map((value) => ({
    value,
    label: t(`completionStandard.${value}`),
  }));

  const stepsMeta: { label: string; icon: LucideIcon }[] = [
    { label: t("sectionContactHeading"), icon: Mail },
    { label: t("sectionAboutHeading"), icon: Building2 },
    { label: t("sectionDetailsHeading"), icon: SlidersHorizontal },
  ];

  const nextDisabled =
    isPending || (step === 0 && !contactValid) || (step === 1 && !aboutValid) || (step === 2 && !canSubmit);

  return (
    <Stack gap={5} className="mx-auto max-w-2xl">
      <Stack gap={2}>
        <h1 className="font-display text-h1 font-semibold text-brand-v5-ink">{t("heading")}</h1>
        <Text tone="muted" surface="v5" className="text-body-l" measure>
          {t("intro")}
        </Text>
      </Stack>

      <Card surface="v5" padding="lg" className="flex flex-col gap-brand-5">
        <ol className="flex items-start" aria-label={t("stepperLabel")}>
          {stepsMeta.map((meta, index) => {
            const StepIcon = meta.icon;
            const isCompleted = index < step;
            const isCurrent = index === step;
            return (
              <li key={meta.label} className="flex flex-1 flex-col items-center gap-brand-1">
                <div className="flex w-full items-center">
                  <span
                    aria-hidden="true"
                    className={`h-px flex-1 ${
                      index === 0 ? "invisible" : index <= step ? "bg-brand-v5-amber" : "bg-brand-v5-line"
                    }`}
                  />
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 ${
                      isCurrent
                        ? "border-brand-v5-amber bg-brand-v5-amber text-brand-v5-amber-foreground"
                        : isCompleted
                          ? "border-status-approved bg-status-approved/10 text-status-approved"
                          : "border-brand-v5-line text-brand-v5-muted"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    ) : (
                      <StepIcon className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-px flex-1 ${
                      index === stepsMeta.length - 1 ? "invisible" : index < step ? "bg-brand-v5-amber" : "bg-brand-v5-line"
                    }`}
                  />
                </div>
                <span
                  className={`text-center text-label uppercase tracking-[0.06em] ${
                    isCurrent ? "font-semibold text-brand-v5-ink" : "text-brand-v5-muted"
                  }`}
                >
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleWizardSubmit} noValidate className="flex flex-col gap-brand-5">
          <div aria-live="polite" className="sr-only">
            {t("stepAnnouncement", { current: step + 1, total: STEP_COUNT, label: stepsMeta[step].label })}
          </div>

          {step === 0 && (
            <Stack gap={4}>
              <StepHeading headingRef={stepHeadingRef}>{t("sectionContactHeading")}</StepHeading>
              <Stack gap={1}>
                <Label htmlFor="project-request-name" required surface="v5">
                  {t("nameLabel")}
                </Label>
                <Input
                  id="project-request-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  surface="v5"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                />
              </Stack>
              <Stack gap={1}>
                <Label htmlFor="project-request-email" required surface="v5">
                  E-mail
                </Label>
                <Input
                  id="project-request-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  surface="v5"
                  invalid={emailTouched && contactEmail.length > 0 && !emailValid}
                  aria-describedby={
                    emailTouched && contactEmail.length > 0 && !emailValid ? "project-request-email-error" : undefined
                  }
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  onBlur={() => setEmailTouched(true)}
                />
                {emailTouched && contactEmail.length > 0 && !emailValid && (
                  <p id="project-request-email-error" className="font-sans text-body text-status-blocked">
                    {t("emailInvalidError")}
                  </p>
                )}
              </Stack>
              <Stack gap={1}>
                <Label htmlFor="project-request-phone" surface="v5">
                  {t("phoneLabel")}
                </Label>
                <Input
                  id="project-request-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  surface="v5"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
              </Stack>
            </Stack>
          )}

          {step === 1 && (
            <Stack gap={4}>
              <StepHeading headingRef={stepHeadingRef}>{t("sectionAboutHeading")}</StepHeading>
              <Stack gap={1}>
                <Label id="project-request-country-label" required surface="v5">
                  {t("countryLabel")}
                </Label>
                <Select
                  value={countryCode}
                  onChange={setCountryCode}
                  options={countryOptions}
                  aria-labelledby="project-request-country-label"
                  surface="v5"
                />
              </Stack>
              <Stack gap={1}>
                <Label id="project-request-project-type-label" required surface="v5">
                  {t("projectTypeLabel")}
                </Label>
                <Select
                  value={projectType}
                  onChange={setProjectType}
                  options={projectTypeOptions}
                  aria-labelledby="project-request-project-type-label"
                  surface="v5"
                />
              </Stack>
              <fieldset className="flex flex-col gap-brand-1">
                <legend className="text-label font-medium uppercase tracking-[0.1em] text-brand-v5-muted">
                  {t("familiesLegend")}
                  <span className="text-status-blocked" aria-hidden="true">
                    {" "}
                    *
                  </span>
                </legend>
                <Stack gap={1}>
                  {PRODUCT_FAMILIES.map((family) => (
                    <div key={family} className="flex items-center gap-brand-1">
                      <Checkbox
                        id={`project-request-family-${family}`}
                        surface="v5"
                        checked={families.includes(family)}
                        onChange={() => toggleFamily(family)}
                      />
                      <Label
                        htmlFor={`project-request-family-${family}`}
                        surface="v5"
                        className="normal-case tracking-normal"
                      >
                        {tOptions(`family.${family}`)}
                      </Label>
                    </div>
                  ))}
                </Stack>
              </fieldset>
              <Stack gap={1}>
                <Label htmlFor="project-request-location" surface="v5">
                  {t("locationDetailLabel")}
                </Label>
                <Input
                  id="project-request-location"
                  surface="v5"
                  value={locationDetail}
                  onChange={(event) => setLocationDetail(event.target.value)}
                />
              </Stack>
            </Stack>
          )}

          {step === 2 && (
            <Stack gap={4}>
              <StepHeading headingRef={stepHeadingRef}>{t("sectionDetailsHeading")}</StepHeading>
              <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
                <Stack gap={1}>
                  <Label htmlFor="project-request-unit-min" required surface="v5">
                    {t("unitCountMinLabel")}
                  </Label>
                  <Input
                    id="project-request-unit-min"
                    type="number"
                    min={10}
                    step={1}
                    required
                    surface="v5"
                    value={unitCountMin}
                    onChange={(event) => setUnitCountMin(event.target.value)}
                  />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="project-request-unit-max" surface="v5">
                    {t("unitCountMaxLabel")}
                  </Label>
                  <Input
                    id="project-request-unit-max"
                    type="number"
                    min={10}
                    step={1}
                    surface="v5"
                    value={unitCountMax}
                    onChange={(event) => setUnitCountMax(event.target.value)}
                  />
                </Stack>
              </div>
              <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
                <Stack gap={1}>
                  <Label htmlFor="project-request-area-min" surface="v5">
                    {t("floorAreaMinLabel")}
                  </Label>
                  <Input
                    id="project-request-area-min"
                    type="number"
                    min={0}
                    surface="v5"
                    value={floorAreaM2Min}
                    onChange={(event) => setFloorAreaM2Min(event.target.value)}
                  />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="project-request-area-max" surface="v5">
                    {t("floorAreaMaxLabel")}
                  </Label>
                  <Input
                    id="project-request-area-max"
                    type="number"
                    min={0}
                    surface="v5"
                    value={floorAreaM2Max}
                    onChange={(event) => setFloorAreaM2Max(event.target.value)}
                  />
                </Stack>
              </div>
              <Stack gap={1}>
                <Label id="project-request-completion-standard-label" surface="v5">
                  {t("completionStandardLabel")}
                </Label>
                <Select
                  value={completionStandard}
                  onChange={setCompletionStandard}
                  options={completionStandardOptions}
                  aria-labelledby="project-request-completion-standard-label"
                  surface="v5"
                />
              </Stack>
              <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
                <Stack gap={1}>
                  <Label htmlFor="project-request-start-from" surface="v5">
                    {t("startWindowFromLabel")}
                  </Label>
                  <Input
                    id="project-request-start-from"
                    type="date"
                    surface="v5"
                    value={startWindowFrom}
                    onChange={(event) => setStartWindowFrom(event.target.value)}
                  />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="project-request-start-to" surface="v5">
                    {t("startWindowToLabel")}
                  </Label>
                  <Input
                    id="project-request-start-to"
                    type="date"
                    surface="v5"
                    value={startWindowTo}
                    onChange={(event) => setStartWindowTo(event.target.value)}
                  />
                </Stack>
              </div>
              <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
                <Stack gap={1}>
                  <Label htmlFor="project-request-delivery-from" surface="v5">
                    {t("deliveryWindowFromLabel")}
                  </Label>
                  <Input
                    id="project-request-delivery-from"
                    type="date"
                    surface="v5"
                    value={deliveryWindowFrom}
                    onChange={(event) => setDeliveryWindowFrom(event.target.value)}
                  />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="project-request-delivery-to" surface="v5">
                    {t("deliveryWindowToLabel")}
                  </Label>
                  <Input
                    id="project-request-delivery-to"
                    type="date"
                    surface="v5"
                    value={deliveryWindowTo}
                    onChange={(event) => setDeliveryWindowTo(event.target.value)}
                  />
                </Stack>
              </div>
              <Stack gap={1}>
                <Label htmlFor="project-request-extras" surface="v5">
                  {t("extrasNoteLabel")}
                </Label>
                <Textarea
                  id="project-request-extras"
                  surface="v5"
                  value={extrasNote}
                  onChange={(event) => setExtrasNote(event.target.value)}
                />
              </Stack>
              <Text tone="muted" surface="v5" className="text-data">
                {t("dataSharingNotice")}
              </Text>
              {error && (
                <p className="font-sans text-body text-status-blocked" role="alert">
                  {error}
                </p>
              )}
            </Stack>
          )}

          <div className="flex items-center justify-between gap-brand-3 border-t border-brand-v5-line pt-brand-4">
            {step > 0 ? (
              <Button type="button" variant="secondary" surface="v5" onClick={goBack}>
                {t("backStepLabel")}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={nextDisabled} surface="v5" size="lg" className="ml-auto w-fit">
              {step < 2
                ? t("nextStepLabel")
                : isPending
                  ? t("sendingLabel")
                  : error
                    ? t("retrySendLabel")
                    : t("sendLabel")}
            </Button>
          </div>
        </form>
      </Card>
    </Stack>
  );
}
