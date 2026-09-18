"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Copy, Plus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useFormContext, useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Heading, Input, Label, Radio, Select, Stack, Text, Textarea } from "@/components/ui";
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
  updateVariantTranslation,
  upsertCostLineItem,
  upsertTimelineStage,
} from "@/lib/producer-product-variant-actions";

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
  priceMinEur: number | null;
  priceMaxEur: number | null;
  scopeSummaryPl: string;
  scopeSummaryEn: string;
  scopeSummaryNl: string;
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
  priceMaxEur: z.number().nullable(),
  scopeSummaryPl: z.string(),
  scopeSummaryEn: z.string(),
  scopeSummaryNl: z.string(),
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

function initialVariantsToFormValues(initialVariants: ProducerVariantForEdit[]): VariantFormValue[] {
  return initialVariants.map((variant) => ({
    variantId: variant.id,
    completionStandard: variant.completionStandard,
    isDefault: variant.isDefault,
    priceMinEur: variant.priceMinCents === null ? null : variant.priceMinCents / 100,
    priceMaxEur: variant.priceMaxCents === null ? null : variant.priceMaxCents / 100,
    scopeSummaryPl: variant.scopeSummary ?? "",
    scopeSummaryEn: variant.scopeSummaryEn ?? "",
    scopeSummaryNl: variant.scopeSummaryNl ?? "",
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
export function ProjectWizardVariantsStep({ productId, initialVariants = [] }: ProjectWizardVariantsStepProps) {
  const t = useTranslations("ProjectWizardVariantsStep");
  const tOptions = useTranslations("ProjectOptions");
  const outerForm = useFormContext<ProjectDraft>();
  const localForm = useForm<VariantsFormValues>({
    defaultValues: { variants: initialVariantsToFormValues(initialVariants) },
    resolver: zodResolver(variantsFormSchema),
    mode: "onBlur",
  });
  const { control, getValues } = localForm;
  const { fields, append, remove, update, move } = useFieldArray({ control, name: "variants" });
  const [pendingAction, setPendingAction] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [addStandard, setAddStandard] = useState<CompletionStandard | null>(null);
  const [cloneSourceIndex, setCloneSourceIndex] = useState<number | null>(null);
  const [cloneStandard, setCloneStandard] = useState<CompletionStandard | null>(null);

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
  const canAddMore = fields.length < MAX_VARIANTS && availableStandards.length > 0;

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
      priceMaxEur: null,
      scopeSummaryPl: "",
      scopeSummaryEn: "",
      scopeSummaryNl: "",
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
      priceMaxEur: cloned.priceMaxCents === null ? null : cloned.priceMaxCents / 100,
      scopeSummaryPl: cloned.scopeSummary ?? "",
      scopeSummaryEn: "",
      scopeSummaryNl: "",
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
}

interface VariantCardProps {
  form: UseFormReturn<VariantsFormValues>;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  pending: boolean;
}

function VariantCard({ form, index, isFirst, isLast, onMoveUp, onMoveDown, onSetDefault, onDelete, pending }: VariantCardProps) {
  const t = useTranslations("ProjectWizardVariantsStep");
  const tOptions = useTranslations("ProjectOptions");
  const { control, register, getValues, setValue } = form;
  const variant = useWatch({ control, name: `variants.${index}` });
  const costItemsArray = useFieldArray({ control, name: `variants.${index}.costLineItems` });
  const [translationTab, setTranslationTab] = useState<"en" | "nl">("en");
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

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaved(false);
    const current = getValues(`variants.${index}`);

    const variantResult = await updateVariant(current.variantId, {
      priceMinEur: current.priceMinEur,
      priceMaxEur: current.priceMaxEur,
      scopeSummary: current.scopeSummaryPl,
      variantLabel: "",
    });
    if (!variantResult.ok) {
      setIsSaving(false);
      setSaveError(variantResult.error ?? t("genericError"));
      return;
    }

    await updateVariantTranslation(current.variantId, "en", current.scopeSummaryEn);
    await updateVariantTranslation(current.variantId, "nl", current.scopeSummaryNl);

    for (let i = 0; i < current.costLineItems.length; i++) {
      const item = current.costLineItems[i];
      if (!item.label.trim()) continue;
      const itemResult = await upsertCostLineItem(current.variantId, {
        id: item.itemId,
        label: item.label,
        status: item.status,
        responsibleParty: item.responsibleParty,
      });
      if (!itemResult.ok) {
        setIsSaving(false);
        setSaveError(itemResult.error ?? t("genericError"));
        return;
      }
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
      if (!stageResult.ok) {
        setIsSaving(false);
        setSaveError(stageResult.error ?? t("genericError"));
        return;
      }
    }

    setIsSaving(false);
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

        <Stack direction="row" gap={3} className="flex-wrap">
          <Stack gap={1} className="min-w-40 flex-1">
            <Label htmlFor={`variant-${index}-price-min`}>{t("priceMinLabel")}</Label>
            <Input
              id={`variant-${index}-price-min`}
              type="number"
              min={0}
              {...register(`variants.${index}.priceMinEur`, { setValueAs: (value) => (value === "" ? null : Number(value)) })}
            />
          </Stack>
          <Stack gap={1} className="min-w-40 flex-1">
            <Label htmlFor={`variant-${index}-price-max`}>{t("priceMaxLabel")}</Label>
            <Input
              id={`variant-${index}-price-max`}
              type="number"
              min={0}
              {...register(`variants.${index}.priceMaxEur`, { setValueAs: (value) => (value === "" ? null : Number(value)) })}
            />
          </Stack>
        </Stack>

        <Stack gap={1}>
          <Label htmlFor={`variant-${index}-scope-pl`}>{t("scopeSummaryLabel")}</Label>
          <Textarea id={`variant-${index}-scope-pl`} {...register(`variants.${index}.scopeSummaryPl`)} />
        </Stack>

        <Stack gap={2}>
          <div role="tablist" aria-label={t("translationsHeading")} className="flex gap-brand-1">
            <Button
              type="button"
              role="tab"
              aria-selected={translationTab === "en"}
              variant={translationTab === "en" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTranslationTab("en")}
            >
              {t("translationTabEn")}
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={translationTab === "nl"}
              variant={translationTab === "nl" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTranslationTab("nl")}
            >
              {t("translationTabNl")}
            </Button>
          </div>
          {translationTab === "en" ? (
            <Textarea aria-label={t("scopeSummaryEnLabel")} {...register(`variants.${index}.scopeSummaryEn`)} />
          ) : (
            <Textarea aria-label={t("scopeSummaryNlLabel")} {...register(`variants.${index}.scopeSummaryNl`)} />
          )}
        </Stack>

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
