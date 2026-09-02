import { Heading, Input, Label, Select, Stack } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { COMPLETION_STANDARD_OPTIONS } from "@/lib/producer-project-draft";

interface ProjectWizardPricingStepProps {
  draft: ProjectDraft;
  showValidation: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

export function ProjectWizardPricingStep({ draft, showValidation, onChange }: ProjectWizardPricingStepProps) {
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
      <Heading level="h2">Cena i sprzedaż</Heading>
      <Stack gap={1}>
        <Label id="wizard-price-label" required>
          Cena domu w standardzie bazowym (EUR)
        </Label>
        <Stack direction="row" gap={3} className="flex-wrap">
          <Stack gap={1} className="min-w-40 flex-1">
            <Input
              type="number"
              min={0}
              required
              aria-label="Cena domu, od (EUR)"
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
              aria-label="Cena domu, do (EUR)"
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
            Podaj cenę od i do, tak by cena od nie przekraczała ceny do.
          </p>
        )}
      </Stack>
      <Stack gap={1}>
        <Label id="wizard-standard-label" required>
          Standard wykończenia
        </Label>
        <Select
          value={draft.completionStandard}
          onChange={(value) => onChange({ completionStandard: value })}
          options={COMPLETION_STANDARD_OPTIONS}
          invalid={standardInvalid}
          aria-labelledby="wizard-standard-label"
        />
        {standardInvalid && (
          <p className="font-sans text-body text-status-blocked">Wybierz standard wykończenia.</p>
        )}
      </Stack>
      <Stack direction="row" gap={3} className="flex-wrap">
        <Stack gap={1} className="min-w-56 flex-1">
          <Label id="wizard-lead-time-label" required>
            Termin produkcji (tygodnie)
          </Label>
          <Stack direction="row" gap={2}>
            <Input
              type="number"
              min={0}
              required
              aria-label="Termin produkcji, od (tygodnie)"
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
              aria-label="Termin produkcji, do (tygodnie)"
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
              Podaj termin produkcji od i do, tak by wartość od nie przekraczała wartości do.
            </p>
          )}
        </Stack>
        <Stack gap={1} className="min-w-56 flex-1">
          <Label id="wizard-assembly-time-label" required>
            Czas montażu na miejscu (dni)
          </Label>
          <Stack direction="row" gap={2}>
            <Input
              type="number"
              min={0}
              required
              aria-label="Czas montażu, od (dni)"
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
              aria-label="Czas montażu, do (dni)"
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
              Podaj czas montażu od i do, tak by wartość od nie przekraczała wartości do.
            </p>
          )}
        </Stack>
      </Stack>
      <Stack direction="row" gap={3} className="flex-wrap">
        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor="wizard-warranty" required>
            Gwarancja konstrukcyjna (lata)
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
              Podaj gwarancję konstrukcyjną w latach.
            </p>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
