import { useTranslations } from "next-intl";
import { FileUpload, Heading, Stack, Text } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { ProducerProductPhotosStep, type ProducerProductPhoto } from "./ProducerProductPhotosStep";

interface ProjectWizardFilesStepProps {
  draft: ProjectDraft;
  showValidation: boolean;
  productId: string | null;
  photos: ProducerProductPhoto[];
  onChange: (patch: Partial<ProjectDraft>) => void;
  onPhotosChange: (photos: ProducerProductPhoto[]) => void;
}

// Rzuty (floorPlanFiles) zostają makietą (spec 0032: żadne kryterium akceptacji
// tej funkcji ich nie dotyczy, product nie ma dla nich kolumny) — tylko zdjęcia
// przechodzą na realne wgrywanie (AC-7), patrz ProducerProductPhotosStep.
export function ProjectWizardFilesStep({
  draft,
  showValidation,
  productId,
  photos,
  onChange,
  onPhotosChange,
}: ProjectWizardFilesStepProps) {
  const t = useTranslations("ProjectWizardFilesStep");
  const floorPlanInvalid = showValidation && draft.floorPlanFiles.length === 0;

  return (
    <Stack gap={4}>
      <Heading level="h2">{t("heading")}</Heading>
      <Stack gap={2}>
        <FileUpload
          id="wizard-floor-plan-files"
          label={t("floorPlanLabel")}
          required
          files={draft.floorPlanFiles}
          onFilesChange={(files) => onChange({ floorPlanFiles: files })}
        />
        {floorPlanInvalid && (
          <p className="font-sans text-body text-status-blocked">{t("floorPlanRequiredError")}</p>
        )}
      </Stack>
      {productId ? (
        <ProducerProductPhotosStep
          productId={productId}
          photos={photos}
          showValidation={showValidation}
          onPhotosChange={onPhotosChange}
        />
      ) : (
        <Text tone="muted">{t("photosUnavailable")}</Text>
      )}
    </Stack>
  );
}
