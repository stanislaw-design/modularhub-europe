import { useTranslations } from "next-intl";
import { Heading, Input, Label, Select, Stack } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { getCompletionStandardOptions } from "@/lib/producer-project-draft";

interface ProjectWizardPricingStepProps {
  draft: ProjectDraft;
  showValidation: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

export function ProjectWizardPricingStep({ draft, showValidation, onChange }: ProjectWizardPricingStepProps) {
  const t = useTranslations("ProjectWizardPricingStep");
  const tOptions = useTranslations("ProjectOptions");
  const priceInvalid =
    showValidation &&
    (draft.housePriceMinEur === null ||
      draft.housePriceMaxEur === null ||
      draft.housePriceMinEur > draft.housePriceMaxEur);
  const standardInvalid = showValidation && draft.completionStandard === null;
  const leadTimeInvalid =
    showValidation &&
    (draft.productionLeadTimeWeeksMin === null ||
      draft.productionLeadTimeWeeksMax === null ||
      draft.productionLeadTimeWeeksMin > draft.productionLeadTimeWeeksMax);
  const assemblyTimeInvalid =
    showValidation &&
    (draft.onSiteAssemblyDaysMin === null ||
      draft.onSiteAssemblyDaysMax === null ||
      draft.onSiteAssemblyDaysMin > draft.onSiteAssemblyDaysMax);
  const warrantyInvalid =
    showValidation &&
    (draft.structuralWarrantyYears === null ||
      !Number.isInteger(draft.structuralWarrantyYears) ||
      draft.structuralWarrantyYears < 0);

  return (
    <Stack gap={3}>
      <Heading level="h2">{t("heading")}</Heading>
      <Stack gap={1}>
        <Label id="wizard-price-label" required>
          {t("priceLabel")}
        </Label>
        <Stack direction="row" gap={3} className="flex-wrap">
          <Stack gap={1} className="min-w-40 flex-1">
            <Input
              type="number"
              min={0}
              required
              aria-label={t("priceFromAriaLabel")}
              invalid={priceInvalid}
              aria-describedby={priceInvalid ? "wizard-price-error" : undefined}
              value={draft.housePriceMinEur ?? ""}
              onChange={(event) =>
                onChange({
                  housePriceMinEur: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          </Stack>
          <Stack gap={1} className="min-w-40 flex-1">
            <Input
              type="number"
              min={0}
              required
              aria-label={t("priceToAriaLabel")}
              invalid={priceInvalid}
              aria-describedby={priceInvalid ? "wizard-price-error" : undefined}
              value={draft.housePriceMaxEur ?? ""}
              onChange={(event) =>
                onChange({
                  housePriceMaxEur: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          </Stack>
        </Stack>
        {priceInvalid && (
          <p id="wizard-price-error" className="font-sans text-body text-status-blocked">
            {t("priceRequiredError")}
          </p>
        )}
      </Stack>
      <Stack gap={1}>
        <Label id="wizard-standard-label" required>
          {t("standardLabel")}
        </Label>
        <Select
          value={draft.completionStandard}
          onChange={(value) => onChange({ completionStandard: value })}
          options={getCompletionStandardOptions(tOptions)}
          invalid={standardInvalid}
          aria-labelledby="wizard-standard-label"
        />
        {standardInvalid && (
          <p className="font-sans text-body text-status-blocked">{t("standardRequiredError")}</p>
        )}
      </Stack>
      <Stack direction="row" gap={3} className="flex-wrap">
        <Stack gap={1} className="min-w-56 flex-1">
          <Label id="wizard-lead-time-label" required>
            {t("leadTimeLabel")}
          </Label>
          <Stack direction="row" gap={2}>
            <Input
              type="number"
              min={0}
              required
              aria-label={t("leadTimeFromAriaLabel")}
              invalid={leadTimeInvalid}
              aria-describedby={leadTimeInvalid ? "wizard-lead-time-error" : undefined}
              value={draft.productionLeadTimeWeeksMin ?? ""}
              onChange={(event) =>
                onChange({
                  productionLeadTimeWeeksMin: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
            <Input
              type="number"
              min={0}
              required
              aria-label={t("leadTimeToAriaLabel")}
              invalid={leadTimeInvalid}
              aria-describedby={leadTimeInvalid ? "wizard-lead-time-error" : undefined}
              value={draft.productionLeadTimeWeeksMax ?? ""}
              onChange={(event) =>
                onChange({
                  productionLeadTimeWeeksMax: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          </Stack>
          {leadTimeInvalid && (
            <p id="wizard-lead-time-error" className="font-sans text-body text-status-blocked">
              {t("leadTimeRequiredError")}
            </p>
          )}
        </Stack>
        <Stack gap={1} className="min-w-56 flex-1">
          <Label id="wizard-assembly-time-label" required>
            {t("assemblyTimeLabel")}
          </Label>
          <Stack direction="row" gap={2}>
            <Input
              type="number"
              min={0}
              required
              aria-label={t("assemblyTimeFromAriaLabel")}
              invalid={assemblyTimeInvalid}
              aria-describedby={assemblyTimeInvalid ? "wizard-assembly-time-error" : undefined}
              value={draft.onSiteAssemblyDaysMin ?? ""}
              onChange={(event) =>
                onChange({
                  onSiteAssemblyDaysMin: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
            <Input
              type="number"
              min={0}
              required
              aria-label={t("assemblyTimeToAriaLabel")}
              invalid={assemblyTimeInvalid}
              aria-describedby={assemblyTimeInvalid ? "wizard-assembly-time-error" : undefined}
              value={draft.onSiteAssemblyDaysMax ?? ""}
              onChange={(event) =>
                onChange({
                  onSiteAssemblyDaysMax: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          </Stack>
          {assemblyTimeInvalid && (
            <p id="wizard-assembly-time-error" className="font-sans text-body text-status-blocked">
              {t("assemblyTimeRequiredError")}
            </p>
          )}
        </Stack>
      </Stack>
      <Stack direction="row" gap={3} className="flex-wrap">
        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor="wizard-warranty" required>
            {t("warrantyLabel")}
          </Label>
          <Input
            id="wizard-warranty"
            type="number"
            min={0}
            required
            invalid={warrantyInvalid}
            aria-describedby={warrantyInvalid ? "wizard-warranty-error" : undefined}
            value={draft.structuralWarrantyYears ?? ""}
            onChange={(event) =>
              onChange({
                structuralWarrantyYears: event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
          {warrantyInvalid && (
            <p id="wizard-warranty-error" className="font-sans text-body text-status-blocked">
              {t("warrantyRequiredError")}
            </p>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
