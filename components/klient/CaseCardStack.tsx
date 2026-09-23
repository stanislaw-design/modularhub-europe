"use client";

import {
  Banknote,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileClock,
  Flame,
  Fuel,
  Hammer,
  HelpCircle,
  House,
  KeyRound,
  Layers,
  MapPin,
  PaintRoller,
  PiggyBank,
  PlugZap,
  Thermometer,
  Truck,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Radio, Text } from "@/components/ui";
import { answerCard } from "@/lib/case-actions";
import type { CaseMessageDto } from "@/lib/case-schemas";
import { NIE_WIEM, START_CARDS, getStartCard } from "@/lib/cases/start-cards";
import type { CaseFieldsByKey } from "@/lib/cases/cards";

// Ikony kart startowych, mapowane z nazwy tekstowej w katalogu (patrz
// lib/cases/start-cards.ts) na komponent lucide-react. Katalog sam nie
// importuje lucide-react, żeby zostać czytelny z serwera (createAdvisoryCase).
const ICONS: Record<string, LucideIcon> = {
  House,
  Truck,
  Wrench,
  Layers,
  Coins,
  Wallet,
  Banknote,
  PiggyBank,
  Zap,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FileClock,
  MapPin,
  ClipboardList,
  Thermometer,
  Fuel,
  PlugZap,
  Flame,
  Hammer,
  PaintRoller,
  KeyRound,
  HelpCircle,
};

interface CaseCardStackProps {
  inquiryId: string;
  cardMessages: CaseMessageDto[];
  caseFields: CaseFieldsByKey;
  dismissed: boolean;
  onDismiss: () => void;
  onAnswered: (key: string, value: string) => void;
}

export function isCardFieldAnswered(field: { state: string } | undefined): boolean {
  return field?.state === "confirmed" || field?.state === "missing";
}

