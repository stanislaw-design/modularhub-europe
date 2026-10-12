"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Checkbox, Input, Label, Stack, Text, Textarea } from "@/components/ui";
import type { ProducerCapacityProfileForPanel } from "@/lib/db/queries";
import { COMPLETION_STANDARDS } from "@/lib/producer-capacity-profile-specs";
import { submitCapacityProfileForReview, updateProducerCapacityProfile } from "@/lib/project-quote-actions";

interface CapacityProfileFormProps {
  profile: ProducerCapacityProfileForPanel;
  countries: { code: string; name: string }[];
}

interface TierRow {
  units: string;
  weeks: string;
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

// Formularz profilu zdolności produkcyjnej (spec 0070 część A, AC-5). Zapis i
// wysłanie do weryfikacji to dwa osobne przyciski: zapis nie zmienia statusu
// (spec 0037), dopiero "Wyślij do weryfikacji" przenosi not_submitted lub
// rejected na pending. Po zatwierdzeniu edycja nie cofa statusu.
export function CapacityProfileForm({ profile, countries }: CapacityProfileFormProps) {
  const t = useTranslations("ProducerPanelCapacityPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [unitsPerMonth, setUnitsPerMonth] = useState(profile.unitsPerMonth?.toString() ?? "");
  const [productionLines, setProductionLines] = useState(profile.productionLines?.toString() ?? "");
  const [maxModuleSizeM2, setMaxModuleSizeM2] = useState(profile.maxModuleSizeM2?.toString() ?? "");
  const [tiers, setTiers] = useState<TierRow[]>(
    profile.leadTimeTiers.map((tier) => ({ units: String(tier.units), weeks: String(tier.weeks) })),
  );
  const [standards, setStandards] = useState<Set<string>>(new Set(profile.completionStandardsSupported));
  const [countryCodes, setCountryCodes] = useState<Set<string>>(new Set(profile.deliveryCountryCodes));
  const [canCustomize, setCanCustomize] = useState(profile.canCustomizeClientDesign);
  const [customizationNote, setCustomizationNote] = useState(profile.customizationNote ?? "");
  const [canHandleTransport, setCanHandleTransport] = useState(profile.canHandleTransport);
  const [canHandleAssembly, setCanHandleAssembly] = useState(profile.canHandleAssembly);
  const [capabilityNote, setCapabilityNote] = useState(profile.capabilityNote ?? "");
  const [references, setReferences] = useState(profile.pastProjectReferences.join("\n"));

  const status = profile.volumeVerificationStatus;
  const canSubmit = status === "not_submitted" || status === "rejected";

  function toggleIn(setter: (updater: (current: Set<string>) => Set<string>) => void, value: string) {
    setMessage(null);
    setter((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function buildInput() {
    return {
      unitsPerMonth: toOptionalNumber(unitsPerMonth),
      productionLines: toOptionalNumber(productionLines),
      maxModuleSizeM2: toOptionalNumber(maxModuleSizeM2),
      leadTimeTiers: tiers
        .filter((tier) => tier.units.trim() !== "" || tier.weeks.trim() !== "")
        .map((tier) => ({ units: Number(tier.units), weeks: Number(tier.weeks) })),
      completionStandardsSupported: COMPLETION_STANDARDS.filter((standard) => standards.has(standard)),
      canCustomizeClientDesign: canCustomize,
      customizationNote: customizationNote.trim() || undefined,
      canHandleTransport,
      canHandleAssembly,
      capabilityNote: capabilityNote.trim() || undefined,
      pastProjectReferences: references
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== ""),
      deliveryCountryCodes: [...countryCodes],
    };
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProducerCapacityProfile(buildInput());
      if (!result.ok) {
        setMessage({ ok: false, text: result.error ?? t("saveError") });
        return;
      }
      setMessage({ ok: true, text: t("saved") });
      router.refresh();
    });
  }

  function handleSubmitForReview() {
    setMessage(null);
    const units = toOptionalNumber(unitsPerMonth);
    if (units === undefined || !Number.isInteger(units) || units <= 0) {
      setMessage({ ok: false, text: t("unitsRequired") });
      return;
    }
    startTransition(async () => {
      const saved = await updateProducerCapacityProfile(buildInput());
      if (!saved.ok) {
        setMessage({ ok: false, text: saved.error ?? t("saveError") });
        return;
      }
      const result = await submitCapacityProfileForReview();
      if (!result.ok) {
        setMessage({ ok: false, text: result.error ?? t("submitError") });
        return;
      }
      setMessage({ ok: true, text: t("submitted") });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      <Stack gap={5}>
        <p role="status" className="text-body font-medium text-brand-technical-graphite">
          {t(`status.${status}`)}
        </p>

        <fieldset className="flex flex-col gap-brand-2">
          <legend className="text-h3 font-semibold">{t("deliveryCountriesHeading")}</legend>
          <Text tone="muted">{t("deliveryCountriesHelp")}</Text>
          <div className="flex flex-wrap gap-x-brand-4 gap-y-brand-1">
            {countries.map((item) => (
              <CheckboxField
                key={item.code}
                label={item.name}
                checked={countryCodes.has(item.code)}
                onChange={() => toggleIn(setCountryCodes, item.code)}
              />
            ))}
          </div>
        </fieldset>

        <Stack gap={1}>
          <Label htmlFor="cap-units" required>
            {t("unitsPerMonth")}
          </Label>
          <Input
            id="cap-units"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            aria-describedby="cap-units-help"
            className="max-w-xs [color-scheme:dark]"
            value={unitsPerMonth}
            onKeyDown={(e) => {
              if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
            }}
            onChange={(e) => setUnitsPerMonth(e.target.value.replace(/\D/g, ""))}
          />
          <p id="cap-units-help" className="text-body text-brand-technical-graphite">
            {t("unitsPerMonthHelp")}
          </p>
        </Stack>

        <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
          <Stack gap={1}>
            <Label htmlFor="cap-lines">{t("productionLines")}</Label>
            <Input id="cap-lines" inputMode="numeric" value={productionLines} onChange={(e) => setProductionLines(e.target.value)} />
          </Stack>
          <Stack gap={1}>
            <Label htmlFor="cap-module">{t("maxModuleSizeM2")}</Label>
            <Input id="cap-module" inputMode="decimal" value={maxModuleSizeM2} onChange={(e) => setMaxModuleSizeM2(e.target.value)} />
          </Stack>
        </div>

        <fieldset className="flex flex-col gap-brand-2">
          <legend className="text-h3 font-semibold">{t("leadTimeHeading")}</legend>
          <Text tone="muted">{t("leadTimeHelp")}</Text>
          {tiers.map((tier, index) => (
            <div key={index} className="flex items-end gap-brand-2">
              <Stack gap={1}>
                <Label htmlFor={`tier-units-${index}`}>{t("tierUnits")}</Label>
                <Input
                  id={`tier-units-${index}`}
                  inputMode="numeric"
                  value={tier.units}
                  onChange={(e) => setTiers((rows) => rows.map((row, i) => (i === index ? { ...row, units: e.target.value } : row)))}
                />
              </Stack>
              <Stack gap={1}>
                <Label htmlFor={`tier-weeks-${index}`}>{t("tierWeeks")}</Label>
                <Input
                  id={`tier-weeks-${index}`}
                  inputMode="numeric"
                  value={tier.weeks}
                  onChange={(e) => setTiers((rows) => rows.map((row, i) => (i === index ? { ...row, weeks: e.target.value } : row)))}
                />
              </Stack>
              <Button type="button" surface="v5" size="sm" onClick={() => setTiers((rows) => rows.filter((_, i) => i !== index))}>
                {t("removeTier")}
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" surface="v5" size="sm" onClick={() => setTiers((rows) => [...rows, { units: "", weeks: "" }])}>
              {t("addTier")}
            </Button>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-brand-2">
          <legend className="text-h3 font-semibold">{t("standardsHeading")}</legend>
          <div className="flex flex-wrap gap-x-brand-4 gap-y-brand-1">
            {COMPLETION_STANDARDS.map((standard) => (
              <CheckboxField
                key={standard}
                label={t(`standards.${standard}`)}
                checked={standards.has(standard)}
                onChange={() => toggleIn(setStandards, standard)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-brand-2">
          <legend className="text-h3 font-semibold">{t("servicesHeading")}</legend>
          <CheckboxField label={t("canHandleTransport")} checked={canHandleTransport} onChange={() => setCanHandleTransport((v) => !v)} />
          <CheckboxField label={t("canHandleAssembly")} checked={canHandleAssembly} onChange={() => setCanHandleAssembly((v) => !v)} />
          <CheckboxField label={t("canCustomize")} checked={canCustomize} onChange={() => setCanCustomize((v) => !v)} />
          {canCustomize && (
            <Stack gap={1}>
              <Label htmlFor="cap-customization">{t("customizationNote")}</Label>
              <Textarea id="cap-customization" value={customizationNote} onChange={(e) => setCustomizationNote(e.target.value)} rows={3} />
            </Stack>
          )}
        </fieldset>

        <Stack gap={1}>
          <Label htmlFor="cap-note">{t("capabilityNote")}</Label>
          <Textarea id="cap-note" value={capabilityNote} onChange={(e) => setCapabilityNote(e.target.value)} rows={4} />
        </Stack>

        <Stack gap={1}>
          <Label htmlFor="cap-references">{t("references")}</Label>
          <Textarea id="cap-references" value={references} onChange={(e) => setReferences(e.target.value)} rows={4} />
          <Text tone="muted">{t("referencesHelp")}</Text>
        </Stack>

        <div className="flex flex-wrap items-center gap-brand-3">
          <Button type="submit" surface="v5" disabled={isPending}>
            {t("save")}
          </Button>
          {canSubmit && (
            <Button type="button" surface="v5" disabled={isPending} onClick={handleSubmitForReview}>
              {t("submitForReview")}
            </Button>
          )}
          {message && (
            <span role="status" className={message.ok ? "text-status-approved" : "text-status-blocked"}>
              {message.text}
            </span>
          )}
        </div>
      </Stack>
    </form>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-brand-2 text-body">
      <Checkbox surface="v5" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
