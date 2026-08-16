import { FileUpload, Heading, Stack } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";

interface ProjectWizardFilesStepProps {
  draft: ProjectDraft;
  showValidation: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

export function ProjectWizardFilesStep({ draft, showValidation, onChange }: ProjectWizardFilesStepProps) {
  const floorPlanInvalid = showValidation && draft.floorPlanFiles.length === 0;
  const photoInvalid = showValidation && draft.photoFiles.length === 0;

  return (
    <Stack gap={4}>
      <Heading level="h2">Pliki</Heading>
      <Stack gap={2}>
        <FileUpload
          id="wizard-floor-plan-files"
          label="Rzuty"
          required
          files={draft.floorPlanFiles}
          onFilesChange={(files) => onChange({ floorPlanFiles: files })}
        />
        {floorPlanInvalid && (
          <p className="font-sans text-body text-status-blocked">Dodaj co najmniej jeden rzut.</p>
        )}
      </Stack>
      <Stack gap={2}>
        <FileUpload
          id="wizard-photo-files"
          label="Zdjęcia"
          required
          files={draft.photoFiles}
          onFilesChange={(files) => onChange({ photoFiles: files })}
        />
        {photoInvalid && (
          <p className="font-sans text-body text-status-blocked">Dodaj co najmniej jedno zdjęcie.</p>
        )}
      </Stack>
    </Stack>
  );
}
