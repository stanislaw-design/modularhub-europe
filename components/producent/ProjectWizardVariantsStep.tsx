"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Copy, Plus, Star, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useFormContext, useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Checkbox, Heading, Input, Label, Radio, Select, Stack, Text, Textarea } from "@/components/ui";
import type { CompletionStandard, CostLineItemStatus, ProjectDraft, TimelineStageKey } from "@/lib/data/types";
import type { ProducerVariantForEdit } from "@/lib/db/queries";
import {
  TIMELINE_STAGE_KEYS,
  getCompletionStandardOptions,
  getCostLineItemStatusOptions,
  getTimelineStageKeyOptions,
} from "@/lib/producer-project-draft";
import {
  cloneVariant,
  createVariant,
  deleteCostLineItem,
  deleteVariant,
  setDefaultVariant,
  updateVariant,
  upsertCostLineItem,
  upsertTimelineStage,
} from "@/lib/producer-product-variant-actions";
import {
  extractStandardsFromMaterial,
  type ExtractedCostLineItem,
  type ExtractedStandard,
} from "@/lib/producer-standards-extraction-actions";

const COMPLETION_STANDARDS: CompletionStandard[] = ["surowy-zamkniety", "deweloperski", "pod-klucz"];
const MAX_VARIANTS = 3;

interface CostItemFormValue {
  itemId: string | null;
  label: string;
  status: CostLineItemStatus;
  responsibleParty: string;
}

interface TimelineStageFormValue {
  stageKey: TimelineStageKey;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  startsFromLabel: string;
  responsibleParty: string;
}

interface VariantFormValue {
  variantId: string;
  completionStandard: CompletionStandard;
  isDefault: boolean;
  // Spec 0051 AC-1, AC-9: jedna cena "od", priceMaxEur usunięty; co wchodzi w
  // cenę żyje wyłącznie w costLineItems niżej (scopeSummary/excludedScope
  // usunięte z product_variant razem z ich tłumaczeniem w
  // ProjectWizardTranslationsStep).
  priceMinEur: number | null;
  // Wycena indywidualna (spec 0050 AC-13, AC-37): jawna flaga, wyklucza
  // priceMinEur (CHECK product_variant_price_on_request).
  priceOnRequest: boolean;
  costLineItems: CostItemFormValue[];
  timelineStages: TimelineStageFormValue[];
}

interface VariantsFormValues {
  variants: VariantFormValue[];
}

const costItemSchema = z.object({
  itemId: z.string().nullable(),
  label: z.string(),
  status: z.enum(["w-cenie", "obowiazkowa-doplata", "opcja", "po-stronie-klienta", "do-wyceny"]),
  responsibleParty: z.string(),
});

const timelineStageSchema = z.object({
  stageKey: z.enum(["formalnosci", "produkcja", "transport", "montaz", "wykonczenie"]),
  durationMinDays: z.number().nullable(),
  durationMaxDays: z.number().nullable(),
  startsFromLabel: z.string(),
  responsibleParty: z.string(),
});

const variantSchema = z.object({
  variantId: z.string(),
  completionStandard: z.enum(["surowy-zamkniety", "deweloperski", "pod-klucz"]),
  isDefault: z.boolean(),
  priceMinEur: z.number().nullable(),
  priceOnRequest: z.boolean(),
  costLineItems: z.array(costItemSchema),
  timelineStages: z.array(timelineStageSchema),
});

const variantsFormSchema = z.object({ variants: z.array(variantSchema) });

function emptyTimelineStages(): TimelineStageFormValue[] {
  return TIMELINE_STAGE_KEYS.map((stageKey) => ({
    stageKey,
    durationMinDays: null,
    durationMaxDays: null,
    startsFromLabel: "",
    responsibleParty: "",
  }));
}

// AC-9: pozycje kosztowe zaproponowane przez AI dopisywane do listy
// istniejącej/nowej, nigdy nie zastępujące ręcznie wpisanych, odfiltrowane od
// duplikatów po dokładnym tekście etykiety (zarówno względem już istniejących
// pozycji, jak i między sobą w tej samej propozycji).
function mergeCostLineItems(existing: CostItemFormValue[], proposed: ExtractedCostLineItem[]): CostItemFormValue[] {
  const seenLabels = new Set(existing.map((item) => item.label));
  const appended: CostItemFormValue[] = [];
  for (const item of proposed) {
    if (seenLabels.has(item.label)) continue;
    seenLabels.add(item.label);
    appended.push({ itemId: null, label: item.label, status: item.status, responsibleParty: "" });
  }
  return [...existing, ...appended];
}

