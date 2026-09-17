"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";
import type { CountryCode } from "@/lib/data/types";

interface CompareSelectionBarProps {
  locale: string;
  selectedIds: string[];
  maxSelected: number;
  countryCode?: CountryCode;
  onClear: () => void;
}

// Publiczne porównanie wymaga co najmniej dwóch domów (spec 0044 AC-5); ten
// pasek pokazuje się już od pierwszego zaznaczenia (postęp widoczny od razu),
// ale przycisk "Porównaj domy" zostaje wyłączony do drugiego wyboru.
const MIN_TO_COMPARE = 2;

// Zwykły wiersz w normalnym przepływie strony, nie kolejny pasek fixed na
// dole (tam już siedzi ShortlistActionBar nad ResultsFilterBar) — inne
// miejsce i inny wygląd niż zaznaczenie "do zapytania", żeby dwa niezależne
// zamiary były wyraźnie odróżnione (spec 0044 AC-4), a nie tylko innym
// kolorem tego samego elementu.
export function CompareSelectionBar({ locale, selectedIds, maxSelected, countryCode, onClear }: CompareSelectionBarProps) {
  const t = useTranslations("CompareSelectionBar");
  const router = useRouter();
  const canCompare = selectedIds.length >= MIN_TO_COMPARE;

  function handleCompare() {
    const params = new URLSearchParams({ products: selectedIds.join(",") });
    if (countryCode) params.set("country", countryCode);
    router.push(`/${locale}/compare?${params.toString()}`);
  }

  return (
    <div className="compare-selection-bar flex flex-wrap items-center justify-between gap-brand-3 rounded-v5-card border border-brand-v5-amber-strong/40 bg-brand-v5-amber/10 px-brand-3 py-brand-2">
      <div className="flex flex-col">
        <Text surface="v5" className="font-medium">
          {t("selectedCount", { count: selectedIds.length, max: maxSelected })}
        </Text>
        {!canCompare && (
          <Text tone="muted" surface="v5" className="text-data">
            {t("needTwoHint")}
          </Text>
        )}
      </div>
      <div className="flex items-center gap-brand-3">
        <button
          type="button"
          onClick={onClear}
          className="focus-ring rounded-data text-body font-medium text-brand-v5-muted underline underline-offset-2"
        >
          {t("clear")}
        </button>
        <Button onClick={handleCompare} disabled={!canCompare} surface="v5">
          {t("compareCta")}
        </Button>
      </div>
    </div>
  );
}
