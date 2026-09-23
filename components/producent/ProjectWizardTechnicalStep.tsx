import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Controller, type Path, useFormContext, useWatch } from "react-hook-form";
import { Checkbox, Heading, Input, Label, Select, Stack } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { getTechnicalFieldsFor } from "@/lib/producer-project-draft";
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
    </Stack>
  );
}
