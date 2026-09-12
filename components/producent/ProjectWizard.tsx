"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import { createProducerProduct, updateProducerProduct } from "@/lib/producer-product-actions";
import { WIZARD_STEPS, createEmptyDraft, getWizardSteps, isStepComplete } from "@/lib/producer-project-draft";
import { ProjectWizardBasicInfoStep } from "./ProjectWizardBasicInfoStep";
import { ProjectWizardFilesStep } from "./ProjectWizardFilesStep";
import { ProjectWizardPricingStep } from "./ProjectWizardPricingStep";
import { ProjectWizardProgress } from "./ProjectWizardProgress";
import { ProjectWizardSummaryStep } from "./ProjectWizardSummaryStep";
import { ProjectWizardTechnicalStep } from "./ProjectWizardTechnicalStep";
import type { ProducerProductPhoto } from "./ProducerProductPhotosStep";

interface ProjectWizardProps {
  locale: string;
  countries: Country[];
}

// Kreator nowego produktu na sesji producenta (spec 0032 AC-4, Key
// invariants): wiersz product w bazie powstaje zaraz po ukończeniu kroku
// podstawowego (family jest notNull, więc wcześniej nie może istnieć), żeby
// krok zdjęć (AC-7) miał do czego się podpiąć. Każdy kolejny krok dopisuje
// swoje pola do tego samego wiersza; "Zapisz projekt" na Podsumowaniu
// publikuje go. Wizualnie ten sam kreator co dawny mock (spec 0016) — zmienia
// się wyłącznie to, dokąd zapisuje.
export function ProjectWizard({ locale, countries }: ProjectWizardProps) {
  const t = useTranslations("ProjectWizard");
  const tOptions = useTranslations("ProjectOptions");
  const wizardSteps = getWizardSteps(tOptions);
  const router = useRouter();
  const [draft, setDraft] = useState<ProjectDraft>(() => createEmptyDraft());
  const [productId, setProductId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ProducerProductPhoto[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
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

  async function persistProgress(currentDraft: ProjectDraft, currentProductId: string | null): Promise<boolean> {
    if (currentProductId === null) {
      const result = await createProducerProduct(currentDraft);
      if (!result.ok || !result.productId) {
        setSaveError(result.error ?? t("saveError"));
        return false;
      }
      setProductId(result.productId);
      return true;
    }
    const result = await updateProducerProduct(currentProductId, currentDraft, { publish: false });
    if (!result.ok) {
      setSaveError(result.error ?? t("saveError"));
      return false;
    }
    return true;
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
    const persisted = await persistProgress(draft, productId);
    setIsSaving(false);
    if (!persisted) return;
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
    if (productId === null) return;
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
