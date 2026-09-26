"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button, Card, Heading, Input, Label, Stack, Text, Textarea } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { ALL_PROJECT_TRANSLATION_LOCALES, type ProductTranslationLocale } from "@/lib/ai/product-translation";
import {
  generateProjectTranslations,
  getCostLineItemLabelTranslationsForProduct,
  type CostLineItemLabelTranslationPreview,
} from "@/lib/producer-project-translation-actions";
import { alignClientRequirementsTranslation } from "@/lib/producer-project-draft";

interface ProjectWizardTranslationsStepProps {
  // Wymaga już utworzonego produktu (krok "podstawowe" tworzy go jako
  // pierwszy, patrz komentarz w ProjectWizard.tsx) — kolejność WIZARD_STEPS
  // gwarantuje, że ten krok jest osiągalny dopiero po tym, jak productId
  // istnieje, ten sam wzorzec co ProjectWizardVariantsStep/ProjectWizardFilesStep.
  productId: string | null;
}

const LOCALE_FIELD: Record<ProductTranslationLocale, "En" | "Nl" | "De"> = { en: "En", nl: "Nl", de: "De" };

// alignRoomLayoutTranslation/alignFaqTranslation/alignClientRequirementsTranslation
// (lib/producer-project-draft.ts) zawsze zwracają jeden wpis na polski wiersz,
// z pustym stringiem gdy tłumaczenia jeszcze nie ma — więc "czy coś już
// wygenerowano" trzeba sprawdzić po treści pól, nie po długości tablicy.
function hasAnyExistingTranslation(values: ProjectDraft): boolean {
  return (
    values.descriptionEn.trim().length > 0 ||
    values.descriptionNl.trim().length > 0 ||
    values.descriptionDe.trim().length > 0 ||
    values.foundationOptionsEn.trim().length > 0 ||
    values.foundationOptionsNl.trim().length > 0 ||
    values.foundationOptionsDe.trim().length > 0 ||
    [...values.roomLayoutEn, ...values.roomLayoutNl, ...values.roomLayoutDe].some((row) => row.name.trim().length > 0) ||
    [...values.faqEn, ...values.faqNl, ...values.faqDe].some(
      (row) => row.question.trim().length > 0 || row.answer.trim().length > 0,
    ) ||
    [...values.clientRequirementsEn, ...values.clientRequirementsNl, ...values.clientRequirementsDe].some(
      (row) => row.label.trim().length > 0,
    )
  );
}

