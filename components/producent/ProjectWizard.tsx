"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import { createProduct } from "@/lib/producer-products";
import type { RegistrationDetails } from "@/lib/producer-registration";
import { saveRegistrationDetails } from "@/lib/producer-registration-storage";
import {
  WIZARD_STEPS,
  clearDraft,
  createEmptyDraft,
  isStepComplete,
  loadDraft,
  saveDraft,
} from "@/lib/producer-project-draft";
import { ProjectWizardBasicInfoStep } from "./ProjectWizardBasicInfoStep";
import { ProjectWizardFilesStep } from "./ProjectWizardFilesStep";
import { ProjectWizardPricingStep } from "./ProjectWizardPricingStep";
import { ProjectWizardProgress } from "./ProjectWizardProgress";
import { ProjectWizardSummaryStep } from "./ProjectWizardSummaryStep";
import { ProjectWizardTechnicalStep } from "./ProjectWizardTechnicalStep";

interface ProjectWizardProps {
  locale: string;
  countries: Country[];
  registration: RegistrationDetails;
}

export function ProjectWizard({ locale, countries, registration }: ProjectWizardProps) {
  const nip = registration.nip;
  const router = useRouter();
  const [draft, setDraft] = useState<ProjectDraft>(() => createEmptyDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Wczytanie zapisanego stanu tylko raz, przy montowaniu (spec 0008, AC-8): drugi NIP
  // w tej samej przeglądarce nigdy nie wznawia szkicu poprzedniego producenta, bo klucz
  // localStorage jest kluczowany NIP-em. Musi być efektem, nie leniwym stanem początkowym:
  // ta strona jest renderowana na serwerze (bez dostępu do localStorage), więc odczyt przed
  // hydracją dałby niezgodność z tym, co wyrenderował serwer. Dane rejestracji zapisujemy
  // tu też, żeby /producent/produkty i edycja mogły później działać samym ?nip= (spec 0016).
  useEffect(() => {
    saveRegistrationDetails(registration);
    const stored = loadDraft(nip);
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji, patrz komentarz wyżej
      setDraft(stored.draft);
      setStepIndex(stored.step);
      setMaxReachedIndex(stored.step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rejestracja jest stała dla całego montowania kreatora, nip wystarczy jako klucz efektu
  }, [nip]);

  function updateDraft(patch: Partial<ProjectDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(nip, next, stepIndex);
      return next;
    });
  }

  function goToStep(index: number, currentDraft: ProjectDraft) {
    setStepIndex(index);
    setShowValidation(false);
    saveDraft(nip, currentDraft, index);
  }

  function handleNext() {
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
    if (stepIndex === 0) return;
    goToStep(stepIndex - 1, draft);
  }

  function handleStepClick(index: number) {
    if (index === stepIndex || index > maxReachedIndex) return;
    goToStep(index, draft);
  }

  function handleSave() {
    const product = createProduct(nip, draft);
    if (product === null) {
      setSaveError(true);
      return;
    }
    clearDraft(nip);
    const params = new URLSearchParams({
      nazwa: draft.name,
      nip,
      countries: registration.countries.join(","),
      technology: registration.technology,
    });
    router.push(`/${locale}/producent/gotowosc-eksportowa?${params.toString()}`);
  }

  const currentStep = WIZARD_STEPS[stepIndex];
  const isSummaryStep = currentStep.id === "podsumowanie";

  return (
    <Stack gap={5}>
      <Heading level="h1">Dodaj pierwszy projekt</Heading>
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
        {currentStep.id === "techniczne" && (
          <ProjectWizardTechnicalStep draft={draft} showValidation={showValidation} onChange={updateDraft} />
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
          Nie udało się zapisać projektu (limit pamięci przeglądarki). Spróbuj usunąć nieużywane dane albo
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
            Zapisz projekt
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