function initialVariantsToFormValues(initialVariants: ProducerVariantForEdit[]): VariantFormValue[] {
  return initialVariants.map((variant) => ({
    variantId: variant.id,
    completionStandard: variant.completionStandard,
    isDefault: variant.isDefault,
    priceMinEur: variant.priceMinCents === null ? null : variant.priceMinCents / 100,
    priceOnRequest: variant.priceOnRequest,
    costLineItems: variant.costLineItems.map((item) => ({
      itemId: item.id,
      label: item.label,
      status: item.status,
      responsibleParty: item.responsibleParty ?? "",
    })),
    timelineStages: TIMELINE_STAGE_KEYS.map((stageKey) => {
      const stage = variant.timelineStages.find((row) => row.stageKey === stageKey);
      return {
        stageKey,
        durationMinDays: stage?.durationMinDays ?? null,
        durationMaxDays: stage?.durationMaxDays ?? null,
        startsFromLabel: stage?.startsFromLabel ?? "",
        responsibleParty: stage?.responsibleParty ?? "",
      };
    }),
  }));
}

interface ProjectWizardVariantsStepProps {
  productId: string | null;
  // ProductEditWizard (spec 0045 Build plan zadanie 13, wywołane wcześniej na
  // prośbę producenta, żeby móc przetestować krok na istniejącym projekcie)
  // podaje realne warianty z lib/db/queries.ts#getProducerVariantsForEdit;
  // ProjectWizard (nowy projekt) zostawia to puste, bo produkt jeszcze nie ma
  // żadnego wariantu.
  initialVariants?: ProducerVariantForEdit[];
  // Wydobywanie standardów z materiału (spec 0050 AC-13 do AC-19) w obu
  // kreatorach, tworzenia i edycji istniejącego, opublikowanego produktu
  // (spec 0052, odwraca dawne AC-41 spec 0050) — oba ustawiają to na true.
  enableStandardsExtraction?: boolean;
}

type StandardProposal = ExtractedStandard & { targetStandard: CompletionStandard };

// Cena/pozycje kosztowe/etapy zapisują się wyłącznie przyciskiem "Zapisz
// wariant" na karcie (patrz komentarz nad komponentem), żeby nie odpalać
// zapytania na każde naciśnięcie klawisza — ale to znaczyło też, że
// nawigacja "Dalej"/"Wstecz"/kliknięcie innego kroku (które odmontowuje ten
// komponent) po cichu gubiła każdą niezapisaną w ten sposób zmianę, mimo że
// reszta kreatora zawsze zapisuje cały krok przy "Dalej". Rodzic
// (ProjectWizard/ProductEditWizard) woła saveAllPending() przez ten ref tuż
// przed każdą nawigacją, więc odejście z kroku bez kliknięcia "Zapisz
// wariant" nadal utrwala to, co producent wpisał.
export interface ProjectWizardVariantsStepHandle {
  saveAllPending: () => Promise<boolean>;
}

