"use client";

import { type ChangeEvent, type ComponentProps, type ReactNode, useMemo, useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ProjectQuotePdfUploadStep } from "@/components/producent/ProjectQuotePdfUploadStep";
import { Button, Card, Heading, Input, Label, Radio, Stack, Text, Textarea } from "@/components/ui";
import type { QuoteFormInitialValues } from "@/lib/platform-quote-variants";
import { submitProjectQuote } from "@/lib/project-quote-actions";
import {
  parseEuroAmount,
  parsePlainNumber,
  QUOTE_FORM_FIELD_ORDER,
  type QuoteFormErrorCode,
  type QuoteFormFieldKey,
  validateQuoteDraft,
} from "@/lib/quote-form-validation";
import { uploadQuotePdf } from "./upload-quote-pdf";
import {
  QUOTE_LOGISTICS_ITEMS,
  QUOTE_LOGISTICS_MODES,
  type QuoteLogisticsItem,
  type QuoteLogisticsItemInput,
  type QuoteLogisticsMode,
  type QuotePriceTaxMode,
} from "@/lib/project-quote-specs";

// Dokładnie jedno z dwojga: zapytanie wolne z tablicy albo zapytanie o produkt producenta (AC-21).
// Spec 0077: `requireVariant` włącza obowiązkowe pole nazwy wariantu (projekt własny ModularHub),
// `initialValues` wypełnia formularz danymi istniejącego wariantu przy poprawianiu.
export type QuoteFormProps = {
  isRevision: boolean;
  onSubmitted?: () => void;
  requireVariant?: boolean;
  initialValues?: QuoteFormInitialValues;
} & (
  | { projectRequestId: string; bulkProductInquiryId?: undefined }
  | { bulkProductInquiryId: string; projectRequestId?: undefined }
);

interface LogisticsDraft {
  mode: QuoteLogisticsMode;
  amountEur: string;
  maxAmountEur: string;
  note: string;
}

const EMPTY_LOGISTICS: LogisticsDraft = { mode: "tbd", amountEur: "", maxAmountEur: "", note: "" };

// Pole formularza (id elementu w DOM) dla każdego klucza walidacji: lista braków
// przewija do niego i ustawia w nim kursor.
function fieldElementId(key: QuoteFormFieldKey): string {
  if (key.startsWith("logistics.")) {
    const [, item, part] = key.split(".");
    return `quote-logistics-${item}-${part}`;
  }
  const ids: Record<string, string> = {
    variantLabel: "quote-variant-label",
    totalPrice: "quote-total-price",
    unitPrice: "quote-unit-price",
    vatRate: "quote-vat-rate",
    scopeIncluded: "quote-scope-included",
    validUntil: "quote-valid-until",
    leadTime: "quote-lead-time",
    deliveryWindowTo: "quote-delivery-to",
  };
  return ids[key]!;
}

function amountValue(raw: string): number | undefined {
  const parsed = parseEuroAmount(raw);
  return parsed.ok ? parsed.value : undefined;
}

function plainNumberValue(raw: string): number | undefined {
  const parsed = parsePlainNumber(raw);
  return parsed.ok ? parsed.value : undefined;
}

function optionalText(value: string): string | undefined {
  return value.trim() ? value.trim() : undefined;
}

function toLogisticsInput(draft: LogisticsDraft): QuoteLogisticsItemInput {
  return {
    mode: draft.mode,
    amountEur: draft.mode === "tbd" ? undefined : amountValue(draft.amountEur),
    maxAmountEur: draft.mode === "range" ? amountValue(draft.maxAmountEur) : undefined,
    note: optionalText(draft.note),
  };
}

