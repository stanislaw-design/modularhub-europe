"use client";

import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProjectQuotePdfUploadStep } from "@/components/producent/ProjectQuotePdfUploadStep";
import { Button, Card, Heading, Input, Label, Radio, Stack, Text, Textarea } from "@/components/ui";
import { submitProjectQuote, uploadProjectQuotePdf } from "@/lib/project-quote-actions";
import {
  QUOTE_LOGISTICS_ITEMS,
  QUOTE_LOGISTICS_MODES,
  type QuoteLogisticsItem,
  type QuoteLogisticsItemInput,
  type QuoteLogisticsMode,
  type QuotePriceTaxMode,
} from "@/lib/project-quote-specs";

interface QuoteFormProps {
  projectRequestId: string;
  isRevision: boolean;
}

interface LogisticsDraft {
  mode: QuoteLogisticsMode;
  amountEur: string;
  maxAmountEur: string;
  note: string;
}

const EMPTY_LOGISTICS: LogisticsDraft = { mode: "tbd", amountEur: "", maxAmountEur: "", note: "" };

function optionalNumber(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined;
}

function optionalText(value: string): string | undefined {
  return value.trim() ? value.trim() : undefined;
}

function toLogisticsInput(draft: LogisticsDraft): QuoteLogisticsItemInput {
  return {
    mode: draft.mode,
    amountEur: draft.mode === "tbd" ? undefined : optionalNumber(draft.amountEur),
    maxAmountEur: draft.mode === "range" ? optionalNumber(draft.maxAmountEur) : undefined,
    note: optionalText(draft.note),
  };
}