// Krok "Warianty i cennik" (spec 0045 AC-1, AC-2, AC-10, Build plan zadanie
// 5), zastępujący dawny krok "Cena" (usunięty w zadaniu 12, patrz komentarz
// przy WIZARD_STEPS w lib/producer-project-draft.ts). Stan wariantów żyje we własnym, lokalnym
// useForm/useFieldArray (spec 0045 AC-14), nie w ProjectDraft z
// ProjectWizard/ProductEditWizard: product_variant/cost_line_item/
// product_timeline_stage są prawdziwymi tabelami z własną, granularną
// autoryzacją (lib/producer-product-variant-actions.ts, AC-12) — dodanie,
// klonowanie, usunięcie i zmiana domyślnego wariantu zapisują się od razu
// (ten sam wzorzec co ProducerProductPhotosStep), edycja pól wariantu
// (cena/opis/pozycje kosztowe/etapy) zapisuje się przyciskiem "Zapisz wariant"
// na karcie, żeby nie odpalać osobnego zapytania na każde naciśnięcie klawisza.
// Do rodzica (ProjectWizard) wraca tylko lekka migawka przez setValue na
// draft.variantsSummary — patrz onVariantsSummaryChange niżej — żeby
// isStepComplete("warianty", ...) miało co sprawdzić bez czytania bazy.
export const ProjectWizardVariantsStep = forwardRef<ProjectWizardVariantsStepHandle, ProjectWizardVariantsStepProps>(
  function ProjectWizardVariantsStep({ productId, initialVariants = [], enableStandardsExtraction = false }, ref) {
  const t = useTranslations("ProjectWizardVariantsStep");
  const tOptions = useTranslations("ProjectOptions");
  const outerForm = useFormContext<ProjectDraft>();
  const localForm = useForm<VariantsFormValues>({
    defaultValues: { variants: initialVariantsToFormValues(initialVariants) },
    resolver: zodResolver(variantsFormSchema),
    mode: "onBlur",
  });
  const { control, getValues, setValue } = localForm;
  const { fields, append, remove, update, move } = useFieldArray({ control, name: "variants" });
  const [pendingAction, setPendingAction] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [addStandard, setAddStandard] = useState<CompletionStandard | null>(null);
  const [cloneSourceIndex, setCloneSourceIndex] = useState<number | null>(null);
  const [cloneStandard, setCloneStandard] = useState<CompletionStandard | null>(null);

  // Wydobywanie standardów z materiału (spec 0050 AC-13 do AC-19): materiał
  // (tekst wklejony albo plik) nigdy nie jest zapisywany (AC-17) — po
  // wywołaniu extractStandardsFromMaterial żyje tylko w tym stanie, jako
  // lista propozycji do ręcznego zatwierdzenia/pominięcia (AC-15), nigdy
  // zapisywanych automatycznie.
  const [materialMode, setMaterialMode] = useState<"text" | "file">("text");
  const [materialText, setMaterialText] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<StandardProposal[]>([]);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  const watchedVariants = useWatch({ control, name: "variants" });

  // Migawka na potrzeby isStepComplete("warianty", ...), patrz komentarz nad
  // komponentem — synchronizowana za każdym razem, gdy zmienia się lokalna
  // lista wariantów (dodanie/klonowanie/usunięcie/zmiana domyślnego/cena).
  useEffect(() => {
    outerForm.setValue(
      "variantsSummary",
      watchedVariants.map((variant) => ({
        isDefault: variant.isDefault,
        priceMinCents: variant.priceMinEur === null ? null : Math.round(variant.priceMinEur * 100),
      })),
    );
    // outerForm.setValue jest stabilne (react-hook-form), watchedVariants jedyną realną zależnością.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedVariants]);

  const usedStandards = new Set(fields.map((field) => field.completionStandard));
  const availableStandards = COMPLETION_STANDARDS.filter((standard) => !usedStandards.has(standard));
  const standardOptions = getCompletionStandardOptions(tOptions);
  const statusOptions = getCostLineItemStatusOptions(tOptions);
  const canAddMore = fields.length < MAX_VARIANTS && availableStandards.length > 0;

  // Jedyne miejsce, które faktycznie zapisuje cenę/pozycje kosztowe/etapy
  // wariantu — dawniej żyło wyłącznie wewnątrz VariantCard (handleSave), tu
  // podniesione, żeby zarówno przycisk "Zapisz wariant" na karcie
  // (przez onSave przekazane niżej), jak i saveAllPending() (przez ref, patrz
  // komentarz przy ProjectWizardVariantsStepHandle) mogły wywołać dokładnie tę
  // samą logikę zamiast dwóch kopii do rozjechania.
  async function saveVariant(index: number): Promise<{ ok: boolean; error?: string }> {
    const current = getValues(`variants.${index}`);

    const variantResult = await updateVariant(current.variantId, {
      priceMinEur: current.priceMinEur,
      priceOnRequest: current.priceOnRequest,
      variantLabel: "",
    });
    if (!variantResult.ok) return { ok: false, error: variantResult.error };

    for (let i = 0; i < current.costLineItems.length; i++) {
      const item = current.costLineItems[i];
      if (!item.label.trim()) continue;
      const itemResult = await upsertCostLineItem(current.variantId, {
        id: item.itemId,
        label: item.label,
        status: item.status,
        responsibleParty: item.responsibleParty,
      });
      if (!itemResult.ok) return { ok: false, error: itemResult.error };
      if (item.itemId === null && itemResult.itemId) {
        setValue(`variants.${index}.costLineItems.${i}.itemId`, itemResult.itemId);
      }
    }

    for (const stage of current.timelineStages) {
      const stageResult = await upsertTimelineStage(current.variantId, stage.stageKey, {
        durationMinDays: stage.durationMinDays,
        durationMaxDays: stage.durationMaxDays,
        startsFromLabel: stage.startsFromLabel,
        responsibleParty: stage.responsibleParty,
      });
      if (!stageResult.ok) return { ok: false, error: stageResult.error };
    }

    return { ok: true };
  }

  useImperativeHandle(ref, () => ({
    saveAllPending: async () => {
      let allOk = true;
      for (let i = 0; i < fields.length; i++) {
        const result = await saveVariant(i);
        if (!result.ok) allOk = false;
      }
      return allOk;
    },
  }));

  async function handleAddVariant() {
    if (!productId || addStandard === null) return;
    setPendingAction(true);
    setListError(null);
    const result = await createVariant(productId, addStandard);
    setPendingAction(false);
    if (!result.ok || !result.variantId) {
      setListError(result.error ?? t("genericError"));
      return;
    }
    append({
      variantId: result.variantId,
      completionStandard: addStandard,
      isDefault: fields.length === 0,
      priceMinEur: null,
      priceOnRequest: false,
      costLineItems: [],
      timelineStages: emptyTimelineStages(),
    });
    setAddStandard(null);
  }

  async function handleCloneVariant() {
    if (cloneSourceIndex === null || cloneStandard === null) return;
    const source = getValues(`variants.${cloneSourceIndex}`);
    setPendingAction(true);
    setListError(null);
    const result = await cloneVariant(source.variantId, cloneStandard);
    setPendingAction(false);
    if (!result.ok || !result.variant) {
      setListError(result.error ?? t("genericError"));
      return;
    }
    const cloned = result.variant;
    append({
      variantId: cloned.variantId,
      completionStandard: cloneStandard,
      isDefault: false,
      priceMinEur: cloned.priceMinCents === null ? null : cloned.priceMinCents / 100,
      priceOnRequest: cloned.priceOnRequest,
      costLineItems: cloned.costLineItems.map((item) => ({
        itemId: item.id,
        label: item.label,
        status: item.status,
        responsibleParty: item.responsibleParty ?? "",
      })),
      timelineStages: TIMELINE_STAGE_KEYS.map((stageKey) => {
        const stage = cloned.timelineStages.find((row) => row.stageKey === stageKey);
        return {
          stageKey,
          durationMinDays: stage?.durationMinDays ?? null,
          durationMaxDays: stage?.durationMaxDays ?? null,
          startsFromLabel: stage?.startsFromLabel ?? "",
          responsibleParty: stage?.responsibleParty ?? "",
        };
      }),
    });
    setCloneSourceIndex(null);
    setCloneStandard(null);
  }

  async function handleExtractStandards() {
    if (!productId) return;
    const material =
      materialMode === "text" ? { kind: "text" as const, text: materialText } : materialFile ? { kind: "file" as const, file: materialFile } : null;
    if (!material) return;
    setIsExtracting(true);
    setExtractionError(null);
    const result = await extractStandardsFromMaterial(productId, material);
    setIsExtracting(false);
    if (!result.ok || !result.standards) {
      setExtractionError(result.error ?? t("extractError"));
      return;
    }
    setProposals((current) => [
      ...current,
      ...result.standards!.map((standard) => ({ ...standard, targetStandard: standard.proposedStandard })),
    ]);
    setMaterialText("");
    setMaterialFile(null);
  }

  function handleProposalChange(proposalIndex: number, patch: Partial<StandardProposal>) {
    setProposals((current) => current.map((proposal, index) => (index === proposalIndex ? { ...proposal, ...patch } : proposal)));
  }

  function handleSkipProposal(proposalIndex: number) {
    setProposals((current) => current.filter((_, index) => index !== proposalIndex));
  }

  // AC-9: producent może poprawić/usunąć/dopisać pozycję kosztową zaproponowaną
  // przez AI zanim ją zatwierdzi (handleApplyProposal), zanim cokolwiek trafi
  // do listy wariantu.
  function handleProposalCostItemChange(proposalIndex: number, itemIndex: number, patch: Partial<ExtractedCostLineItem>) {
    setProposals((current) =>
      current.map((proposal, index) =>
        index === proposalIndex
          ? { ...proposal, costLineItems: proposal.costLineItems.map((item, i) => (i === itemIndex ? { ...item, ...patch } : item)) }
          : proposal,
      ),
    );
  }

  function handleAddProposalCostItem(proposalIndex: number) {
    setProposals((current) =>
      current.map((proposal, index) =>
        index === proposalIndex ? { ...proposal, costLineItems: [...proposal.costLineItems, { label: "", status: "w-cenie" }] } : proposal,
      ),
    );
  }

  function handleRemoveProposalCostItem(proposalIndex: number, itemIndex: number) {
    setProposals((current) =>
      current.map((proposal, index) =>
        index === proposalIndex
          ? { ...proposal, costLineItems: proposal.costLineItems.filter((_, i) => i !== itemIndex) }
          : proposal,
      ),
    );
  }

  // AC-15: dopasowana pozycja (po proposal.targetStandard, który producent
  // zawsze może poprawić przed zatwierdzeniem) dostaje nowe wartości przez
  // updateVariant; brak dopasowania i wolny slot tworzy nowy wariant przez
  // createVariant + updateVariant (createVariant przyjmuje tylko standard, nie
  // resztę pól). Nigdy nie zapisuje się automatycznie — tylko na to kliknięcie.
  async function handleApplyProposal(proposalIndex: number) {
    if (!productId) return;
    const proposal = proposals[proposalIndex];
    if (!proposal) return;
    setPendingAction(true);
    setListError(null);

    const existingIndex = fields.findIndex((field) => field.completionStandard === proposal.targetStandard);
    const updateFields = {
      priceMinEur: proposal.priceEur,
      priceOnRequest: proposal.priceOnRequest,
      variantLabel: proposal.name ?? "",
    };

    if (existingIndex !== -1) {
      const existing = getValues(`variants.${existingIndex}`);
      const result = await updateVariant(existing.variantId, updateFields);
      setPendingAction(false);
      if (!result.ok) {
        setListError(result.error ?? t("genericError"));
        return;
      }
      // AC-9: pozycje kosztowe nigdy nie zapisują się tu same z siebie — trafiają
      // do lokalnego stanu formularza, zapis idzie dopiero przy "Zapisz wariant".
      update(existingIndex, {
        ...existing,
        priceMinEur: proposal.priceEur,
        priceOnRequest: proposal.priceOnRequest,
        costLineItems: mergeCostLineItems(existing.costLineItems, proposal.costLineItems),
      });
    } else {
      if (fields.length >= MAX_VARIANTS) {
        setPendingAction(false);
        setListError(t("maxVariantsReachedError"));
        return;
      }
      const created = await createVariant(productId, proposal.targetStandard);
      if (!created.ok || !created.variantId) {
        setPendingAction(false);
        setListError(created.error ?? t("genericError"));
        return;
      }
      const updated = await updateVariant(created.variantId, updateFields);
      setPendingAction(false);
      if (!updated.ok) {
        setListError(updated.error ?? t("genericError"));
        return;
      }
      append({
        variantId: created.variantId,
        completionStandard: proposal.targetStandard,
        isDefault: fields.length === 0,
        priceMinEur: proposal.priceEur,
        priceOnRequest: proposal.priceOnRequest,
        costLineItems: mergeCostLineItems([], proposal.costLineItems),
        timelineStages: emptyTimelineStages(),
      });
    }
    setProposals((current) => current.filter((_, index) => index !== proposalIndex));
  }

  async function handleSetDefault(index: number) {
    const variant = getValues(`variants.${index}`);
    if (variant.isDefault) return;
    setPendingAction(true);
    setListError(null);
    const result = await setDefaultVariant(variant.variantId);
    setPendingAction(false);
    if (!result.ok) {
      setListError(result.error ?? t("genericError"));
      return;
    }
    fields.forEach((field, fieldIndex) => {
      update(fieldIndex, { ...getValues(`variants.${fieldIndex}`), isDefault: fieldIndex === index });
    });
  }

  async function handleDeleteVariant(index: number) {
    const variant = getValues(`variants.${index}`);
    setPendingAction(true);
    setListError(null);
    const result = await deleteVariant(variant.variantId);
    setPendingAction(false);
    if (!result.ok) {
      setListError(result.error ?? t("genericError"));
      return;
    }
    remove(index);
  }

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level="h2">{t("heading")}</Heading>
        <Text tone="muted">{t("intro")}</Text>
      </Stack>

      {listError && (
        <p role="alert" className="rounded-data bg-status-blocked/10 px-brand-2 py-1 text-body text-status-blocked">
          {listError}
        </p>
      )}

      {enableStandardsExtraction && (
        <Card padding="sm">
          <Stack gap={2}>
            <Text as="span" variant="label">
              {t("extractHeading")}
            </Text>
            <Text tone="muted">{t("extractHint")}</Text>
            <Text tone="muted" className="text-data">
              {t("extractExampleHint")}
            </Text>

            <div role="tablist" aria-label={t("materialModeLabel")} className="flex gap-brand-1">
              <Button
                type="button"
                role="tab"
                aria-selected={materialMode === "text"}
                variant={materialMode === "text" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMaterialMode("text")}
              >
                {t("materialModeTextTab")}
              </Button>
              <Button
                type="button"
                role="tab"
                aria-selected={materialMode === "file"}
                variant={materialMode === "file" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMaterialMode("file")}
              >
                {t("materialModeFileTab")}
              </Button>
            </div>

            {materialMode === "text" ? (
              <Stack gap={1}>
                <Label htmlFor="wizard-standards-material-text">{t("materialTextLabel")}</Label>
                <Textarea
                  id="wizard-standards-material-text"
                  rows={5}
                  value={materialText}
                  onChange={(event) => setMaterialText(event.target.value)}
                />
              </Stack>
            ) : (
              <Stack gap={1}>
                <Label htmlFor="wizard-standards-material-file">{t("materialFileLabel")}</Label>
                <div className="flex items-center gap-brand-2">
                  <input
                    ref={materialFileInputRef}
                    id="wizard-standards-material-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => setMaterialFile(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => materialFileInputRef.current?.click()}>
                    <Upload className="size-4" aria-hidden="true" />
                    {t("materialChooseFileButton")}
                  </Button>
                  {materialFile && <Text as="span">{materialFile.name}</Text>}
                </div>
              </Stack>
            )}
            <Text tone="muted" className="text-data">
              {t("materialNotSavedNotice")}
            </Text>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              disabled={
                isExtracting ||
                !productId ||
                (materialMode === "text" ? materialText.trim().length === 0 : materialFile === null)
              }
              onClick={handleExtractStandards}
            >
              {isExtracting ? t("extractPending") : t("extractAction")}
            </Button>
            {extractionError && (
              <p role="alert" className="rounded-data bg-status-blocked/10 px-brand-2 py-1 text-body text-status-blocked">
                {extractionError}
              </p>
            )}
          </Stack>
        </Card>
      )}

      {proposals.length > 0 && (
        <Stack gap={3}>
          <Text as="span" variant="label">
            {t("proposalsHeading")}
          </Text>
          {proposals.map((proposal, proposalIndex) => {
            const proposalTargetOptions =
              fields.length >= MAX_VARIANTS ? standardOptions.filter((option) => usedStandards.has(option.value)) : standardOptions;
            return (
              <Card key={proposalIndex} padding="sm">
                <Stack gap={2}>
                  <Text as="span" tone="muted" className="text-data">
                    {t(`confidenceBadge.${proposal.confidence}`)}
                  </Text>
                  <Stack gap={1} className="min-w-48">
                    <Label id={`proposal-${proposalIndex}-standard-label`}>{t("proposalStandardLabel")}</Label>
                    <Select
                      value={proposal.targetStandard}
                      onChange={(value) => handleProposalChange(proposalIndex, { targetStandard: value as CompletionStandard })}
                      options={proposalTargetOptions}
                      aria-labelledby={`proposal-${proposalIndex}-standard-label`}
                    />
                  </Stack>
                  <Stack gap={1}>
                    <Label htmlFor={`proposal-${proposalIndex}-name`}>{t("proposalNameLabel")}</Label>
                    <Input
                      id={`proposal-${proposalIndex}-name`}
                      value={proposal.name ?? ""}
                      onChange={(event) => handleProposalChange(proposalIndex, { name: event.target.value })}
                    />
                  </Stack>
                  <Stack gap={1} className="min-w-40 flex-1">
                    <Label htmlFor={`proposal-${proposalIndex}-price-min`}>{t("priceMinLabel")}</Label>
                    <Input
                      id={`proposal-${proposalIndex}-price-min`}
                      type="number"
                      min={0}
                      disabled={proposal.priceOnRequest}
                      value={proposal.priceEur ?? ""}
                      onChange={(event) =>
                        handleProposalChange(proposalIndex, {
                          priceEur: event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                    />
                  </Stack>
                  <label className="flex w-fit items-center gap-2 text-body">
                    <Checkbox
                      checked={proposal.priceOnRequest}
                      onChange={(event) => handleProposalChange(proposalIndex, { priceOnRequest: event.target.checked })}
                    />
                    {t("priceOnRequestLabel")}
                  </label>
                  <Stack gap={2}>
                    <Text as="span" variant="label">
                      {t("costLineItemsHeading")}
                    </Text>
                    {proposal.costLineItems.map((item, itemIndex) => (
                      <Stack key={itemIndex} direction="row" gap={2} className="flex-wrap items-end">
                        <Stack gap={1} className="min-w-40 flex-1">
                          <Label htmlFor={`proposal-${proposalIndex}-cost-${itemIndex}-label`}>{t("costLineItemLabelLabel")}</Label>
                          <Input
                            id={`proposal-${proposalIndex}-cost-${itemIndex}-label`}
                            value={item.label}
                            onChange={(event) => handleProposalCostItemChange(proposalIndex, itemIndex, { label: event.target.value })}
                          />
                        </Stack>
                        <Stack gap={1} className="min-w-40">
                          <Label id={`proposal-${proposalIndex}-cost-${itemIndex}-status-label`}>{t("costLineItemStatusLabel")}</Label>
                          <Select
                            value={item.status}
                            onChange={(value) => handleProposalCostItemChange(proposalIndex, itemIndex, { status: value as CostLineItemStatus })}
                            options={statusOptions}
                            aria-labelledby={`proposal-${proposalIndex}-cost-${itemIndex}-status-label`}
                          />
                        </Stack>
                        <button
                          type="button"
                          onClick={() => handleRemoveProposalCostItem(proposalIndex, itemIndex)}
                          aria-label={t("removeCostLineItemLabel")}
                          className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </Stack>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-fit"
                      onClick={() => handleAddProposalCostItem(proposalIndex)}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      {t("addCostLineItemButton")}
                    </Button>
                  </Stack>
                  <Stack direction="row" gap={2}>
                    <Button type="button" size="sm" disabled={pendingAction} onClick={() => handleApplyProposal(proposalIndex)}>
                      {t("applyProposalButton")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pendingAction}
                      onClick={() => handleSkipProposal(proposalIndex)}
                    >
                      {t("skipProposalButton")}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}

      {fields.length === 0 && <Text tone="muted">{t("emptyHint")}</Text>}

      <Stack gap={3}>
        {fields.map((field, index) => (
          <VariantCard
            key={field.id}
            form={localForm}
            index={index}
            isFirst={index === 0}
            isLast={index === fields.length - 1}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onSetDefault={() => handleSetDefault(index)}
            onDelete={() => handleDeleteVariant(index)}
            onSave={() => saveVariant(index)}
            pending={pendingAction}
          />
        ))}
      </Stack>

      {canAddMore && (
        <Card padding="sm">
          <Stack gap={2}>
            <Text as="span" variant="label">
              {t("addVariantHeading")}
            </Text>
            <Stack direction="row" gap={2} className="flex-wrap items-end">
              <Stack gap={1} className="min-w-48">
                <Label id="wizard-variants-add-standard-label">{t("standardLabel")}</Label>
                <Select
                  value={addStandard}
                  onChange={setAddStandard}
                  options={standardOptions.filter((option) => availableStandards.includes(option.value))}
                  aria-labelledby="wizard-variants-add-standard-label"
                />
              </Stack>
              <Button type="button" onClick={handleAddVariant} disabled={pendingAction || addStandard === null}>
                <Plus className="size-4" aria-hidden="true" />
                {t("addVariantButton")}
              </Button>
            </Stack>

            {fields.length > 0 && (
              <Stack direction="row" gap={2} className="flex-wrap items-end">
                <Stack gap={1} className="min-w-48">
                  <Label id="wizard-variants-clone-source-label">{t("cloneSourceLabel")}</Label>
                  <Select
                    value={cloneSourceIndex === null ? null : String(cloneSourceIndex)}
                    onChange={(value) => setCloneSourceIndex(Number(value))}
                    options={fields.map((field, index) => ({
                      value: String(index),
                      label: standardOptions.find((option) => option.value === field.completionStandard)?.label ?? field.completionStandard,
                    }))}
                    aria-labelledby="wizard-variants-clone-source-label"
                  />
                </Stack>
                <Stack gap={1} className="min-w-48">
                  <Label id="wizard-variants-clone-standard-label">{t("cloneStandardLabel")}</Label>
                  <Select
                    value={cloneStandard}
                    onChange={setCloneStandard}
                    options={standardOptions.filter((option) => availableStandards.includes(option.value))}
                    aria-labelledby="wizard-variants-clone-standard-label"
                  />
                </Stack>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloneVariant}
                  disabled={pendingAction || cloneSourceIndex === null || cloneStandard === null}
                >
                  <Copy className="size-4" aria-hidden="true" />
                  {t("cloneVariantButton")}
                </Button>
              </Stack>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
  },
);

interface VariantCardProps {
  form: UseFormReturn<VariantsFormValues>;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSave: () => Promise<{ ok: boolean; error?: string }>;
  onSetDefault: () => void;
  onDelete: () => void;
  pending: boolean;
}

function VariantCard({ form, index, isFirst, isLast, onMoveUp, onMoveDown, onSave, onSetDefault, onDelete, pending }: VariantCardProps) {
  const t = useTranslations("ProjectWizardVariantsStep");
  const tOptions = useTranslations("ProjectOptions");
  const { control, register, getValues } = form;
  const variant = useWatch({ control, name: `variants.${index}` });
  const costItemsArray = useFieldArray({ control, name: `variants.${index}.costLineItems` });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const standardOptions = getCompletionStandardOptions(tOptions);
  const statusOptions = getCostLineItemStatusOptions(tOptions);
  const stageOptions = getTimelineStageKeyOptions(tOptions);
  const standardLabel = standardOptions.find((option) => option.value === variant.completionStandard)?.label ?? variant.completionStandard;

  async function handleRemoveCostItem(itemIndex: number) {
    const item = getValues(`variants.${index}.costLineItems.${itemIndex}`);
    if (item.itemId) {
      const result = await deleteCostLineItem(item.itemId);
      if (!result.ok) {
        setSaveError(result.error ?? t("genericError"));
        return;
      }
    }
    costItemsArray.remove(itemIndex);
  }

  // Deleguje do saveVariant(index) w rodzicu (patrz komentarz tam) — jedyna
  // logika zapisu żyje w jednym miejscu, ten przycisk i saveAllPending() z
  // rodzica wołają dokładnie to samo.
  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaved(false);
    const result = await onSave();
    setIsSaving(false);
    if (!result.ok) {
      setSaveError(result.error ?? t("genericError"));
      return;
    }
    setSaved(true);
  }

  return (
    <Card padding="md">
      <Stack gap={3}>
        <Stack direction="row" gap={2} className="flex-wrap items-center justify-between">
          <Stack direction="row" gap={2} className="items-center">
            <Heading level="h3">{standardLabel}</Heading>
            {variant.isDefault && (
              <span className="flex items-center gap-1 rounded-data bg-brand-passage-blue/10 px-brand-1 py-0.5 text-label text-brand-passage-blue">
                <Star className="size-3 fill-current" aria-hidden="true" />
                {t("defaultBadge")}
              </span>
            )}
          </Stack>
          <Stack direction="row" gap={1} className="items-center">
            {!isFirst && (
              <button
                type="button"
                onClick={onMoveUp}
                aria-label={t("moveUpLabel")}
                className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-brand-foundation-navy"
              >
                <ChevronUp className="size-4" aria-hidden="true" />
              </button>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={onMoveDown}
                aria-label={t("moveDownLabel")}
                className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-brand-foundation-navy"
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              aria-label={t("deleteVariantLabel")}
              className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked disabled:opacity-30"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </Stack>
        </Stack>

        {!variant.isDefault && (
          <label className="flex w-fit items-center gap-2 text-body">
            <Radio checked={false} onChange={onSetDefault} disabled={pending} name={`default-variant-${index}`} />
            {t("setDefaultLabel")}
          </label>
        )}

        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor={`variant-${index}-price-min`}>{t("priceMinLabel")}</Label>
          <Input
            id={`variant-${index}-price-min`}
            type="number"
            min={0}
            disabled={variant.priceOnRequest}
            {...register(`variants.${index}.priceMinEur`, { setValueAs: (value) => (value === "" ? null : Number(value)) })}
          />
        </Stack>

        <label className="flex w-fit items-center gap-2 text-body">
          <Checkbox id={`variant-${index}-price-on-request`} {...register(`variants.${index}.priceOnRequest`)} />
          {t("priceOnRequestLabel")}
        </label>

        <Stack gap={2}>
          <Text as="span" variant="label">
            {t("costLineItemsHeading")}
          </Text>
          {costItemsArray.fields.map((itemField, itemIndex) => (
            <Stack key={itemField.id} direction="row" gap={2} className="flex-wrap items-end">
              <Stack gap={1} className="min-w-40 flex-1">
                <Label htmlFor={`variant-${index}-cost-${itemIndex}-label`}>{t("costLineItemLabelLabel")}</Label>
                <Input
                  id={`variant-${index}-cost-${itemIndex}-label`}
                  {...register(`variants.${index}.costLineItems.${itemIndex}.label`)}
                />
              </Stack>
              <Stack gap={1} className="min-w-40">
                <Label id={`variant-${index}-cost-${itemIndex}-status-label`}>{t("costLineItemStatusLabel")}</Label>
                <Controller
                  control={control}
                  name={`variants.${index}.costLineItems.${itemIndex}.status`}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      options={statusOptions}
                      aria-labelledby={`variant-${index}-cost-${itemIndex}-status-label`}
                    />
                  )}
                />
              </Stack>
              <Stack gap={1} className="min-w-40 flex-1">
                <Label htmlFor={`variant-${index}-cost-${itemIndex}-party`}>{t("costLineItemResponsiblePartyLabel")}</Label>
                <Input
                  id={`variant-${index}-cost-${itemIndex}-party`}
                  {...register(`variants.${index}.costLineItems.${itemIndex}.responsibleParty`)}
                />
              </Stack>
              <button
                type="button"
                onClick={() => handleRemoveCostItem(itemIndex)}
                aria-label={t("removeCostLineItemLabel")}
                className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </Stack>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-fit"
            onClick={() =>
              costItemsArray.append({ itemId: null, label: "", status: "w-cenie", responsibleParty: "" })
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("addCostLineItemButton")}
          </Button>
        </Stack>

        <Stack gap={2}>
          <Text as="span" variant="label">
            {t("timelineHeading")}
          </Text>
          {stageOptions.map((stageOption, stageIndex) => (
            <Stack key={stageOption.value} direction="row" gap={2} className="flex-wrap items-end">
              <Text as="span" className="min-w-32">
                {stageOption.label}
              </Text>
              <Stack gap={1} className="min-w-28">
                <Label htmlFor={`variant-${index}-stage-${stageIndex}-min`}>{t("stageDurationMinLabel")}</Label>
                <Input
                  id={`variant-${index}-stage-${stageIndex}-min`}
                  type="number"
                  min={0}
                  {...register(`variants.${index}.timelineStages.${stageIndex}.durationMinDays`, {
                    setValueAs: (value) => (value === "" ? null : Number(value)),
                  })}
                />
              </Stack>
              <Stack gap={1} className="min-w-28">
                <Label htmlFor={`variant-${index}-stage-${stageIndex}-max`}>{t("stageDurationMaxLabel")}</Label>
                <Input
                  id={`variant-${index}-stage-${stageIndex}-max`}
                  type="number"
                  min={0}
                  {...register(`variants.${index}.timelineStages.${stageIndex}.durationMaxDays`, {
                    setValueAs: (value) => (value === "" ? null : Number(value)),
                  })}
                />
              </Stack>
              <Stack gap={1} className="min-w-40 flex-1">
                <Label htmlFor={`variant-${index}-stage-${stageIndex}-party`}>{t("stageResponsiblePartyLabel")}</Label>
                <Input
                  id={`variant-${index}-stage-${stageIndex}-party`}
                  {...register(`variants.${index}.timelineStages.${stageIndex}.responsibleParty`)}
                />
              </Stack>
            </Stack>
          ))}
        </Stack>

        {saveError && (
          <p role="alert" className="rounded-data bg-status-blocked/10 px-brand-2 py-1 text-body text-status-blocked">
            {saveError}
          </p>
        )}
        <Stack direction="row" gap={2} className="items-center">
          <Button type="button" onClick={handleSave} disabled={isSaving} className="w-fit">
            {t("saveVariantButton")}
          </Button>
          {saved && !isSaving && <Text tone="muted">{t("savedHint")}</Text>}
        </Stack>
      </Stack>
    </Card>
  );
}
