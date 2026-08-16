import { Heading, Stack } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { TECHNICAL_FIELD_HINTS } from "@/lib/producer-project-draft";
import { ProjectWizardTechnicalField } from "./ProjectWizardTechnicalField";

interface ProjectWizardConstructionStepProps {
  draft: ProjectDraft;
  showValidation: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

export function ProjectWizardConstructionStep({
  draft,
  showValidation,
  onChange,
}: ProjectWizardConstructionStepProps) {
  return (
    <Stack gap={3}>
      <Heading level="h2">Konstrukcja i izolacja</Heading>
      <ProjectWizardTechnicalField
        id="wizard-wall-build-up"
        label="Układ ścian"
        hint={TECHNICAL_FIELD_HINTS.wallBuildUp}
        value={draft.wallBuildUp}
        invalid={showValidation && draft.wallBuildUp.trim().length === 0}
        errorMessage="Opisz układ ścian."
        onChange={(value) => onChange({ wallBuildUp: value })}
      />
      <ProjectWizardTechnicalField
        id="wizard-insulation"
        label="Izolacja"
        hint={TECHNICAL_FIELD_HINTS.insulation}
        value={draft.insulation}
        invalid={showValidation && draft.insulation.trim().length === 0}
        errorMessage="Podaj parametry izolacji."
        onChange={(value) => onChange({ insulation: value })}
      />
      <ProjectWizardTechnicalField
        id="wizard-heat-transfer"
        label="Współczynniki przenikania ciepła"
        hint={TECHNICAL_FIELD_HINTS.heatTransferCoefficients}
        value={draft.heatTransferCoefficients}
        invalid={showValidation && draft.heatTransferCoefficients.trim().length === 0}
        errorMessage="Podaj współczynniki przenikania ciepła."
        onChange={(value) => onChange({ heatTransferCoefficients: value })}
      />
    </Stack>
  );
}