// Formularz oferty na tablicy ogłoszeń w jednym, wspólnym formacie (spec 0070
// AC-11): cena, zakres, logistyka, warunki i opcjonalny PDF. Pola obowiązkowe:
// tryb ceny, cena łączna, zakres w cenie, ważność oferty. Każda pozycja
// logistyki ma tryb: kwota, widełki albo "do późniejszej wyceny" (nieznany koszt
// jest pokazany jako nieznany, nigdy jako zero).
//
// Kwoty są zawsze w euro, wpisywane w polach tekstowych (parseEuroAmount przyjmuje
// "1 202 900", "1.202.900", "61 250,50"), bo pole liczbowe przeglądarki po cichu
// zerowało wpis z literą albo kropką tysięcy i przycisk zostawał szary bez słowa
// wyjaśnienia. Teraz źle wypełnione pole jest czerwone z komunikatem, a nad
// przyciskiem stoi lista wszystkiego, czego brakuje (validateQuoteDraft).
//
// PDF oferty (spec 0063 AC-11) jest wybierany w tym samym kroku co cena, ale
// wgrywany dopiero po tym, jak submitProjectQuote zwróci quoteId:
// document.projectQuoteId wymaga, żeby wiersz project_quote już istniał (FK).
// Gdy samo wgranie PDF się nie powiedzie, oferta i tak zostaje zapisana --
// ProjectQuotePdfUploadStep zostaje pokazany jako krok do ponowienia.
export function QuoteForm({
  projectRequestId,
  bulkProductInquiryId,
  isRevision,
  onSubmitted,
  requireVariant = false,
  initialValues,
}: QuoteFormProps) {
  const t = useTranslations("QuoteForm");
  const tPdf = useTranslations("ProjectQuotePdfUploadStep");
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [variantLabel, setVariantLabel] = useState(initialValues?.variantLabel ?? "");
  const [priceTaxMode, setPriceTaxMode] = useState<QuotePriceTaxMode>(initialValues?.priceTaxMode ?? "net");
  const [vatRatePercent, setVatRatePercent] = useState(initialValues?.vatRatePercent ?? "");
  const [totalPriceEur, setTotalPriceEur] = useState(initialValues?.totalPriceEur ?? "");
  const [unitPriceEur, setUnitPriceEur] = useState(initialValues?.unitPriceEur ?? "");
  const [scopeIncluded, setScopeIncluded] = useState(initialValues?.scopeIncluded ?? "");
  const [scopeExcluded, setScopeExcluded] = useState(initialValues?.scopeExcluded ?? "");
  const [logistics, setLogistics] = useState<Record<QuoteLogisticsItem, LogisticsDraft>>(
    initialValues?.logistics ?? {
      transport: EMPTY_LOGISTICS,
      assembly: EMPTY_LOGISTICS,
      crane: EMPTY_LOGISTICS,
    },
  );
  const [paymentPlan, setPaymentPlan] = useState(initialValues?.paymentPlan ?? "");
  const [validUntil, setValidUntil] = useState(initialValues?.validUntil ?? "");
  const [warrantyNote, setWarrantyNote] = useState(initialValues?.warrantyNote ?? "");
  const [proposedLeadTimeWeeks, setProposedLeadTimeWeeks] = useState(initialValues?.proposedLeadTimeWeeks ?? "");
  const [deliveryWindowFrom, setDeliveryWindowFrom] = useState(initialValues?.deliveryWindowFrom ?? "");
  const [deliveryWindowTo, setDeliveryWindowTo] = useState(initialValues?.deliveryWindowTo ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState<ReadonlySet<QuoteFormFieldKey>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const errors = useMemo(
    () =>
      validateQuoteDraft({
        requireVariant,
        variantLabel,
        totalPriceEur,
        unitPriceEur,
        vatRatePercent,
        scopeIncluded,
        logistics,
        validUntil,
        proposedLeadTimeWeeks,
        deliveryWindowFrom,
        deliveryWindowTo,
      }),
    [
      requireVariant,
      variantLabel,
      totalPriceEur,
      unitPriceEur,
      vatRatePercent,
      scopeIncluded,
      logistics,
      validUntil,
      proposedLeadTimeWeeks,
      deliveryWindowFrom,
      deliveryWindowTo,
    ],
  );
  const missingFields = QUOTE_FORM_FIELD_ORDER.filter((key) => errors[key]);
  const canSubmit = missingFields.length === 0;
  const amountFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);

  function markTouched(key: QuoteFormFieldKey) {
    setTouched((current) => (current.has(key) ? current : new Set(current).add(key)));
  }

  // Brak w polu obowiązkowym robi się czerwony dopiero po wyjściu z pola (żeby
  // pusty formularz nie był cały czerwony od startu); zły format od razu.
  function visibleError(key: QuoteFormFieldKey): QuoteFormErrorCode | undefined {
    const code = errors[key];
    if (!code) return undefined;
    return code === "required" && !touched.has(key) ? undefined : code;
  }

  function fieldLabel(key: QuoteFormFieldKey): string {
    if (key.startsWith("logistics.")) {
      const [, item, part] = key.split(".") as [string, QuoteLogisticsItem, "amount" | "max"];
      const mode = logistics[item].mode;
      const partLabel = part === "max" ? t("logisticsAmountTo") : mode === "range" ? t("logisticsAmountFrom") : t("logisticsAmount");
      return `${t(`logisticsItem.${item}`)}, ${partLabel}`;
    }
    const labels: Record<string, string> = {
      variantLabel: t("variantLabel"),
      totalPrice: t("totalPriceLabel"),
      unitPrice: t("unitPriceLabel"),
      vatRate: t("vatRateLabel"),
      scopeIncluded: t("scopeIncludedLabel"),
      validUntil: t("validUntilLabel"),
      leadTime: t("leadTimeLabel"),
      deliveryWindowTo: t("deliveryWindowToLabel"),
    };
    return labels[key]!;
  }

  function focusField(key: QuoteFormFieldKey) {
    markTouched(key);
    const element = document.getElementById(fieldElementId(key));
    element?.focus();
  }

  // Wspólne atrybuty pola z walidacją: czerwona ramka, aria-invalid i powiązany komunikat.
  function validationProps(key: QuoteFormFieldKey) {
    const code = visibleError(key);
    return {
      invalid: Boolean(code),
      "aria-describedby": code ? `${fieldElementId(key)}-error` : undefined,
      onBlur: () => markTouched(key),
    };
  }

  function fieldError(key: QuoteFormFieldKey): ReactNode {
    const code = visibleError(key);
    if (!code) return null;
    return (
      <p id={`${fieldElementId(key)}-error`} className="font-sans text-label text-status-blocked">
        {t(`errors.${code}`)}
      </p>
    );
  }

  // Podgląd, jak odczytaliśmy kwotę z separatorami ("1.202.900" -> 1 202 900), żeby
  // producent widział, że kropka tysięcy nie zamieniła się w ułamek.
  function amountReadAs(raw: string): ReactNode {
    if (!/[\s.,]/.test(raw.trim())) return null;
    const parsed = parseEuroAmount(raw);
    if (!parsed.ok || parsed.value === undefined) return null;
    return (
      <Text as="span" variant="label" tone="muted">
        {t("amountReadAs", { amount: amountFormatter.format(parsed.value) })}
      </Text>
    );
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    setFile(files && files.length > 0 ? files[0]! : null);
  }

  function updateLogistics(item: QuoteLogisticsItem, patch: Partial<LogisticsDraft>) {
    setLogistics((current) => ({ ...current, [item]: { ...current[item], ...patch } }));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setPdfError(null);
    startTransition(async () => {
      const result = await submitProjectQuote({
        ...(projectRequestId ? { projectRequestId } : { bulkProductInquiryId }),
        ...(requireVariant ? { variantLabel: variantLabel.trim() } : {}),
        priceTaxMode,
        vatRatePercent: plainNumberValue(vatRatePercent),
        totalPriceEur: amountValue(totalPriceEur) ?? 0,
        unitPriceEur: amountValue(unitPriceEur),
        scopeIncluded: scopeIncluded.trim(),
        scopeExcluded: optionalText(scopeExcluded),
        logistics: {
          transport: toLogisticsInput(logistics.transport),
          assembly: toLogisticsInput(logistics.assembly),
          crane: toLogisticsInput(logistics.crane),
        },
        paymentPlan: optionalText(paymentPlan),
        validUntil,
        warrantyNote: optionalText(warrantyNote),
        proposedLeadTimeWeeks: plainNumberValue(proposedLeadTimeWeeks),
        deliveryWindowFrom: deliveryWindowFrom || undefined,
        deliveryWindowTo: deliveryWindowTo || undefined,
        notes: optionalText(notes),
      });
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        return;
      }
      setQuoteId(result.quoteId ?? null);

      if (result.quoteId && file) {
        const uploadResult = await uploadQuotePdf(result.quoteId, file);
        if (!uploadResult.ok) {
          setPdfError(tPdf(`errors.${uploadResult.errorCode}`));
        } else {
          setUploadedFilename(file.name);
        }
      }

      setSubmitted(true);
      onSubmitted?.();
    });
  }

  if (submitted) {
    return (
      <Card as="div" padding="md">
        <Stack gap={3} align="start">
          <Text className="font-medium text-status-approved">{t("submittedMessage")}</Text>
          {pdfError && (
            <p className="font-sans text-body text-status-blocked" role="alert">
              {pdfError}
            </p>
          )}
          {quoteId && <ProjectQuotePdfUploadStep quoteId={quoteId} initialFilename={uploadedFilename} />}
        </Stack>
      </Card>
    );
  }

  return (
    <Card as="div" padding="md">
      <Stack gap={4}>
        <Stack gap={1}>
          <Heading level="h3">{t("heading")}</Heading>
          <Text tone="muted">{isRevision ? t("revisionIntro") : t("intro")}</Text>
        </Stack>

        {requireVariant && (
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-variant-label" required>
              {t("variantLabel")}
            </Label>
            <Input
              id="quote-variant-label"
              maxLength={60}
              required
              value={variantLabel}
              onChange={(event) => setVariantLabel(event.target.value)}
              {...validationProps("variantLabel")}
            />
            {fieldError("variantLabel")}
            <Text as="span" variant="label" tone="muted">
              {t("variantHint")}
            </Text>
          </Stack>
        )}

        <fieldset className="flex flex-col gap-brand-3">
          <legend className="mb-brand-2 font-display text-body-l font-semibold text-brand-foundation-navy">{t("priceSection")}</legend>
          <Text tone="muted">{t("priceHint")}</Text>
          <div role="radiogroup" aria-label={t("priceTaxModeLabel")} className="flex flex-wrap items-center gap-x-brand-4 gap-y-brand-2">
            <Text as="span" variant="label" tone="muted">
              {t("priceTaxModeLabel")}
            </Text>
            {(["net", "gross"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-brand-2 text-body">
                <Radio
                  name="quote-price-tax-mode"
                  value={mode}
                  checked={priceTaxMode === mode}
                  onChange={() => setPriceTaxMode(mode)}
                  disabled={isPending}
                />
                {t(mode === "net" ? "priceTaxModeNet" : "priceTaxModeGross")}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Stack gap={1}>
              <Label htmlFor="quote-total-price" required>
                {t("totalPriceLabel")}
              </Label>
              <EuroInput
                id="quote-total-price"
                required
                placeholder={t("totalPricePlaceholder")}
                value={totalPriceEur}
                onChange={(event) => setTotalPriceEur(event.target.value)}
                {...validationProps("totalPrice")}
              />
              {fieldError("totalPrice") ?? amountReadAs(totalPriceEur)}
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-unit-price">{t("unitPriceLabel")}</Label>
              <EuroInput
                id="quote-unit-price"
                value={unitPriceEur}
                onChange={(event) => setUnitPriceEur(event.target.value)}
                {...validationProps("unitPrice")}
              />
              {fieldError("unitPrice") ?? amountReadAs(unitPriceEur)}
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-vat-rate">{t("vatRateLabel")}</Label>
              <Input
                id="quote-vat-rate"
                inputMode="decimal"
                autoComplete="off"
                value={vatRatePercent}
                onChange={(event) => setVatRatePercent(event.target.value)}
                {...validationProps("vatRate")}
              />
              {fieldError("vatRate")}
            </Stack>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-brand-3">
          <legend className="mb-brand-2 font-display text-body-l font-semibold text-brand-foundation-navy">{t("scopeSection")}</legend>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-scope-included" required>
              {t("scopeIncludedLabel")}
            </Label>
            <Textarea
              id="quote-scope-included"
              required
              maxLength={5000}
              value={scopeIncluded}
              onChange={(event) => setScopeIncluded(event.target.value)}
              {...validationProps("scopeIncluded")}
            />
            {fieldError("scopeIncluded")}
          </Stack>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-scope-excluded">{t("scopeExcludedLabel")}</Label>
            <Textarea id="quote-scope-excluded" maxLength={5000} value={scopeExcluded} onChange={(event) => setScopeExcluded(event.target.value)} />
          </Stack>
        </fieldset>

        <fieldset className="flex flex-col gap-brand-3">
          <legend className="mb-brand-2 font-display text-body-l font-semibold text-brand-foundation-navy">{t("logisticsSection")}</legend>
          <Text tone="muted">{t("logisticsHint")}</Text>
          {QUOTE_LOGISTICS_ITEMS.map((item) => (
            <LogisticsRow
              key={item}
              item={item}
              draft={logistics[item]}
              disabled={isPending}
              onChange={(patch) => updateLogistics(item, patch)}
              amountProps={validationProps(`logistics.${item}.amount`)}
              maxProps={validationProps(`logistics.${item}.max`)}
              amountError={fieldError(`logistics.${item}.amount`)}
              maxError={fieldError(`logistics.${item}.max`)}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-brand-3">
          <legend className="mb-brand-2 font-display text-body-l font-semibold text-brand-foundation-navy">{t("termsSection")}</legend>
          <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Stack gap={1}>
              <Label htmlFor="quote-valid-until" required>
                {t("validUntilLabel")}
              </Label>
              <Input
                id="quote-valid-until"
                type="date"
                required
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
                {...validationProps("validUntil")}
              />
              {fieldError("validUntil")}
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-lead-time">{t("leadTimeLabel")}</Label>
              <Input
                id="quote-lead-time"
                inputMode="numeric"
                autoComplete="off"
                value={proposedLeadTimeWeeks}
                onChange={(event) => setProposedLeadTimeWeeks(event.target.value)}
                {...validationProps("leadTime")}
              />
              {fieldError("leadTime")}
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-delivery-from">{t("deliveryWindowFromLabel")}</Label>
              <Input id="quote-delivery-from" type="date" value={deliveryWindowFrom} onChange={(event) => setDeliveryWindowFrom(event.target.value)} />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-delivery-to">{t("deliveryWindowToLabel")}</Label>
              <Input
                id="quote-delivery-to"
                type="date"
                value={deliveryWindowTo}
                onChange={(event) => setDeliveryWindowTo(event.target.value)}
                {...validationProps("deliveryWindowTo")}
              />
              {fieldError("deliveryWindowTo")}
            </Stack>
          </div>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-payment-plan">{t("paymentPlanLabel")}</Label>
            <Textarea id="quote-payment-plan" maxLength={5000} value={paymentPlan} onChange={(event) => setPaymentPlan(event.target.value)} />
          </Stack>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-warranty">{t("warrantyLabel")}</Label>
            <Input id="quote-warranty" maxLength={500} value={warrantyNote} onChange={(event) => setWarrantyNote(event.target.value)} />
          </Stack>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-notes">{t("notesLabel")}</Label>
            <Textarea id="quote-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Stack>
        </fieldset>

        <Stack gap={1} className="w-full">
          <Label htmlFor="quote-pdf-file">{tPdf("label")}</Label>
          <div className="flex items-center gap-brand-2">
            <input
              ref={fileInputRef}
              id="quote-pdf-file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="sr-only"
              disabled={isPending}
            />
            <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" aria-hidden="true" />
              {file ? tPdf("replaceFile") : tPdf("chooseFile")}
            </Button>
            <Text as="span" variant="label" tone="muted" className="min-w-0 flex-1 truncate">
              {file ? file.name : tPdf("hint")}
            </Text>
          </div>
        </Stack>

        {missingFields.length > 0 && (
          <div
            role="region"
            aria-label={t("missingHeading")}
            className="flex flex-col gap-brand-2 rounded-card border border-status-blocked/40 bg-status-blocked/5 p-brand-3"
          >
            <Text as="p" className="font-medium text-brand-foundation-navy">
              {t("missingHeading")}
            </Text>
            <ul className="flex list-disc flex-col gap-brand-1 pl-brand-4">
              {missingFields.map((key) => (
                <li key={key} className="text-body text-status-blocked">
                  <button
                    type="button"
                    onClick={() => focusField(key)}
                    className="focus-ring rounded-data text-left underline-offset-2 hover:underline"
                  >
                    {`${fieldLabel(key)}: ${t(`errors.${errors[key]!}`)}`}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {error}
          </p>
        )}
        <Button type="button" onClick={handleSubmit} disabled={isPending || !canSubmit} className="w-full">
          {isPending ? t("submitting") : isRevision ? t("submitRevision") : t("submitQuote")}
        </Button>
      </Stack>
    </Card>
  );
}

type EuroInputProps = Omit<ComponentProps<typeof Input>, "type" | "inputMode">;

// Pole kwoty w euro: zwykłe pole tekstowe (nie type="number", które po cichu
// zerowało "1.202.900" albo wpis z literą) z dopiskiem "EUR" po prawej stronie.
function EuroInput({ className, ...props }: EuroInputProps) {
  return (
    <div className="relative">
      <Input type="text" inputMode="decimal" autoComplete="off" className={`pr-12 ${className ?? ""}`} {...props} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-brand-2 flex items-center text-label font-medium text-brand-technical-graphite"
      >
        EUR
      </span>
    </div>
  );
}

interface FieldValidationProps {
  invalid: boolean;
  "aria-describedby": string | undefined;
  onBlur: () => void;
}

function LogisticsRow({
  item,
  draft,
  disabled,
  onChange,
  amountProps,
  maxProps,
  amountError,
  maxError,
}: {
  item: QuoteLogisticsItem;
  draft: LogisticsDraft;
  disabled: boolean;
  onChange: (patch: Partial<LogisticsDraft>) => void;
  amountProps: FieldValidationProps;
  maxProps: FieldValidationProps;
  amountError: ReactNode;
  maxError: ReactNode;
}) {
  const t = useTranslations("QuoteForm");
  const itemLabel = t(`logisticsItem.${item}`);
  const modeLabels: Record<QuoteLogisticsMode, string> = {
    amount: t("logisticsModeAmount"),
    range: t("logisticsModeRange"),
    tbd: t("logisticsModeTbd"),
  };

  return (
    <div role="group" aria-label={itemLabel} className="flex flex-col gap-brand-2 rounded-card border border-brand-steel p-brand-3">
      <Text as="span" className="font-medium">
        {itemLabel}
      </Text>
      <div className="flex flex-wrap gap-x-brand-4 gap-y-brand-2">
        {QUOTE_LOGISTICS_MODES.map((mode) => (
          <label key={mode} className="flex items-center gap-brand-2 text-body">
            <Radio
              name={`quote-logistics-${item}`}
              value={mode}
              checked={draft.mode === mode}
              onChange={() => onChange({ mode })}
              disabled={disabled}
              aria-label={`${itemLabel}: ${modeLabels[mode]}`}
            />
            {modeLabels[mode]}
          </label>
        ))}
      </div>
      {draft.mode !== "tbd" && (
        <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
          <Stack gap={1}>
            <Label htmlFor={`quote-logistics-${item}-amount`}>
              {draft.mode === "range" ? t("logisticsAmountFrom") : t("logisticsAmount")}
            </Label>
            <EuroInput
              id={`quote-logistics-${item}-amount`}
              value={draft.amountEur}
              onChange={(event) => onChange({ amountEur: event.target.value })}
              {...amountProps}
            />
            {amountError}
          </Stack>
          {draft.mode === "range" && (
            <Stack gap={1}>
              <Label htmlFor={`quote-logistics-${item}-max`}>{t("logisticsAmountTo")}</Label>
              <EuroInput
                id={`quote-logistics-${item}-max`}
                value={draft.maxAmountEur}
                onChange={(event) => onChange({ maxAmountEur: event.target.value })}
                {...maxProps}
              />
              {maxError}
            </Stack>
          )}
        </div>
      )}
      <Stack gap={1}>
        <Label htmlFor={`quote-logistics-${item}-note`}>{t("logisticsNote")}</Label>
        <Input
          id={`quote-logistics-${item}-note`}
          maxLength={500}
          value={draft.note}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </Stack>
    </div>
  );
}
