import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Controller, type Path, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button, Checkbox, Heading, Input, Label, Select, Stack, Text } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { getClientRequirementCatalogOptions, getTechnicalFieldsFor } from "@/lib/producer-project-draft";
import { ProjectWizardTechnicalField } from "./ProjectWizardTechnicalField";

interface ProjectWizardTechnicalStepProps {
  showValidation: boolean;
}

// Krok skonsolidowany z dawnych trzech (konstrukcja/instalacje/odpornosc):
// pola zależą od draft.family (spec 0022 AC-6), a dla "kontenery-modulowe"
// dodatkowo od draft.containerSubcategory (spec 0039 AC-5) — patrz
// getTechnicalFieldsFor. Krok "podstawowe" wymusza wybór family (i, dla
// kontenerów, podkategorii) wcześniej w kreatorze.
// Zmigrowany na react-hook-form (spec 0045 AC-14, Build plan task 3): stan
// czytany przez useFormContext zamiast draft/onChange props.
export function ProjectWizardTechnicalStep({ showValidation }: ProjectWizardTechnicalStepProps) {
  const t = useTranslations("ProjectWizardTechnicalStep");
  const tOptions = useTranslations("ProjectOptions");
  const { control, register, setValue } = useFormContext<ProjectDraft>();
  const family = useWatch({ control, name: "family" });
  const containerSubcategory = useWatch({ control, name: "containerSubcategory" });
  const technicalSpecs = useWatch({ control, name: "technicalSpecs" });
  const structuralWarrantyYears = useWatch({ control, name: "structuralWarrantyYears" });
  const warrantyInvalid =
    showValidation &&
    (structuralWarrantyYears === null || !Number.isInteger(structuralWarrantyYears) || structuralWarrantyYears < 0);

  // "Co musi zapewnić klient" (spec 0050 AC-23): raz na produkt, niezależnie
  // od wybranego standardu — stąd tutaj, w kroku technicznym, nie w
  // ProjectWizardVariantsStep. excludedScope per standard (AC-24) zostaje
  // osobnym polem tam, nigdy łączonym z tym katalogiem.
  const clientRequirementsArray = useFieldArray({ control, name: "clientRequirements" });
  const catalogOptions = getClientRequirementCatalogOptions(tOptions);
  const [customRequirementText, setCustomRequirementText] = useState("");

  function toggleCatalogRequirement(key: (typeof catalogOptions)[number]["value"], label: string) {
    const existingIndex = clientRequirementsArray.fields.findIndex((field) => field.key === key);
    if (existingIndex !== -1) {
      clientRequirementsArray.remove(existingIndex);
      return;
    }
    clientRequirementsArray.append({ id: crypto.randomUUID(), key, label, custom: false });
  }

  function addCustomRequirement() {
    const label = customRequirementText.trim();
    if (!label) return;
    clientRequirementsArray.append({ id: crypto.randomUUID(), key: null, label, custom: true });
    setCustomRequirementText("");
  }

  // heatTransferCoefficients domyślnie "nieznana"/"Nie podano" (spec 0050
  // AC-20): tylko dla family "dom" (jedyna rodzina, której .strict() schemat
  // w ogóle ma to pole, patrz lib/product-technical-specs.ts) — ustawiane tu,
  // przy pierwszym renderze kroku z tą rodziną, zamiast w createEmptyDraft
  // (które nie zna jeszcze family), żeby nigdy nie zanieczyścić
  // technicalSpecs innej rodziny nieznanym dla niej kluczem.
  useEffect(() => {
    if (family === "dom" && technicalSpecs.heatTransferCoefficients === undefined) {
      setValue("technicalSpecs.heatTransferCoefficients" as Path<ProjectDraft>, "nieznana");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family]);

  const fields = family === null ? [] : getTechnicalFieldsFor(family, containerSubcategory, tOptions);

  return (
    <Stack gap={3}>
      <Heading level="h2">{t("heading")}</Heading>
      {fields.map((field) => {
        const value = technicalSpecs[field.key];
        const fieldName = `technicalSpecs.${field.key}` as Path<ProjectDraft>;
        if (field.type === "select") {
          const invalid = !field.optional && showValidation && (value === undefined || value === "");
          const labelId = `wizard-technical-${field.key}-label`;
          const showOtherField = field.otherKey !== undefined && value === field.otherValue;
          const otherFieldName = field.otherKey ? (`technicalSpecs.${field.otherKey}` as Path<ProjectDraft>) : undefined;
          return (
            <Stack key={field.key} gap={1}>
              <Label id={labelId} required={!field.optional}>
                {field.label}
              </Label>
              <Controller
                name={fieldName}
                control={control}
                render={({ field: rhfField }) => (
                  <Select
                    value={(rhfField.value as string) ?? null}
                    onChange={rhfField.onChange}
                    options={field.options ?? []}
                    invalid={invalid}
                    aria-labelledby={labelId}
                  />
                )}
              />
              {invalid && (
                <p className="font-sans text-body text-status-blocked">
                  {t("selectRequiredError", { label: field.label.toLowerCase() })}
                </p>
              )}
              {showOtherField && otherFieldName && (
                <Stack gap={1}>
                  <Label htmlFor={`wizard-technical-${field.key}-other`}>{field.otherLabel}</Label>
                  <Input id={`wizard-technical-${field.key}-other`} {...register(otherFieldName)} />
                </Stack>
              )}
            </Stack>
          );
        }

        if (field.type === "boolean") {
          const invalid = showValidation && value !== true && value !== false;
          const checkboxId = `wizard-technical-${field.key}`;
          return (
            <Stack key={field.key} gap={1}>
              <div className="flex items-center gap-brand-1">
                <Checkbox id={checkboxId} {...register(fieldName)} />
                <Label htmlFor={checkboxId} required>
                  {field.label}
                </Label>
              </div>
              <p className="font-sans text-label uppercase tracking-[0.1em] font-medium text-brand-technical-graphite">
                {field.hint}
              </p>
              {invalid && (
                <p className="font-sans text-body text-status-blocked">
                  {t("selectRequiredError", { label: field.label.toLowerCase() })}
                </p>
              )}
            </Stack>
          );
        }

        const invalid =
          showValidation &&
          (field.type === "number"
            ? typeof value !== "number"
            : typeof value !== "string" || value.trim().length === 0);

        return (
          <Controller
            key={field.key}
            name={fieldName}
            control={control}
            render={({ field: rhfField }) => (
              <ProjectWizardTechnicalField
                id={`wizard-technical-${field.key}`}
                label={field.label}
                hint={field.hint}
                type={field.type === "number" ? "number" : "text"}
                value={(rhfField.value as string | number | undefined) ?? (field.type === "number" ? null : "")}
                invalid={invalid}
                errorMessage={t("textRequiredError", { label: field.label.toLowerCase() })}
                onChange={rhfField.onChange}
              />
            )}
          />
        );
      })}

      <Stack gap={1}>
        <Label htmlFor="wizard-structural-warranty" required>
          {t("structuralWarrantyLabel")}
        </Label>
        <Input
          id="wizard-structural-warranty"
          type="number"
          min={0}
          required
          invalid={warrantyInvalid}
          aria-describedby={warrantyInvalid ? "wizard-structural-warranty-error" : undefined}
          {...register("structuralWarrantyYears", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
        />
        {warrantyInvalid && (
          <p id="wizard-structural-warranty-error" className="font-sans text-body text-status-blocked">
            {t("structuralWarrantyRequiredError")}
          </p>
        )}
      </Stack>

      <Stack gap={2}>
        <Stack gap={1}>
          <Text as="span" variant="label">
            {t("clientRequirementsHeading")}
          </Text>
          <Text tone="muted">{t("clientRequirementsHint")}</Text>
        </Stack>

        <Stack gap={1}>
          {catalogOptions.map((option) => {
            const checked = clientRequirementsArray.fields.some((field) => field.key === option.value);
            const checkboxId = `wizard-client-requirement-${option.value}`;
            return (
              <div key={option.value} className="flex items-center gap-brand-1">
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onChange={() => toggleCatalogRequirement(option.value, option.label)}
                />
                <Label htmlFor={checkboxId}>{option.label}</Label>
              </div>
            );
          })}
        </Stack>

        {clientRequirementsArray.fields.some((field) => field.custom) && (
          <Stack gap={1}>
            {clientRequirementsArray.fields.map((field, index) =>
              field.custom ? (
                <div key={field.id} className="flex items-center gap-brand-2">
                  <Text as="span" className="min-w-0 flex-1 truncate">
                    {field.label}
                  </Text>
                  <button
                    type="button"
                    onClick={() => clientRequirementsArray.remove(index)}
                    aria-label={t("removeCustomRequirementLabel", { label: field.label })}
                    className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ) : null,
            )}
          </Stack>
        )}

        <Stack direction="row" gap={2} className="flex-wrap items-end">
          <Stack gap={1} className="min-w-48 flex-1">
            <Label htmlFor="wizard-client-requirement-custom">{t("customRequirementLabel")}</Label>
            <Input
              id="wizard-client-requirement-custom"
              value={customRequirementText}
              onChange={(event) => setCustomRequirementText(event.target.value)}
            />
          </Stack>
          <Button type="button" variant="secondary" size="sm" onClick={addCustomRequirement} disabled={!customRequirementText.trim()}>
            {t("addCustomRequirementButton")}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