// Formularz oferty na tablicy ogłoszeń w jednym, wspólnym formacie (spec 0070
// AC-11): cena, zakres, logistyka, warunki i opcjonalny PDF. Pola obowiązkowe:
// tryb ceny, cena łączna, zakres w cenie, ważność oferty. Każda pozycja
// logistyki ma tryb: kwota, widełki albo "do późniejszej wyceny" (nieznany koszt
// jest pokazany jako nieznany, nigdy jako zero).
//
// PDF oferty (spec 0063 AC-11) jest wybierany w tym samym kroku co cena, ale
// wgrywany dopiero po tym, jak submitProjectQuote zwróci quoteId:
// document.projectQuoteId wymaga, żeby wiersz project_quote już istniał (FK).
// Gdy samo wgranie PDF się nie powiedzie, oferta i tak zostaje zapisana --
// ProjectQuotePdfUploadStep zostaje pokazany jako krok do ponowienia.
export function QuoteForm({ projectRequestId, isRevision }: QuoteFormProps) {
  const t = useTranslations("QuoteForm");
  const tPdf = useTranslations("ProjectQuotePdfUploadStep");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [priceTaxMode, setPriceTaxMode] = useState<QuotePriceTaxMode>("net");
  const [vatRatePercent, setVatRatePercent] = useState("");
  const [totalPriceEur, setTotalPriceEur] = useState("");
  const [unitPriceEur, setUnitPriceEur] = useState("");
  const [scopeIncluded, setScopeIncluded] = useState("");
  const [scopeExcluded, setScopeExcluded] = useState("");
  const [logistics, setLogistics] = useState<Record<QuoteLogisticsItem, LogisticsDraft>>({
    transport: EMPTY_LOGISTICS,
    assembly: EMPTY_LOGISTICS,
    crane: EMPTY_LOGISTICS,
  });
  const [paymentPlan, setPaymentPlan] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [warrantyNote, setWarrantyNote] = useState("");
  const [proposedLeadTimeWeeks, setProposedLeadTimeWeeks] = useState("");
  const [deliveryWindowFrom, setDeliveryWindowFrom] = useState("");
  const [deliveryWindowTo, setDeliveryWindowTo] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPrice = Number(totalPriceEur) || 0;
  const canSubmit = totalPrice > 0 && scopeIncluded.trim().length > 0 && validUntil.length > 0;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    setFile(files && files.length > 0 ? files[0]! : null);
  }

  function updateLogistics(item: QuoteLogisticsItem, patch: Partial<LogisticsDraft>) {
    setLogistics((current) => ({ ...current, [item]: { ...current[item], ...patch } }));
  }

  function handleSubmit() {
    setError(null);
    setPdfError(null);
    startTransition(async () => {
      const result = await submitProjectQuote({
        projectRequestId,
        priceTaxMode,
        vatRatePercent: optionalNumber(vatRatePercent),
        totalPriceEur: totalPrice,
        unitPriceEur: optionalNumber(unitPriceEur),
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
        proposedLeadTimeWeeks: optionalNumber(proposedLeadTimeWeeks),
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
        const uploadResult = await uploadProjectQuotePdf(result.quoteId, file);
        if (!uploadResult.ok) {
          setPdfError(uploadResult.error ?? tPdf("uploadError"));
        } else {
          setUploadedFilename(file.name);
        }
      }

      setSubmitted(true);
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

        <fieldset className="flex flex-col gap-brand-3">
          <legend className="mb-brand-2 font-display text-body-l font-semibold text-brand-foundation-navy">{t("priceSection")}</legend>
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
              <Input
                id="quote-total-price"
                type="number"
                min={0}
                required
                value={totalPriceEur}
                onChange={(event) => setTotalPriceEur(event.target.value)}
              />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-unit-price">{t("unitPriceLabel")}</Label>
              <Input id="quote-unit-price" type="number" min={0} value={unitPriceEur} onChange={(event) => setUnitPriceEur(event.target.value)} />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-vat-rate">{t("vatRateLabel")}</Label>
              <Input
                id="quote-vat-rate"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={vatRatePercent}
                onChange={(event) => setVatRatePercent(event.target.value)}
              />
            </Stack>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-brand-3">
          <legend className="mb-brand-2 font-display text-body-l font-semibold text-brand-foundation-navy">{t("scopeSection")}</legend>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-scope-included" required>
              {t("scopeIncludedLabel")}
            </Label>
            <Textarea id="quote-scope-included" required value={scopeIncluded} onChange={(event) => setScopeIncluded(event.target.value)} />
          </Stack>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-scope-excluded">{t("scopeExcludedLabel")}</Label>
            <Textarea id="quote-scope-excluded" value={scopeExcluded} onChange={(event) => setScopeExcluded(event.target.value)} />
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
              <Input id="quote-valid-until" type="date" required value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-lead-time">{t("leadTimeLabel")}</Label>
              <Input
                id="quote-lead-time"
                type="number"
                min={1}
                value={proposedLeadTimeWeeks}
                onChange={(event) => setProposedLeadTimeWeeks(event.target.value)}
              />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-delivery-from">{t("deliveryWindowFromLabel")}</Label>
              <Input id="quote-delivery-from" type="date" value={deliveryWindowFrom} onChange={(event) => setDeliveryWindowFrom(event.target.value)} />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="quote-delivery-to">{t("deliveryWindowToLabel")}</Label>
              <Input id="quote-delivery-to" type="date" value={deliveryWindowTo} onChange={(event) => setDeliveryWindowTo(event.target.value)} />
            </Stack>
          </div>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-payment-plan">{t("paymentPlanLabel")}</Label>
            <Textarea id="quote-payment-plan" value={paymentPlan} onChange={(event) => setPaymentPlan(event.target.value)} />
          </Stack>
          <Stack gap={1} className="w-full">
            <Label htmlFor="quote-warranty">{t("warrantyLabel")}</Label>
            <Input id="quote-warranty" value={warrantyNote} onChange={(event) => setWarrantyNote(event.target.value)} />
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

function LogisticsRow({
  item,
  draft,
  disabled,
  onChange,
}: {
  item: QuoteLogisticsItem;
  draft: LogisticsDraft;
  disabled: boolean;
  onChange: (patch: Partial<LogisticsDraft>) => void;
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
            <Input
              id={`quote-logistics-${item}-amount`}
              type="number"
              min={0}
              value={draft.amountEur}
              onChange={(event) => onChange({ amountEur: event.target.value })}
            />
          </Stack>
          {draft.mode === "range" && (
            <Stack gap={1}>
              <Label htmlFor={`quote-logistics-${item}-max`}>{t("logisticsAmountTo")}</Label>
              <Input
                id={`quote-logistics-${item}-max`}
                type="number"
                min={0}
                value={draft.maxAmountEur}
                onChange={(event) => onChange({ maxAmountEur: event.target.value })}
              />
            </Stack>
          )}
        </div>
      )}
      <Stack gap={1}>
        <Label htmlFor={`quote-logistics-${item}-note`}>{t("logisticsNote")}</Label>
        <Input id={`quote-logistics-${item}-note`} value={draft.note} onChange={(event) => onChange({ note: event.target.value })} />
      </Stack>
    </div>
  );
}
