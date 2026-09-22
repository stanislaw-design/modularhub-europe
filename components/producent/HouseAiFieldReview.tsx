"use client";

import { AlertTriangle, CheckCircle2, FileSearch, Pencil, Sparkles, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { DataText, Heading, Text } from "@/components/ui";
import type { HouseAiReviewField } from "@/lib/data/fixtures/house-ai-import";
import { getHouseAiField, type HouseAiValueKind } from "@/lib/house-ai-field-catalog";
import type { HouseAiCandidate, HouseAiDecision } from "@/lib/house-ai-schemas";
import { getHouseAiIdentityKey } from "@/lib/house-ai-rules";

function formatValue(
  value: unknown,
  fieldPath: HouseAiCandidate["fieldPath"],
  locale: string,
  booleanLabels: { yes: string; no: string },
): string {
  if (typeof value === "number" && (fieldPath === "variants[].priceMinCents" || fieldPath === "variants[].priceMaxCents")) {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value / 100);
  }
  if (typeof value === "number") return new Intl.NumberFormat(locale).format(value);
  if (typeof value === "boolean") return value ? booleanLabels.yes : booleanLabels.no;
  return String(value);
}

function manualDraftFromValue(value: unknown, valueKind: HouseAiValueKind): string {
  if (valueKind === "boolean") return value === true ? "true" : value === false ? "false" : "";
  if (valueKind === "currency-cents" && typeof value === "number") return String(value / 100);
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseManualDraft(draft: string, valueKind: HouseAiValueKind): { ok: true; value: unknown } | { ok: false } {
  const trimmed = draft.trim();
  if (trimmed === "") return { ok: false };
  if (valueKind === "boolean") {
    if (trimmed !== "true" && trimmed !== "false") return { ok: false };
    return { ok: true, value: trimmed === "true" };
  }
  if (valueKind === "currency-cents") {
    const eur = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(eur)) return { ok: false };
    return { ok: true, value: Math.round(eur * 100) };
  }
  if (valueKind === "integer" || valueKind === "number") {
    const numberValue = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(numberValue)) return { ok: false };
    return { ok: true, value: numberValue };
  }
  return { ok: true, value: trimmed };
}

