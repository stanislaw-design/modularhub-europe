import { useTranslations } from "next-intl";
import { Heading, Stack, Text } from "@/components/ui";
import { ProducerFloorPlanUploadStep, type ProducerFloorPlan, type ProducerFloorPlanVariantOption } from "./ProducerFloorPlanUploadStep";
import { ProducerProductPhotosStep, type ProducerProductPhoto } from "./ProducerProductPhotosStep";
import { ProducerSpecificationPdfUploadStep, type ProducerSpecificationPdf } from "./ProducerSpecificationPdfUploadStep";

interface ProjectWizardFilesStepProps {
  showValidation: boolean;
  productId: string | null;
  photos: ProducerProductPhoto[];
  onPhotosChange: (photos: ProducerProductPhoto[]) => void;
  floorPlans: ProducerFloorPlan[];
  onFloorPlansChange: (floorPlans: ProducerFloorPlan[]) => void;
  // Puste dla ProjectWizard (nowy projekt, krok "warianty" jeszcze nie
  // wypełniony) — patrz komentarz w ProducerFloorPlanUploadStep.
  floorPlanVariantOptions?: ProducerFloorPlanVariantOption[];
  // Jeden opcjonalny plik na produkt (spec 0049 AC-6), null dla ProjectWizard
  // dopóki productId nie istnieje, jak floorPlans/photos wyżej.
  specificationPdf: ProducerSpecificationPdf | null;
  onSpecificationPdfChange: (specificationPdf: ProducerSpecificationPdf | null) => void;
}

// Rzuty przeszły na realne wgrywanie R2 (spec 0045 AC-7, Build plan zadanie 8),
// ten sam mechanizm co zdjęcia (ProducerProductPhotosStep). floorPlanFiles na
// ProjectDraft zostaje jako sygnał kompletności kroku dla isStepComplete
// (ten sam wzorzec co photoFiles), synchronizowany przez rodzica (ProjectWizard/
// ProductEditWizard) z onFloorPlansChange, nie edytowany bezpośrednio tutaj.
export function ProjectWizardFilesStep({
  showValidation,
  productId,
  photos,
  onPhotosChange,
  floorPlans,
  onFloorPlansChange,
  floorPlanVariantOptions = [],
  specificationPdf,
  onSpecificationPdfChange,
}: ProjectWizardFilesStepProps) {
  const t = useTranslations("ProjectWizardFilesStep");

  return (
    <Stack gap={4}>
      <Heading level="h2">{t("heading")}</Heading>
      <Stack gap={2}>
        {productId ? (
          <ProducerFloorPlanUploadStep
            productId={productId}
            floorPlans={floorPlans}
            showValidation={showValidation}
            variants={floorPlanVariantOptions}
            onFloorPlansChange={onFloorPlansChange}
          />
        ) : (
          <Text tone="muted">{t("photosUnavailable")}</Text>
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
      <Stack gap={2}>
        {productId ? (
          <ProducerSpecificationPdfUploadStep
            productId={productId}
            specificationPdf={specificationPdf}
            onSpecificationPdfChange={onSpecificationPdfChange}
          />
        ) : (
          <Text tone="muted">{t("photosUnavailable")}</Text>
        )}
      </Stack>
    </Stack>
  );
}
