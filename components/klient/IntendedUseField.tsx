"use client";

import { useTranslations } from "next-intl";
import { Input, Label, Stack, Text } from "@/components/ui";
import type { IntendedUse } from "@/lib/intended-use";

export interface IntendedUseValue {
  intendedUse: IntendedUse | null;
  months: string;
}

export const EMPTY_INTENDED_USE: IntendedUseValue = { intendedUse: null, months: "" };

// Wartość do akcji zapisu: puste pola zostają `undefined`, a miesiące zapisują się
// tylko przy "sezonowo" (spec 0075 AC-7).
export function intendedUseInput(value: IntendedUseValue): { intendedUse?: IntendedUse; intendedUseMonths?: number } {
  if (!value.intendedUse) return {};
  if (value.intendedUse === "year_round") return { intendedUse: "year_round" };
  const months = Number(value.months);
  return { intendedUse: "seasonal", intendedUseMonths: value.months.trim() === "" ? undefined : months };
}

interface IntendedUseFieldProps {
  idPrefix: string;
  value: IntendedUseValue;
  onChange: (value: IntendedUseValue) => void;
}

// Spec 0075 AC-7: nieobowiązkowy wybór "cały rok" albo "sezonowo", po wybraniu
// "sezonowo" pole liczby miesięcy od 1 do 11. Brak odpowiedzi nie blokuje wysłania.
export function IntendedUseField({ idPrefix, value, onChange }: IntendedUseFieldProps) {
  const t = useTranslations("IntendedUse");
  const options: { key: IntendedUse; label: string }[] = [
    { key: "year_round", label: t("yearRound") },
    { key: "seasonal", label: t("seasonal") },
  ];

  return (
    <fieldset className="flex flex-col gap-brand-1">
      <legend className="font-sans text-body font-medium text-brand-v5-ink">{t("legend")}</legend>
      <Text tone="muted" surface="v5" className="text-data">
        {t("hint")}
      </Text>
      <div className="flex flex-wrap gap-brand-3">
        {options.map((option) => (
          <label key={option.key} className="flex items-center gap-brand-1 text-body text-brand-v5-ink">
            <input
              type="radio"
              name={`${idPrefix}-intended-use`}
              checked={value.intendedUse === option.key}
              onChange={() => onChange({ intendedUse: option.key, months: option.key === "seasonal" ? value.months : "" })}
              className="focus-ring size-4"
            />
            {option.label}
          </label>
        ))}
      </div>
      {value.intendedUse === "seasonal" ? (
        <Stack gap={1}>
          <Label htmlFor={`${idPrefix}-intended-use-months`} required surface="v5">
            {t("monthsLabel")}
          </Label>
          <Input
            id={`${idPrefix}-intended-use-months`}
            type="number"
            inputMode="numeric"
            min={1}
            max={11}
            step={1}
            required
            surface="v5"
            value={value.months}
            onChange={(event) => onChange({ intendedUse: "seasonal", months: event.target.value })}
            className="w-32"
          />
        </Stack>
      ) : null}
    </fieldset>
  );
}
