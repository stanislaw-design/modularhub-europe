"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import { updateProducerProduct } from "@/lib/producer-product-actions";
import { WIZARD_STEPS, getWizardSteps, isStepComplete } from "@/lib/producer-project-draft";
import { ProjectWizardBasicInfoStep } from "./ProjectWizardBasicInfoStep";
import { ProjectWizardFilesStep } from "./ProjectWizardFilesStep";
import { ProjectWizardPricingStep } from "./ProjectWizardPricingStep";
import { ProjectWizardProgress } from "./ProjectWizardProgress";
import { ProjectWizardSummaryStep } from "./ProjectWizardSummaryStep";
import { ProjectWizardTechnicalStep } from "./ProjectWizardTechnicalStep";
import type { ProducerProductPhoto } from "./ProducerProductPhotosStep";

interface ProductEditWizardProps {
  locale: string;
  productId: string;
  initialDraft: ProjectDraft;
  initialPhotos: ProducerProductPhoto[];
  countries: Country[];
}

// Kreator edycji na sesji producenta (spec 0032 AC-5, AC-13): dane wejściowe
// już wczytane po stronie serwera (strona ownership-checked producenta,
// getProducerProductForEdit), więc bez stanu "loading"/fetch po stronie
// przeglądarki jak w dawnym mocku (spec 0016). Osobny komponent od ProjectWizard
// (dodawanie nowego produktu), świadomy wybór z tamtego builda — reużywa tylko
// jego siedem kroków (rationale.md 0016).
export function ProductEditWizard({ locale, productId, initialDraft, initialPhotos, countries }: ProductEditWizardProps) {
  const t = useTranslations("ProductEditWizard");
  const tOptions = useTranslations("ProjectOptions");
  const wizardSteps = getWizardSteps(tOptions);
  const router = useRouter();
  const [draft, setDraft] = useState<ProjectDraft>(initialDraft);
  const [photos, setPhotos] = useState<ProducerProductPhoto[]>(initialPhotos);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(WIZARD_STEPS.length - 1);
  const [showValidation, setShowValidation] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateDraft(patch: Partial<ProjectDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function handlePhotosChange(next: ProducerProductPhoto[]) {
    setPhotos(next);
    updateDraft({ photoFiles: next.map((photo) => ({ name: photo.filename, sizeBytes: 0 })) });
  }

  function goToStep(index: number) {
    setStepIndex(index);
    setShowValidation(false);
  }

  async function handleNext() {
    const currentStepId = WIZARD_STEPS[stepIndex].id;
    if (!isStepComplete(currentStepId, draft)) {
      setShowValidation(true);
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    const result = await updateProducerProduct(productId, draft, { publish: false });
    setIsSaving(false);
    if (!result.ok) {
      setSaveError(result.error ?? t("saveError"));
      return;
    }
    const nextIndex = Math.min(stepIndex + 1, WIZARD_STEPS.length - 1);
    setMaxReachedIndex((prev) => Math.max(prev, nextIndex));
    goToStep(nextIndex);
  }

  function handleBack() {
    if (stepIndex === 0) return;
    goToStep(stepIndex - 1);
  }

  function handleStepClick(index: number) {
    if (index === stepIndex || index > maxReachedIndex) return;
    goToStep(index);
  }

  async function handleSave() {
    setSaveError(null);
    setIsSaving(true);
    const result = await updateProducerProduct(productId, draft, { publish: true });
    setIsSaving(false);
    if (!result.ok) {
      setSaveError(result.error ?? t("saveError"));
      return;
    }
    router.push(`/${locale}/producer/panel/products`);
  }

  const currentStep = WIZARD_STEPS[stepIndex];
  const isSummaryStep = currentStep.id === "podsumowanie";

  return (
    <Stack gap={5}>
      <Heading level="h1">{t("heading")}</Heading>
      <ProjectWizardProgress
        steps={wizardSteps}
        currentIndex={stepIndex}
        maxReachedIndex={maxReachedIndex}
        onStepClick={handleStepClick}
      />
      <Stack gap={4}>
        {currentStep.id === "podstawowe" && (
          <ProjectWizardBasicInfoStep
            draft={draft}
            countries={countries}
            showValidation={showValidation}
            familyLocked
            onChange={updateDraft}
          />
        )}
        {currentStep.id === "techniczne" && (
          <ProjectWizardTechnicalStep draft={draft} showValidation={showValidation} onChange={updateDraft} />
        )}
        {currentStep.id === "pliki" && (
          <ProjectWizardFilesStep
            draft={draft}
            showValidation={showValidation}
            productId={productId}
            photos={photos}
            onChange={updateDraft}
            onPhotosChange={handlePhotosChange}
          />
        )}
        {currentStep.id === "cena" && (
          <ProjectWizardPricingStep draft={draft} showValidation={showValidation} onChange={updateDraft} />
        )}
        {isSummaryStep && <ProjectWizardSummaryStep draft={draft} countries={countries} />}
      </Stack>
      {saveError && <Text className="text-status-blocked">{saveError}</Text>}
      <Stack direction="row" gap={2}>
        {stepIndex > 0 && (
          <Button type="button" variant="secondary" onClick={handleBack} disabled={isSaving} className="w-fit">
            {t("back")}
          </Button>
        )}
        {isSummaryStep ? (
          <Button type="button" onClick={handleSave} disabled={isSaving} className="w-fit">
            {t("save")}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext} disabled={isSaving} className="w-fit">
            {t("next")}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