// Skonsolidowany etap tłumaczeń (spec 0050 AC-28 do AC-34): jedyne miejsce z
// zakładkami językowymi w obu kreatorach (AC-31, AC-32), zastępuje dawne
// zakładki EN/NL/DE rozsiane po krokach podstawowym/wariantów/FAQ.
// description/roomLayout/faq/clientRequirements są częścią ProjectDraft
// (react-hook-form) — ten krok je tylko wypełnia i pozwala poprawić, zapis
// idzie zwykłą ścieżką "Dalej"/"Zapisz" jak każdy inny krok
// (buildProducerSavePayload, stepId "tlumaczenia"). Sekcja wariantów
// (scopeSummary/excludedScope) usunięta razem z tymi polami (spec 0051 AC-10):
// co wchodzi w cenę tłumaczy się dziś przez niezależny słownik
// cost_line_item_label_translation, wypełniany automatycznie w tle
// (lib/producer-product-variant-actions.ts). Ten krok pokazuje go od
// 2026-09-25 jako podgląd tylko do odczytu (costLineItemLabels niżej), bez
// edycji stąd — patrz komentarz przy getCostLineItemLabelTranslationsForProduct.
export function ProjectWizardTranslationsStep({ productId }: ProjectWizardTranslationsStepProps) {
  const t = useTranslations("ProjectWizardTranslationsStep");
  const { control, register, setValue, getValues } = useFormContext<ProjectDraft>();
  const roomLayout = useWatch({ control, name: "roomLayout" });
  const faq = useWatch({ control, name: "faq" });
  const clientRequirements = useWatch({ control, name: "clientRequirements" });
  const customRequirements = clientRequirements.filter((requirement) => requirement.custom);
  const clientRequirementsEnArray = useFieldArray({ control, name: "clientRequirementsEn" });
  const clientRequirementsNlArray = useFieldArray({ control, name: "clientRequirementsNl" });
  const clientRequirementsDeArray = useFieldArray({ control, name: "clientRequirementsDe" });

  const [activeLocale, setActiveLocale] = useState<ProductTranslationLocale>("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  // Inicjalizowane raz z aktualnego stanu formularza (nie zawsze false): przy
  // edycji istniejącego produktu descriptionEn/roomLayoutEn/faqEn/
  // clientRequirementsEn są już wypełnione z bazy (patrz initialDraft w
  // app/[locale]/producer/panel/products/[id]/edit/page.tsx) — bez tego krok
  // pokazywał pusty ekran "Wygeneruj tłumaczenia" nawet dla produktu, który je
  // już ma, dopóki producent nie kliknął ponownie generowania. Znalezione na
  // żywo 2026-09-25.
  const [hasGenerated, setHasGenerated] = useState(() => hasAnyExistingTranslation(getValues()));
  const [costLineItemLabels, setCostLineItemLabels] = useState<CostLineItemLabelTranslationPreview[]>([]);

  // Podgląd, tylko do odczytu, tego co generateMissingCostLineItemLabelTranslations
  // (lib/producer-project-translation-actions.ts) już dopisało w tle do
  // cost_line_item_label_translation dla pozycji kosztowych TEGO produktu —
  // ten krok wcześniej nie pokazywał tego wcale (spec 0051 AC-10 świadomie
  // wyłączyło "co wchodzi w cenę" z tej sekcji), więc producent nie miał jak
  // sprawdzić, czy tłumaczenie w ogóle powstało. Ładowane raz przy wejściu na
  // krok (nie ma tu żadnego przycisku "Generuj" — wypełnia się samo przy
  // zapisie wariantu/pozycji kosztowej), błąd wczytania po cichu zostawia listę
  // pustą zamiast psuć resztę kroku.
  useEffect(() => {
    if (productId === null) return;
    let cancelled = false;
    getCostLineItemLabelTranslationsForProduct(productId).then((result) => {
      if (!cancelled && result.ok && result.labels) setCostLineItemLabels(result.labels);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Wymagania klienta: tłumaczenie zarządzane tu, ale lista PL (custom: true)
  // zarządzana w kroku technicznym (ProjectWizardTechnicalStep) — bez
  // gwarancji lockstep jak roomLayout/faq (tamte kroki trzymają PL i
  // tłumaczenie razem). Wyrównanie po id przy każdej zmianie listy własnych
  // pozycji, ten sam wzorzec co strona edycji (alignClientRequirementsTranslation).
  useEffect(() => {
    clientRequirementsEnArray.replace(alignClientRequirementsTranslation(clientRequirements, getValues("clientRequirementsEn")));
    clientRequirementsNlArray.replace(alignClientRequirementsTranslation(clientRequirements, getValues("clientRequirementsNl")));
    clientRequirementsDeArray.replace(alignClientRequirementsTranslation(clientRequirements, getValues("clientRequirementsDe")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customRequirements.map((requirement) => requirement.id).join(",")]);

  async function handleGenerate(locales: readonly ProductTranslationLocale[] = ALL_PROJECT_TRANSLATION_LOCALES) {
    if (productId === null) return;
    setIsGenerating(true);
    setGenerationError(null);
    const result = await generateProjectTranslations(productId, locales);
    setIsGenerating(false);
    if (!result.ok || !result.draft) {
      setGenerationError(result.error ?? t("genericError"));
      return;
    }
    const draft = result.draft;
    setHasGenerated(true);

    for (const locale of locales) {
      const field = LOCALE_FIELD[locale];
      setValue(`description${field}`, draft.description[locale] ?? "");
      setValue(`foundationOptions${field}`, draft.foundationOptions[locale] ?? "");

      const roomLayoutField = `roomLayout${field}` as const;
      draft.roomLayout.forEach((room) => {
        const index = roomLayout.findIndex((row) => row.id === room.id);
        if (index !== -1) setValue(`${roomLayoutField}.${index}.name`, room.name[locale] ?? "");
      });

      const faqField = `faq${field}` as const;
      draft.faq.forEach((entry) => {
        const index = faq.findIndex((row) => row.id === entry.id);
        if (index !== -1) {
          setValue(`${faqField}.${index}.question`, entry.question[locale] ?? "");
          setValue(`${faqField}.${index}.answer`, entry.answer[locale] ?? "");
        }
      });

      const requirementField = `clientRequirements${field}` as const;
      draft.clientRequirements.forEach((requirement) => {
        const index = customRequirements.findIndex((row) => row.id === requirement.id);
        if (index !== -1) setValue(`${requirementField}.${index}.label`, requirement.label[locale] ?? "");
      });
    }
  }

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level="h2">{t("heading")}</Heading>
        <Text tone="muted">{t("intro")}</Text>
      </Stack>

      <Stack direction="row" gap={2} className="items-center">
        <Button type="button" onClick={() => handleGenerate()} disabled={isGenerating || productId === null} className="w-fit">
          {isGenerating ? t("generatingLabel") : hasGenerated ? t("regenerateAllButton") : t("generateButton")}
        </Button>
        {generationError && (
          <p role="alert" className="text-body text-status-blocked">
            {generationError}
          </p>
        )}
      </Stack>

      {!hasGenerated && costLineItemLabels.length === 0 && !isGenerating && <Text tone="muted">{t("emptyHint")}</Text>}

      {(hasGenerated || costLineItemLabels.length > 0) && (
        <Stack gap={3}>
          <div role="tablist" aria-label={t("languageTabsLabel")} className="flex gap-brand-1">
            {ALL_PROJECT_TRANSLATION_LOCALES.map((locale) => (
              <Button
                key={locale}
                type="button"
                role="tab"
                aria-selected={activeLocale === locale}
                variant={activeLocale === locale ? "primary" : "secondary"}
                size="sm"
                onClick={() => setActiveLocale(locale)}
              >
                {t(`localeLabel.${locale}`)}
              </Button>
            ))}
          </div>

          {hasGenerated && (
            <Stack direction="row" gap={2} className="items-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit"
                disabled={isGenerating}
                onClick={() => handleGenerate([activeLocale])}
              >
                {t("regenerateOneButton", { language: t(`localeLabel.${activeLocale}`) })}
              </Button>
            </Stack>
          )}

          {hasGenerated && (
            <Stack gap={2}>
              <Label htmlFor={`translation-description-${activeLocale}`}>{t("descriptionLabel")}</Label>
              <Textarea id={`translation-description-${activeLocale}`} {...register(`description${LOCALE_FIELD[activeLocale]}`)} />
            </Stack>
          )}

          {hasGenerated && (
            <Stack gap={2}>
              <Label htmlFor={`translation-foundation-options-${activeLocale}`}>{t("foundationOptionsLabel")}</Label>
              <Input
                id={`translation-foundation-options-${activeLocale}`}
                {...register(`foundationOptions${LOCALE_FIELD[activeLocale]}`)}
              />
            </Stack>
          )}

          {costLineItemLabels.length > 0 && (
            <Stack gap={2}>
              <Text as="span" variant="label">
                {t("costLineItemsHeading")}
              </Text>
              <Text tone="muted" className="text-body-sm">
                {t("costLineItemsHint")}
              </Text>
              {costLineItemLabels.map((item) => (
                <Stack key={item.labelPl} direction="row" gap={2} className="items-baseline">
                  <Text tone="muted" className="min-w-32 shrink-0">
                    {item.labelPl}
                  </Text>
                  <Text>{item.translations[activeLocale] ?? t("costLineItemNotTranslatedYet")}</Text>
                </Stack>
              ))}
            </Stack>
          )}

          {hasGenerated && roomLayout.length > 0 && (
            <Stack gap={2}>
              <Text as="span" variant="label">
                {t("roomLayoutHeading")}
              </Text>
              {roomLayout.map((room, index) => (
                <Stack key={room.id} direction="row" gap={2} className="items-center">
                  <Text tone="muted" className="min-w-32 shrink-0">
                    {room.name}
                  </Text>
                  <Input
                    aria-label={t("roomNameTranslationLabel", { name: room.name })}
                    {...register(`roomLayout${LOCALE_FIELD[activeLocale]}.${index}.name`)}
                  />
                </Stack>
              ))}
            </Stack>
          )}

          {hasGenerated && faq.length > 0 && (
            <Stack gap={2}>
              <Text as="span" variant="label">
                {t("faqHeading")}
              </Text>
              {faq.map((entry, index) => (
                <Card key={entry.id} padding="sm">
                  <Stack gap={2}>
                    <Input
                      aria-label={t("faqQuestionTranslationLabel", { index: index + 1 })}
                      placeholder={t("faqQuestionTranslationLabel", { index: index + 1 })}
                      {...register(`faq${LOCALE_FIELD[activeLocale]}.${index}.question`)}
                    />
                    <Textarea
                      aria-label={t("faqAnswerTranslationLabel", { index: index + 1 })}
                      placeholder={t("faqAnswerTranslationLabel", { index: index + 1 })}
                      {...register(`faq${LOCALE_FIELD[activeLocale]}.${index}.answer`)}
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}

          {hasGenerated && customRequirements.length > 0 && (
            <Stack gap={2}>
              <Text as="span" variant="label">
                {t("clientRequirementsHeading")}
              </Text>
              {customRequirements.map((requirement, index) => (
                <Stack key={requirement.id} direction="row" gap={2} className="items-center">
                  <Text tone="muted" className="min-w-32 shrink-0">
                    {requirement.label}
                  </Text>
                  <Input
                    aria-label={t("requirementTranslationLabel", { label: requirement.label })}
                    {...register(`clientRequirements${LOCALE_FIELD[activeLocale]}.${index}.label`)}
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
