"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button, Card, Heading, Input, Label, Stack, Text, Textarea } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";

// AC-6, AC-10: FAQ produktu, useFieldArray na wspólnym formularzu kreatora
// (ProjectDraft), zapisywany do product.faq (spec 0045 Feature design). faq/
// faqEn/faqNl trzymane w tej samej kolejności i długości podczas edycji
// (append/remove/move stosowane naraz na wszystkich trzech, ten sam stabilny
// `id` przy tworzeniu) — dopasowanie po pozycji = dopasowanie po `id`, bo
// nigdy się nie rozjeżdżają w trakcie życia tego formularza. Wczytanie
// istniejącego, częściowego tłumaczenia (edycja produktu) przechodzi przez
// alignFaqTranslation (lib/producer-project-draft.ts) w miejscu budowania
// initialDraft, żeby ten sam lock po indeksie działał od pierwszego renderu;
// puste wpisy tłumaczenia są odrzucane tuż przed zapisem (sanitizeDraftForSave),
// żeby faktycznie częściowe tłumaczenie (AC-10) nie łamało
// faqTranslationRowSchema (question/answer min(1)).
export function ProjectWizardFaqStep() {
  const t = useTranslations("ProjectWizardFaqStep");
  const { control, register } = useFormContext<ProjectDraft>();
  const faqArray = useFieldArray({ control, name: "faq" });
  const faqEnArray = useFieldArray({ control, name: "faqEn" });
  const faqNlArray = useFieldArray({ control, name: "faqNl" });
  const [translationTab, setTranslationTab] = useState<"en" | "nl">("en");

  function handleAdd() {
    const id = crypto.randomUUID();
    faqArray.append({ id, question: "", answer: "" });
    faqEnArray.append({ id, question: "", answer: "" });
    faqNlArray.append({ id, question: "", answer: "" });
  }

  function handleRemove(index: number) {
    faqArray.remove(index);
    faqEnArray.remove(index);
    faqNlArray.remove(index);
  }

  function handleMove(from: number, to: number) {
    faqArray.move(from, to);
    faqEnArray.move(from, to);
    faqNlArray.move(from, to);
  }

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level="h2">{t("heading")}</Heading>
        <Text tone="muted">{t("intro")}</Text>
      </Stack>

      {faqArray.fields.length === 0 && <Text tone="muted">{t("emptyHint")}</Text>}

      <Stack gap={3}>
        {faqArray.fields.map((field, index) => (
          <Card key={field.id} padding="md">
            <Stack gap={3}>
              <Stack direction="row" gap={2} className="items-center justify-between">
                <Text as="span" variant="label">
                  {t("entryLabel", { index: index + 1 })}
                </Text>
                <Stack direction="row" gap={1} className="items-center">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMove(index, index - 1)}
                      aria-label={t("moveUpLabel")}
                      className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-brand-foundation-navy"
                    >
                      <ChevronUp className="size-4" aria-hidden="true" />
                    </button>
                  )}
                  {index < faqArray.fields.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMove(index, index + 1)}
                      aria-label={t("moveDownLabel")}
                      className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-brand-foundation-navy"
                    >
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={t("removeLabel")}
                    className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </Stack>
              </Stack>

              <Stack gap={1}>
                <Label htmlFor={`faq-${index}-question`} required>
                  {t("questionLabel")}
                </Label>
                <Input id={`faq-${index}-question`} required {...register(`faq.${index}.question`)} />
              </Stack>
              <Stack gap={1}>
                <Label htmlFor={`faq-${index}-answer`} required>
                  {t("answerLabel")}
                </Label>
                <Textarea id={`faq-${index}-answer`} required {...register(`faq.${index}.answer`)} />
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
                  <Stack gap={2}>
                    <Input aria-label={t("questionEnLabel")} placeholder={t("questionEnLabel")} {...register(`faqEn.${index}.question`)} />
                    <Textarea aria-label={t("answerEnLabel")} placeholder={t("answerEnLabel")} {...register(`faqEn.${index}.answer`)} />
                  </Stack>
                ) : (
                  <Stack gap={2}>
                    <Input aria-label={t("questionNlLabel")} placeholder={t("questionNlLabel")} {...register(`faqNl.${index}.question`)} />
                    <Textarea aria-label={t("answerNlLabel")} placeholder={t("answerNlLabel")} {...register(`faqNl.${index}.answer`)} />
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>

      <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={handleAdd}>
        <Plus className="size-4" aria-hidden="true" />
        {t("addButton")}
      </Button>
    </Stack>
  );
}
