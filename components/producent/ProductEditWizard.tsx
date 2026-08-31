"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import {
  WIZARD_STEPS,
  isStepComplete,
} from "@/lib/producer-project-draft";
import {
  clearEditDraft,
  getProduct,
  loadEditDraft,
  saveEditDraft,
  savedProductToDraft,
  updateProduct,
} from "@/lib/producer-products";
import { ProjectWizardBasicInfoStep } from "./ProjectWizardBasicInfoStep";
import { ProjectWizardConstructionStep } from "./ProjectWizardConstructionStep";
import { ProjectWizardFilesStep } from "./ProjectWizardFilesStep";
import { ProjectWizardPricingStep } from "./ProjectWizardPricingStep";
import { ProjectWizardProgress } from "./ProjectWizardProgress";
import { ProjectWizardResistanceStep } from "./ProjectWizardResistanceStep";
import { ProjectWizardSummaryStep } from "./ProjectWizardSummaryStep";
import { ProjectWizardSystemsStep } from "./ProjectWizardSystemsStep";

interface ProductEditWizardProps {
  locale: string;
  nip: string;
  productId: string;
  countries: Country[];
}

type LoadStatus = "loading" | "ready";

// Osobny ekran od ProjectWizard (dodawanie nowego produktu), świadomy wybór przy
// projektowaniu (spec 0016, rationale.md): kreator nowego produktu zostaje nietknięty,
// ten komponent reużywa tylko jego siedem kroków. Stan edycji żyje pod osobnym kluczem
// (`producent:${nip}:edycja:${id}`), niezależnym od ewentualnego szkicu nowego produktu
// w toku (spec 0016, AC-8, Key invariants).
export function ProductEditWizard({ locale, nip, productId, countries }: ProductEditWizardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const product = getProduct(nip, productId);
    if (product === null) {
      // Nieznane id: przekierowanie samo odmontuje ten komponent, status zostaje
      // "loading" (ten sam widok co w trakcie odczytu).
      router.replace(`/${locale}/producent/produkty?nip=${nip}`);
      return;
    }
    const storedEdit = loadEditDraft(nip, productId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji
    setDraft(storedEdit ? storedEdit.draft : savedProductToDraft(product));
    setStepIndex(storedEdit ? storedEdit.step : 0);
    // Produkt startuje kompletny (był już zapisany), więc edycja od razu pozwala
    // przejść do dowolnego kroku, w przeciwieństwie do sekwencyjnego kreatora nowego
    // produktu — nie tylko do ostatnio odwiedzonego kroku szkicu edycji.
    setMaxReachedIndex(WIZARD_STEPS.length - 1);
    setStatus("ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- locale/router są stałe dla tego montowania, nip/productId wystarczą
  }, [nip, productId]);

  if (status !== "ready" || draft === null) {
    return (
      <Stack gap={4}>
        <Heading level="h1">Edytuj produkt</Heading>
        <Text tone="muted">Ładowanie…</Text>
      </Stack>
    );
  }

  function updateDraft(patch: Partial<ProjectDraft>) {
    setDraft((prev) => {
      if (prev === null) return prev;
      const next = { ...prev, ...patch };
      saveEditDraft(nip, productId, next, stepIndex);
      return next;
    });
  }

  function goToStep(index: number, currentDraft: ProjectDraft) {
    setStepIndex(index);
    setShowValidation(false);
    saveEditDraft(nip, productId, currentDraft, index);
  }

  function handleNext() {
    if (draft === null) return;
    const currentStepId = WIZARD_STEPS[stepIndex].id;
    if (!isStepComplete(currentStepId, draft)) {
      setShowValidation(true);
      return;
    }
    const nextIndex = Math.min(stepIndex + 1, WIZARD_STEPS.length - 1);
    setMaxReachedIndex((prev) => Math.max(prev, nextIndex));
    goToStep(nextIndex, draft);
  }

  function handleBack() {
    if (draft === null || stepIndex === 0) return;
    goToStep(stepIndex - 1, draft);
  }

  function handleStepClick(index: number) {
    if (draft === null || index === stepIndex || index > maxReachedIndex) return;
    goToStep(index, draft);
  }

  function handleSave() {
    if (draft === null) return;
    const updated = updateProduct(nip, productId, draft);
    if (updated === null) {
      setSaveError(true);
      return;
    }
    clearEditDraft(nip, productId);
    router.push(`/${locale}/producent/produkty?nip=${nip}`);
  }

  const currentStep = WIZARD_STEPS[stepIndex];
  const isSummaryStep = currentStep.id === "podsumowanie";

  return (
    <Stack gap={5}>
      <Heading level="h1">Edytuj produkt</Heading>
      <ProjectWizardProgress
        steps={WIZARD_STEPS}
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
        {currentStep.id === "konstrukcja" && (
          <ProjectWizardConstructionStep draft={draft} showValidation={showValidation} onChange={updateDraft} />
        )}
        {currentStep.id === "instalacje" && (
          <ProjectWizardSystemsStep draft={draft} showValidation={showValidation} onChange={updateDraft} />
        )}
        {currentStep.id === "odpornosc" && (
          <ProjectWizardResistanceStep draft={draft} showValidation={showValidation} onChange={updateDraft} />
        )}
        {currentStep.id === "pliki" && (
          <ProjectWizardFilesStep draft={draft} showValidation={showValidation} onChange={updateDraft} />
        )}
        {currentStep.id === "cena" && (
          <ProjectWizardPricingStep draft={draft} showValidation={showValidation} onChange={updateDraft} />
        )}
        {isSummaryStep && <ProjectWizardSummaryStep draft={draft} countries={countries} />}
      </Stack>
      {saveError && (
        <Text className="text-status-blocked">
          Nie udało się zapisać zmian (limit pamięci przeglądarki). Spróbuj usunąć nieużywane dane albo
          zwolnić miejsce i spróbuj ponownie.
        </Text>
      )}
      <Stack direction="row" gap={2}>
        {stepIndex > 0 && (
          <Button type="button" variant="secondary" onClick={handleBack} className="w-fit">
            Wstecz
          </Button>
        )}
        {isSummaryStep ? (
          <Button type="button" onClick={handleSave} className="w-fit">
            Zapisz zmiany
          </Button>
        ) : (
          <Button type="button" onClick={handleNext} className="w-fit">
            Dalej
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
