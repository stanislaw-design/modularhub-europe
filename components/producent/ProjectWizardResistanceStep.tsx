import { Heading, Stack } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { TECHNICAL_FIELD_HINTS } from "@/lib/producer-project-draft";
import { ProjectWizardTechnicalField } from "./ProjectWizardTechnicalField";

interface ProjectWizardResistanceStepProps {
  draft: ProjectDraft;
  showValidation: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

export function ProjectWizardResistanceStep({
  draft,
  showValidation,
  onChange,
}: ProjectWizardResistanceStepProps) {
  return (
    <Stack gap={3}>
      <Heading level="h2">Odporność</Heading>
      <ProjectWizardTechnicalField
        id="wizard-fire-resistance"
        label="Odporność ogniowa"
        hint={TECHNICAL_FIELD_HINTS.fireResistance}
        value={draft.fireResistance}
        invalid={showValidation && draft.fireResistance.trim().length === 0}
        errorMessage="Podaj odporność ogniową."
        onChange={(value) => onChange({ fireResistance: value })}
      />
      <ProjectWizardTechnicalField
        id="wizard-wind-resistance"
        label="Odporność wiatrowa"
        hint={TECHNICAL_FIELD_HINTS.windResistance}
        value={draft.windResistance}
        invalid={showValidation && draft.windResistance.trim().length === 0}
        errorMessage="Podaj odporność wiatrową."
        onChange={(value) => onChange({ windResistance: value })}
      />
    </Stack>
  );
}