export function HouseAiFieldReview({
  field,
  decision,
  hasConflict,
  onInspect,
  onSelect,
  onManualValue,
  onReject,
  headingLevel = "h3",
}: {
  field: HouseAiReviewField;
  decision: HouseAiDecision | null;
  hasConflict: boolean;
  onInspect: (candidate: HouseAiCandidate) => void;
  onSelect: (candidate: HouseAiCandidate) => void;
  onManualValue: (value: unknown) => void;
  onReject: () => void;
  headingLevel?: "h3" | "h4";
}) {
  const headingId = useId();
  const locale = useLocale();
  const t = useTranslations("HouseAiFieldReview");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const fieldDefinition = getHouseAiField(field.fieldPath);
  const fieldLabel = t(`fieldLabels.${fieldDefinition.labelKey}`);
  const booleanLabels = { yes: t("yes"), no: t("no") };
  const selectedCandidateId = decision?.decisionType === "accepted" ? decision.selectedCandidateId : null;
  const manualDecision = decision && decision.decisionType === "manual" ? decision : null;
  const isRejected = decision?.decisionType === "not_applicable" || decision?.decisionType === "rejected";

  function startEditing() {
    setDraft(manualDecision ? manualDraftFromValue(manualDecision.finalValue, fieldDefinition.valueKind) : "");
    setIsEditing(true);
  }

  function submitDraft() {
    const parsed = parseManualDraft(draft, fieldDefinition.valueKind);
    if (!parsed.ok) return;
    onManualValue(parsed.value);
    setIsEditing(false);
  }

  return (
    <section aria-labelledby={headingId} className="rounded-card border border-brand-steel bg-brand-warm-white p-brand-3">
      <div className="flex flex-wrap items-start justify-between gap-brand-2">
        <div id={headingId}><Heading level={headingLevel}>{fieldLabel}</Heading></div>
        <span className="flex flex-wrap items-center gap-brand-1">
          {hasConflict && (
            <span className="inline-flex items-center gap-1 rounded-data bg-status-conditional/15 px-brand-2 py-1 text-label font-medium text-brand-foundation-navy">
              <AlertTriangle className="size-4 text-status-conditional" aria-hidden="true" /> {t("conflict")}
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1 rounded-data bg-status-blocked/15 px-brand-2 py-1 text-label font-medium text-brand-foundation-navy">
              <XCircle className="size-4 text-status-blocked" aria-hidden="true" /> {t("rejected")}
            </span>
          )}
        </span>
      </div>
      <Text as="p" tone="muted" className="mt-brand-2">{t("currentValue", { value: field.currentValue })}</Text>
      <fieldset className="mt-brand-3">
        <legend className="sr-only">{t("chooseProposal", { field: fieldLabel })}</legend>
        <div className="grid gap-brand-2">
          {field.candidates.map((candidate) => {
            const selected = selectedCandidateId === candidate.id;
            const OriginIcon = candidate.origin === "generated" ? Sparkles : FileSearch;
            return (
              <label key={candidate.id} className={`focus-within:focus-ring cursor-pointer rounded-data border p-brand-2 ${selected ? "border-brand-passage-blue bg-brand-passage-blue/10" : "border-brand-steel"}`}>
                <span className="flex items-start gap-brand-2">
                  <input className="focus-ring mt-1 size-5 accent-brand-passage-blue" type="radio" name={getHouseAiIdentityKey(candidate)} value={candidate.id} checked={selected} onChange={() => onSelect(candidate)} onFocus={() => onInspect(candidate)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-brand-1">
                      <Text as="strong">{formatValue(candidate.normalizedValue, candidate.fieldPath, locale, booleanLabels)}</Text>
                      {selected && <CheckCircle2 className="size-4 text-status-approved" aria-label={t("selected")} />}
                    </span>
                    {candidate.normalizationMetadata && (
                      <DataText tone="muted" className="mt-1">
                        {t("exchangeRateSource", {
                          amount: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(candidate.normalizationMetadata.sourceAmount)),
                          currency: candidate.normalizationMetadata.sourceCurrency,
                          rate: candidate.normalizationMetadata.rate,
                          date: new Intl.DateTimeFormat(locale).format(new Date(`${candidate.normalizationMetadata.rateDate}T00:00:00Z`)),
                        })}
                      </DataText>
                    )}
                    <span className="mt-1 flex flex-wrap gap-brand-1">
                      <span className="inline-flex items-center gap-1 rounded-data border border-brand-steel px-1 py-0.5 text-label">
                        <OriginIcon className="size-3" aria-hidden="true" /> {t(`origins.${candidate.origin}`)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-data border border-brand-steel px-1 py-0.5 text-label">
                        {candidate.confidence === "low" && <AlertTriangle className="size-3 text-status-conditional" aria-hidden="true" />}
                        {t(`confidence.${candidate.confidence}`)}
                      </span>
                    </span>
                    <button type="button" className="focus-ring mt-brand-2 min-h-11 text-left text-body text-brand-passage-blue underline" onClick={(event) => { event.preventDefault(); onInspect(candidate); }}>
                      {t("showEvidence")}
                    </button>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-brand-3 rounded-data border border-dashed border-brand-steel p-brand-2">
        {manualDecision && !isEditing && (
          <div className="flex flex-wrap items-center justify-between gap-brand-2">
            <Text as="p">
              <Text as="strong">{t("manualValueLabel")}: </Text>
              {formatValue(manualDecision.finalValue, field.fieldPath, locale, booleanLabels)}
            </Text>
            <button type="button" className="focus-ring min-h-11 inline-flex items-center gap-1 text-body text-brand-passage-blue underline" onClick={startEditing}>
              <Pencil className="size-4" aria-hidden="true" /> {t("editManually")}
            </button>
          </div>
        )}
        {!manualDecision && !isEditing && (
          <button type="button" className="focus-ring min-h-11 inline-flex items-center gap-1 text-body text-brand-passage-blue underline" onClick={startEditing}>
            <Pencil className="size-4" aria-hidden="true" /> {t("editManually")}
          </button>
        )}
        {isEditing && (
          <form
            className="grid gap-brand-2"
            onSubmit={(event) => { event.preventDefault(); submitDraft(); }}
          >
            <label className="grid gap-1">
              <Text as="span" variant="label" tone="muted">{t("manualValueLabel")}</Text>
              {fieldDefinition.valueKind === "boolean" ? (
                <select className="focus-ring rounded-data border border-brand-steel p-2" value={draft} onChange={(event) => setDraft(event.target.value)}>
                  <option value="">{t("chooseValue")}</option>
                  <option value="true">{t("yes")}</option>
                  <option value="false">{t("no")}</option>
                </select>
              ) : (
                <input
                  className="focus-ring rounded-data border border-brand-steel p-2"
                  type={fieldDefinition.valueKind === "text" || fieldDefinition.valueKind === "enum" ? "text" : "number"}
                  step={fieldDefinition.valueKind === "integer" ? 1 : "any"}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
              )}
            </label>
            <span className="flex gap-brand-2">
              <button type="submit" className="focus-ring min-h-11 rounded-data bg-brand-passage-blue px-brand-3 text-body font-medium text-brand-warm-white">{t("saveManualValue")}</button>
              <button type="button" className="focus-ring min-h-11 text-body" onClick={() => setIsEditing(false)}>{t("cancelManualEdit")}</button>
            </span>
          </form>
        )}
        <button type="button" className="focus-ring mt-brand-2 min-h-11 inline-flex items-center gap-1 text-body text-status-blocked underline" onClick={onReject}>
          <XCircle className="size-4" aria-hidden="true" /> {isRejected ? t("rejected") : t("reject")}
        </button>
      </div>
    </section>
  );
}
