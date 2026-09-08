import { useTranslations } from "next-intl";
import { Heading, Label, Select, Stack } from "@/components/ui";
import type { ProjectDraft, ProductTechnicalSpecsDraft } from "@/lib/data/types";
import { getTechnicalFieldsByFamily } from "@/lib/producer-project-draft";
import { ProjectWizardTechnicalField } from "./ProjectWizardTechnicalField";

interface ProjectWizardTechnicalStepProps {
  draft: ProjectDraft;
  showValidation: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

// Krok skonsolidowany z dawnych trzech (konstrukcja/instalacje/odpornosc):
// pola zależą od draft.family (spec 0022 AC-6). Krok "podstawowe" wymusza
// wybór family wcześniej w kreatorze, więc draft.family jest tu zawsze ustawione.
export function ProjectWizardTechnicalStep({ draft, showValidation, onChange }: ProjectWizardTechnicalStepProps) {
  const t = useTranslations("ProjectWizardTechnicalStep");
  const tOptions = useTranslations("ProjectOptions");

  if (draft.family === null) {
    return (
      <Stack gap={3}>
        <Heading level="h2">{t("heading")}</Heading>
      </Stack>
    );
  }

  const fields = getTechnicalFieldsByFamily(draft.family, tOptions);

  function updateSpec(key: keyof ProductTechnicalSpecsDraft, value: string | number) {
    onChange({ technicalSpecs: { ...draft.technicalSpecs, [key]: value } });
  }

  return (
    <Stack gap={3}>
      <Heading level="h2">{t("heading")}</Heading>
      {fields.map((field) => {
        const value = draft.technicalSpecs[field.key];
        if (field.type === "select") {
          const invalid = showValidation && (value === undefined || value === "");
          const labelId = `wizard-technical-${field.key}-label`;
          return (
            <Stack key={field.key} gap={1}>
              <Label id={labelId} required>
                {field.label}
              </Label>
              <Select
                value={(value as string) ?? null}
                onChange={(next) => updateSpec(field.key, next)}
                options={field.options ?? []}
                invalid={invalid}
                aria-labelledby={labelId}
              />
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
          <ProjectWizardTechnicalField
            key={field.key}
            id={`wizard-technical-${field.key}`}
            label={field.label}
            hint={field.hint}
            type={field.type === "number" ? "number" : "text"}
            value={(value as string | number | undefined) ?? (field.type === "number" ? null : "")}
            invalid={invalid}
            errorMessage={t("textRequiredError", { label: field.label.toLowerCase() })}
            onChange={(next) => updateSpec(field.key, next)}
          />
        );
      })}
    </Stack>
  );
}
