import { Heading, Stack } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { TECHNICAL_FIELD_HINTS } from "@/lib/producer-project-draft";
import { ProjectWizardTechnicalField } from "./ProjectWizardTechnicalField";

interface ProjectWizardSystemsStepProps {
  draft: ProjectDraft;
  showValidation: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

export function ProjectWizardSystemsStep({ draft, showValidation, onChange }: ProjectWizardSystemsStepProps) {
  return (
    <Stack gap={3}>
      <Heading level="h2">Instalacje i okna</Heading>
      <ProjectWizardTechnicalField
        id="wizard-window-class"
        label="Klasa okien"
        hint={TECHNICAL_FIELD_HINTS.windowClass}
        value={draft.windowClass}
        invalid={showValidation && draft.windowClass.trim().length === 0}
        errorMessage="Podaj klasę okien."
        onChange={(value) => onChange({ windowClass: value })}
      />
      <ProjectWizardTechnicalField
        id="wizard-ventilation"
        label="Wentylacja"
        hint={TECHNICAL_FIELD_HINTS.ventilation}
        value={draft.ventilation}
        invalid={showValidation && draft.ventilation.trim().length === 0}
        errorMessage="Podaj typ wentylacji."
        onChange={(value) => onChange({ ventilation: value })}
      />
      <ProjectWizardTechnicalField
        id="wizard-heat-source"
        label="Źródło ciepła"
        hint={TECHNICAL_FIELD_HINTS.heatSource}
        value={draft.heatSource}
        invalid={showValidation && draft.heatSource.trim().length === 0}
        errorMessage="Podaj źródło ciepła."
        onChange={(value) => onChange({ heatSource: value })}
      />
    </Stack>
  );
}
