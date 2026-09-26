"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import { createProducerProduct, type ProducerProductFields, updateProducerProduct } from "@/lib/producer-product-actions";
import { WIZARD_STEPS, buildProducerSavePayload, createEmptyDraft, getWizardSteps, isStepComplete } from "@/lib/producer-project-draft";
import { ProjectWizardBasicInfoStep } from "./ProjectWizardBasicInfoStep";
import { ProjectWizardFaqStep } from "./ProjectWizardFaqStep";
import { ProjectWizardFilesStep } from "./ProjectWizardFilesStep";
import { ProjectWizardProgress } from "./ProjectWizardProgress";
import { ProjectWizardRoomLayoutStep } from "./ProjectWizardRoomLayoutStep";
import { ProjectWizardSummaryStep } from "./ProjectWizardSummaryStep";
import { ProjectWizardTechnicalStep } from "./ProjectWizardTechnicalStep";
import { ProjectWizardTranslationsStep } from "./ProjectWizardTranslationsStep";
import { ProjectWizardVariantsStep, type ProjectWizardVariantsStepHandle } from "./ProjectWizardVariantsStep";
import type { ProducerFloorPlan } from "./ProducerFloorPlanUploadStep";
import type { ProducerProductPhoto } from "./ProducerProductPhotosStep";
import type { ProducerSalesPdf } from "./ProducerSalesPdfUploadStep";
import type { ProducerSpecificationPdf } from "./ProducerSpecificationPdfUploadStep";

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
//
// Stan formularza żyje w react-hook-form (spec 0045 AC-14, Build plan zadanie
// 3): kroki podstawowe/techniczne/pliki/faq czytają go przez useFormContext.
// Dawny krok "cena" i jego draft/onChange adapter zostały usunięte (zadanie
// 12): bramka publikacji przechodzi teraz na domyślny wariant z ceną
// (AC-4/AC-17), sprawdzaną po stronie serwera w validatePublishReadiness.
// ProjectWizardVariantsStep ma własny, osobny useForm/useFieldArray (AC-14):
// dostaje tylko productId, do rodzica wraca jedynie migawka przez
// draft.variantsSummary (setValue wewnątrz tamtego komponentu).
// ProjectWizardSummaryStep jest tylko do odczytu — dostaje jednorazowy
// snapshot z useWatch przy każdym renderze, bez własnej subskrypcji.
export function ProjectWizard({ locale, countries }: ProjectWizardProps) {
  const t = useTranslations("ProjectWizard");
  const tOptions = useTranslations("ProjectOptions");
  const wizardSteps = getWizardSteps(tOptions);
  const router = useRouter();
  const form = useForm<ProjectDraft>({ defaultValues: createEmptyDraft() });
  // Subskrypcja całego formularza wyłącznie dla ProjectWizardSummaryStep
  // (jedyny konsument wciąż na starym draft-prop interfejsie, czysto do
  // odczytu); reszta kroków czyta stan przez własny, węższy useFormContext.
  const values = useWatch({ control: form.control }) as ProjectDraft;
  const [productId, setProductId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ProducerProductPhoto[]>([]);
  const [floorPlans, setFloorPlans] = useState<ProducerFloorPlan[]>([]);
  // Opcjonalny, nie sygnalizuje kompletności kroku (spec 0049 AC-6): brak
  // odpowiednika floorPlanFiles na ProjectDraft, bo żadna AC nie wymaga go do
  // publikacji.
  const [specificationPdf, setSpecificationPdf] = useState<ProducerSpecificationPdf | null>(null);
  // Opcjonalny, ten sam wzorzec co specificationPdf wyżej (spec 0050 AC-25, AC-26).
  const [salesPdf, setSalesPdf] = useState<ProducerSalesPdf | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const variantsStepRef = useRef<ProjectWizardVariantsStepHandle>(null);

  function handlePhotosChange(next: ProducerProductPhoto[]) {
    setPhotos(next);
    form.setValue(
      "photoFiles",
      next.map((photo) => ({ name: photo.filename, sizeBytes: 0 })),
    );
  }

  function handleFloorPlansChange(next: ProducerFloorPlan[]) {
    setFloorPlans(next);
    form.setValue(
      "floorPlanFiles",
      next.map((plan) => ({ name: plan.filename, sizeBytes: 0 })),
    );
  }

  async function persistProgress(currentDraft: ProducerProductFields, currentProductId: string | null): Promise<boolean> {
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

  // "Zapisz wariant" na karcie kroku "warianty" jest jedynym, co utrwala
  // cenę/pozycje kosztowe/etapy wariantu (ProjectWizardVariantsStep) — bez
  // tego flusha każda nawigacja stąd (Dalej/Wstecz/klik w inny krok)
  // odmontowywała ten krok i po cichu gubiła każdą niezapisaną w ten sposób
  // zmianę, mimo że reszta kreatora zawsze zapisuje bieżący krok przy
  // "Dalej". `undefined` (ref pusty, bo nie jesteśmy na kroku "warianty")
  // nigdy nie blokuje nawigacji, tylko `false` (realny błąd zapisu) blokuje.
  async function goToStep(index: number) {
    const variantsSaved = await variantsStepRef.current?.saveAllPending();
    if (variantsSaved === false) {
      setSaveError(t("saveError"));
      return;
    }
    setStepIndex(index);
    setShowValidation(false);
  }

  async function handleNext() {
    const currentStepId = WIZARD_STEPS[stepIndex].id;
    const currentDraft = form.getValues();
    if (!isStepComplete(currentStepId, currentDraft)) {
      setShowValidation(true);
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    const persisted = await persistProgress(buildProducerSavePayload(currentDraft, currentStepId), productId);
    setIsSaving(false);
    if (!persisted) return;
    const nextIndex = Math.min(stepIndex + 1, WIZARD_STEPS.length - 1);
    setMaxReachedIndex((prev) => Math.max(prev, nextIndex));
    await goToStep(nextIndex);
  }

  async function handleBack() {
    if (stepIndex === 0) return;
    await goToStep(stepIndex - 1);
  }

  async function handleStepClick(index: number) {
    if (index === stepIndex || index > maxReachedIndex) return;
    await goToStep(index);
  }

  async function handleSave() {
    if (productId === null) return;
    setSaveError(null);
    setIsSaving(true);
    const result = await updateProducerProduct(
      productId,
      buildProducerSavePayload(form.getValues(), currentStep.id),
      { publish: true },
    );
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
    <FormProvider {...form}>
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
            <ProjectWizardBasicInfoStep countries={countries} showValidation={showValidation} />
          )}
          {currentStep.id === "techniczne" && <ProjectWizardTechnicalStep showValidation={showValidation} />}
          {currentStep.id === "pliki" && (
            <ProjectWizardFilesStep
              showValidation={showValidation}
              productId={productId}
              photos={photos}
              onPhotosChange={handlePhotosChange}
              floorPlans={floorPlans}
              onFloorPlansChange={handleFloorPlansChange}
              specificationPdf={specificationPdf}
              onSpecificationPdfChange={setSpecificationPdf}
              salesPdf={salesPdf}
              onSalesPdfChange={setSalesPdf}
            />
          )}
          {currentStep.id === "uklad-pomieszczen" && (
            <ProjectWizardRoomLayoutStep productId={productId} floorPlans={floorPlans} showValidation={showValidation} />
          )}
          {currentStep.id === "warianty" && (
            <ProjectWizardVariantsStep ref={variantsStepRef} productId={productId} enableStandardsExtraction />
          )}
          {currentStep.id === "faq" && <ProjectWizardFaqStep />}
          {currentStep.id === "tlumaczenia" && <ProjectWizardTranslationsStep productId={productId} />}
          {isSummaryStep && <ProjectWizardSummaryStep draft={values} countries={countries} />}
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
    </FormProvider>
  );
}