// Sekwencja kart startowych (spec 0048 AC-38 do AC-44): tylko jedna aktywna
// karta naraz, w ustalonej kolejności, warstwa druga dopiero po ukończeniu
// warstwy pierwszej. "Pomiń" jest wyłącznie stanem interfejsu, sterowanym
// przez CaseChat (AC-41): nic nie zapisuje, po odświeżeniu strony sekwencja
// wraca. Odpowiedziane albo pominięte karty CaseChat pokazuje w historii
// przez CaseCardHistoryEntry, nie tu.
export function CaseCardStack({ inquiryId, cardMessages, caseFields, dismissed, onDismiss, onAnswered }: CaseCardStackProps) {
  const t = useTranslations("CaseCards");
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [sendError, setSendError] = useState(false);

  const layer1Keys = START_CARDS.filter((card) => card.layer === 1).map((card) => card.key);
  const layer2Keys = START_CARDS.filter((card) => card.layer === 2).map((card) => card.key);
  const layer1Done = layer1Keys.every((key) => isCardFieldAnswered(caseFields[key]));
  const visibleKeys = layer1Done ? [...layer1Keys, ...layer2Keys] : layer1Keys;
  const activeKey = visibleKeys.find((key) => !isCardFieldAnswered(caseFields[key])) ?? null;

  if (dismissed || !activeKey) return null;

  const activeMessage = cardMessages.find((candidate) => {
    const payload = candidate.payload as { fieldKey?: string } | null;
    return payload && typeof payload === "object" && payload.fieldKey === activeKey;
  });
  if (!activeMessage) return null;

  const card = getStartCard(activeKey);
  if (!card) return null;

  const answeredCount = visibleKeys.filter((key) => isCardFieldAnswered(caseFields[key])).length;
  const selectedValue = selected ?? "";

  function handleConfirm() {
    if (!selectedValue || isPending) return;
    setSendError(false);
    startTransition(async () => {
      const result = await answerCard({ inquiryId, messageId: activeMessage!.id, value: selectedValue });
      if (!result.ok) {
        setSendError(true);
        return;
      }
      onAnswered(activeKey!, selectedValue);
      setSelected(null);
    });
  }

  const questionText = t(`${activeKey}.question`);

  return (
    <section
      aria-label={questionText}
      className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-line p-brand-3"
    >
      <div className="flex items-center justify-between gap-brand-2">
        <Text as="p" surface="v5" className="text-data font-medium">
          {card.layer === 2 ? t("layerTwoBadge") : t("layerOneBadge")} · {t("progress", { current: answeredCount + 1, total: visibleKeys.length })}
        </Text>
        <button
          type="button"
          onClick={onDismiss}
          className="focus-ring font-sans text-data text-brand-v5-ink underline underline-offset-2"
        >
          {t("skipAll")}
        </button>
      </div>

      <Text as="p" surface="v5" className="text-body-l font-medium">
        {questionText}
      </Text>

      <fieldset className="flex flex-col gap-brand-1">
        <legend className="sr-only">{questionText}</legend>
        {[...card.options, null].map((option) => {
          const value = option ? option.value : NIE_WIEM;
          const iconName = option ? option.icon : "HelpCircle";
          const Icon = ICONS[iconName] ?? HelpCircle;
          const labelKey = option ? `${activeKey}.options.${value}.label` : "common.unsureLabel";
          const consequenceKey = option ? `${activeKey}.options.${value}.consequence` : "common.unsureConsequence";
          const checked = selectedValue === value;
          return (
            <label
              key={value}
              className={`focus-within:ring-2 flex cursor-pointer items-start gap-brand-2 rounded-data border p-brand-2 ${
                checked ? "border-brand-v5-amber-strong bg-brand-v5-amber/10" : "border-brand-v5-line"
              }`}
            >
              <Radio
                name={`case-card-${activeKey}`}
                value={value}
                checked={checked}
                onChange={() => setSelected(value)}
                disabled={isPending}
                className="mt-1"
              />
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-v5-ink" />
              <span className="flex flex-col gap-0.5">
                <Text as="span" surface="v5" className="font-medium">
                  {t(labelKey)}
                </Text>
                <Text as="span" surface="v5" tone="muted" className="text-data">
                  {t(consequenceKey)}
                </Text>
              </span>
            </label>
          );
        })}
      </fieldset>

      {selectedValue && (
        <Text as="p" surface="v5" tone="muted" className="text-data">
          {t("willSave", { value: t(selectedValue === NIE_WIEM ? "common.unsureLabel" : `${activeKey}.options.${selectedValue}.label`) })}
        </Text>
      )}

      {sendError && (
        <Text as="p" surface="v5" className="text-status-blocked">
          {t("sendError")}
        </Text>
      )}

      <Button
        type="button"
        surface="v5"
        disabled={!selectedValue || isPending}
        onClick={handleConfirm}
        className="w-fit"
      >
        {isPending ? t("saving") : t("confirm")}
      </Button>
    </section>
  );
}

interface CaseCardHistoryEntryProps {
  fieldKey: string;
  caseFields: CaseFieldsByKey;
}

// Zwykła wiadomość historii dla karty odpowiedzianej albo pominiętej (AC-43),
// renderowana przez CaseChat zamiast surowego body (karty mają body: null).
export function CaseCardHistoryEntry({ fieldKey, caseFields }: CaseCardHistoryEntryProps) {
  const t = useTranslations("CaseCards");
  const questionText = t(`${fieldKey}.question`);
  const field = caseFields[fieldKey];

  let answerText = t("noAnswerYet");
  if (field?.state === "missing") {
    answerText = t("common.unsureLabel");
  } else if (field?.state === "confirmed" && typeof field.value === "string") {
    answerText = t(`${fieldKey}.options.${field.value}.label`);
  }

  return (
    <>
      <Text as="p" surface="v5" className="text-data font-medium">
        {questionText}
      </Text>
      <Text as="p" surface="v5" tone="muted">
        {answerText}
      </Text>
    </>
  );
}
