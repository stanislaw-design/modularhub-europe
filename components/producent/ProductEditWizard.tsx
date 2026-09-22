"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import type { ProducerVariantForEdit } from "@/lib/db/queries";
import { updateProducerProduct } from "@/lib/producer-product-actions";
import { WIZARD_STEPS, buildProducerSavePayload, getCompletionStandardOptions, getWizardSteps, isStepComplete } from "@/lib/producer-project-draft";
import { ProjectWizardBasicInfoStep } from "./ProjectWizardBasicInfoStep";
import { ProjectWizardFaqStep } from "./ProjectWizardFaqStep";
import { ProjectWizardFilesStep } from "./ProjectWizardFilesStep";
import { ProjectWizardProgress } from "./ProjectWizardProgress";
import { ProjectWizardSummaryStep } from "./ProjectWizardSummaryStep";
import { ProjectWizardTechnicalStep } from "./ProjectWizardTechnicalStep";
import { ProjectWizardVariantsStep } from "./ProjectWizardVariantsStep";
import type { ProducerFloorPlan } from "./ProducerFloorPlanUploadStep";
import type { ProducerProductPhoto } from "./ProducerProductPhotosStep";
import type { ProducerSalesPdf } from "./ProducerSalesPdfUploadStep";
import type { ProducerSpecificationPdf } from "./ProducerSpecificationPdfUploadStep";

interface ProductEditWizardProps {
  locale: string;
  productId: string;
  initialDraft: ProjectDraft;
  initialPhotos: ProducerProductPhoto[];
  initialFloorPlans: ProducerFloorPlan[];
  initialSpecificationPdf: ProducerSpecificationPdf | null;
  // Opcjonalny, ten sam wzorzec co initialSpecificationPdf wyżej (spec 0050 AC-25, AC-26).
  initialSalesPdf: ProducerSalesPdf | null;
  initialVariants: ProducerVariantForEdit[];
  countries: Country[];
}

// Kreator edycji na sesji producenta (spec 0032 AC-5, AC-13): dane wejściowe
// już wczytane po stronie serwera (strona ownership-checked producenta,
// getProducerProductForEdit), więc bez stanu "loading"/fetch po stronie
// przeglądarki jak w dawnym mocku (spec 0016). Osobny komponent od ProjectWizard
// (dodawanie nowego produktu), świadomy wybór z tamtego builda — reużywa jego
// kroki (rationale.md 0016).
//
// Stan formularza żyje w react-hook-form (spec 0045 AC-14, Build plan zadanie
// 3), ten sam wzorzec co ProjectWizard.tsx — patrz komentarz tam. Krok
// "warianty" (Build plan zadanie 5) jest tu wpięty wcześniej niż zadanie 13
// planowało, na wyraźną prośbę: bez tego producent nie miał jak przetestować
// kroku na już istniejącym, zapisanym projekcie, tylko na dopiero tworzonym.
// initialVariants pochodzi z
// lib/db/queries.ts#getProducerVariantsForEdit (ownership już sprawdzony przez
// stronę wywołującą) i hydratuje lokalny useForm ProjectWizardVariantsStep.
export function ProductEditWizard({
  locale,
  productId,
  initialDraft,
  initialPhotos,
  initialFloorPlans,
  initialSpecificationPdf,
  initialSalesPdf,
  initialVariants,
  countries,
}: ProductEditWizardProps) {
  const t = useTranslations("ProductEditWizard");
  const tOptions = useTranslations("ProjectOptions");
  const wizardSteps = getWizardSteps(tOptions);
  const router = useRouter();
  const form = useForm<ProjectDraft>({ defaultValues: initialDraft });
  const values = useWatch({ control: form.control }) as ProjectDraft;
  const [photos, setPhotos] = useState<ProducerProductPhoto[]>(initialPhotos);
  const [floorPlans, setFloorPlans] = useState<ProducerFloorPlan[]>(initialFloorPlans);
  const [specificationPdf, setSpecificationPdf] = useState<ProducerSpecificationPdf | null>(initialSpecificationPdf);
  const [salesPdf, setSalesPdf] = useState<ProducerSalesPdf | null>(initialSalesPdf);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(WIZARD_STEPS.length - 1);
  const [showValidation, setShowValidation] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Rzuty przypisywane do konkretnego wariantu, jeśli produkt już ma warianty
  // (spec 0045 AC-7): edycja jest jedynym miejscem, gdzie krok "pliki"
  // (przed krokiem "warianty" w dzisiejszej kolejności) ma już realną listę do
  // wyboru — patrz komentarz w ProducerFloorPlanUploadStep.
  const standardOptions = getCompletionStandardOptions(tOptions);
  const floorPlanVariantOptions = initialVariants.map((variant) => ({
    id: variant.id,
    label: standardOptions.find((option) => option.value === variant.completionStandard)?.label ?? variant.completionStandard,
  }));

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

  function goToStep(index: number) {
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
    const result = await updateProducerProduct(productId, buildProducerSavePayload(currentDraft, currentStepId), {
      publish: false,
    });
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

  // Znany, zaakceptowany brzeg (spec 0028 AC-15): stepIndex startuje na
  // "podstawowe" ale maxReachedIndex jest tu od razu w pełni otwarty (produkt
  // już istnieje), więc producent może kliknąć bezpośrednio w "Podsumowanie" w
  // pasku kroków, wpisawszy wcześniej tłumaczenie, ale nigdy nie naciskając
  // "Dalej" na kroku podstawowym. Save woła buildProducerSavePayload z bieżącym
  // krokiem ("podsumowanie"), więc taka niezapisana zmiana tłumaczenia nie
  // trafi do bazy tym kliknięciem — trzeba wrócić na krok podstawowy i
  // przejść "Dalej" przynajmniej raz. Świadomy koszt tej samej ochrony, która
  // zapobiega nadpisaniu tłumaczenia dopisanego w międzyczasie przez AI.
  async function handleSave() {
    setSaveError(null);
    setIsSaving(true);
    const result = await updateProducerProduct(productId, buildProducerSavePayload(form.getValues(), currentStep.id), {
      publish: true,
    });
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
            <ProjectWizardBasicInfoStep countries={countries} showValidation={showValidation} familyLocked />
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
              floorPlanVariantOptions={floorPlanVariantOptions}
              specificationPdf={specificationPdf}
              onSpecificationPdfChange={setSpecificationPdf}
              salesPdf={salesPdf}
              onSalesPdfChange={setSalesPdf}
            />
          )}
          {currentStep.id === "warianty" && (
            <ProjectWizardVariantsStep productId={productId} initialVariants={initialVariants} />
          )}
          {currentStep.id === "faq" && <ProjectWizardFaqStep />}
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
