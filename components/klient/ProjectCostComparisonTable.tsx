"use client";

import { CheckCircle2, ChevronDown, CircleDot, HelpCircle, PlusCircle, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Checkbox, DataText, StatusPill, Text } from "@/components/ui";
import type { CompletionStandard, CostLineItemStatus, ProjectVariant } from "@/lib/data/types";

interface ProjectCostComparisonTableProps {
  variants: ProjectVariant[];
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Tylko pierwsze 10 pozycji widoczne od razu, reszta za "pokaż więcej" — ten
// sam próg co lista pomieszczeń (ProjectRoomLayout), tak żeby bogata
// specyfikacja (dziś potrafi mieć 20+ wierszy) nie zdominowała pierwszego
// ekranu przed resztą sekcji strony.
const PREVIEW_ROW_COUNT = 10;

const STATUS_ICON: Record<CostLineItemStatus, typeof CheckCircle2> = {
  "w-cenie": CheckCircle2,
  "obowiazkowa-doplata": PlusCircle,
  opcja: CircleDot,
  "po-stronie-klienta": User,
  "do-wyceny": HelpCircle,
};

// Reużywa istniejący, zarezerwowany słownik statusów (StatusPill: zielony/
// bursztynowy z sekcji "Zgodność prawna"), zamiast wprowadzać czwarty kolor
// statusu (PRODUCT.md Don't) — "w cenie" to jedyny naprawdę pozytywny wynik,
// "opcja" zostaje stonowana (dopłata do rozważenia, nie ostrzeżenie), reszta
// (dopłata obowiązkowa, po stronie klienta, do wyceny) to warianty tego
// samego sygnału "wymaga Twojej uwagi lub działania".
const STATUS_COLOR_CLASS: Record<CostLineItemStatus, string> = {
  "w-cenie": "text-status-approved",
  "obowiazkowa-doplata": "text-status-conditional",
  opcja: "text-brand-v5-muted",
  "po-stronie-klienta": "text-status-conditional",
  "do-wyceny": "text-status-conditional",
};

// Jedyny fragment po stronie klienta w tej sekcji (spec 0042 Feature design):
// checkbox "pokaż tylko różnice", zwykły lokalny stan bez potrzeby przetrwania
// nawigacji. Łączy wiersze między wariantami po dokładnym dopasowaniu tekstu
// `label` (spec 0042 AC-2) — najlepsze możliwe przybliżenie, bo spec 0041
// celowo zostawił `label` jako wolny tekst bez wspólnego słownika.
export function ProjectCostComparisonTable({ variants }: ProjectCostComparisonTableProps) {
  const t = useTranslations("ProjectCostComparisonTable");
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const standardLabel: Record<CompletionStandard, string> = {
    "surowy-zamkniety": t("completionStandard.surowy-zamkniety"),
    deweloperski: t("completionStandard.deweloperski"),
    "pod-klucz": t("completionStandard.pod-klucz"),
  };
  const statusLabel: Record<CostLineItemStatus, string> = {
    "w-cenie": t("status.w-cenie"),
    "obowiazkowa-doplata": t("status.obowiazkowa-doplata"),
    opcja: t("status.opcja"),
    "po-stronie-klienta": t("status.po-stronie-klienta"),
    "do-wyceny": t("status.do-wyceny"),
  };

  const rows = useMemo(() => {
    const labels: string[] = [];
    for (const variant of variants) {
      for (const item of variant.costLineItems) {
        if (!labels.includes(item.label)) labels.push(item.label);
      }
    }
    return labels.map((label) => ({
      label,
      cells: variants.map((variant) => variant.costLineItems.find((item) => item.label === label)?.status ?? null),
    }));
  }, [variants]);

  // Kolumna "pod klucz" bez prawdziwego wariantu w bazie to zawsze placeholder
  // (getDisplayProjectVariants) z pustym costLineItems, więc jej komórka w
  // każdym wierszu to `null` — licząc ją do porównania, KAŻDY wiersz wyglądał
  // na "różny" (prawdziwy status kontra null), nawet gdy oba prawdziwe warianty
  // były identyczne. Różnicę sprawdzamy tylko między prawdziwymi wariantami.
  const visibleRows = onlyDifferences
    ? rows.filter((row) => {
        const realCells = row.cells.filter((_, index) => !variants[index].isPlaceholder);
        return new Set(realCells).size > 1;
      })
    : rows;

  const displayedRows = expanded ? visibleRows : visibleRows.slice(0, PREVIEW_ROW_COUNT);
  const hiddenRowCount = Math.max(visibleRows.length - PREVIEW_ROW_COUNT, 0);

  return (
    <div className="flex flex-col gap-brand-3">
      {rows.length > 0 && (
        <label className="focus-ring flex w-fit cursor-pointer items-center gap-brand-2 rounded-data">
          <Checkbox
            surface="v5"
            checked={onlyDifferences}
            onChange={() => setOnlyDifferences((value) => !value)}
          />
          <Text as="span" surface="v5">
            {t("onlyDifferences")}
          </Text>
        </label>
      )}
      <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <thead>
            <tr className="border-b border-brand-v5-line bg-brand-v5-line/10">
              <th scope="col" className="p-brand-3 text-label font-semibold text-brand-v5-muted">
                {t("lineItemColumn")}
              </th>
              {variants.map((variant) => (
                <th key={variant.id} scope="col" className="p-brand-3 align-top">
                  <Text as="span" variant="label" tone="muted" surface="v5" className="block">
                    {variant.variantLabel ?? standardLabel[variant.completionStandard]}
                  </Text>
                  {variant.isPlaceholder ? (
                    <div className="mt-1">
                      <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>
                    </div>
                  ) : (
                    <>
                      <DataText as="span" surface="v5" className="block text-body-l font-semibold">
                        {variant.priceMin !== undefined && variant.priceMax !== undefined
                          ? variant.priceMin === variant.priceMax
                            ? t("priceFrom", { price: priceFormatter.format(variant.priceMin) })
                            : `${priceFormatter.format(variant.priceMin)}–${priceFormatter.format(variant.priceMax)} €`
                          : t("priceOnRequest")}
                      </DataText>
                      {variant.scopeSummary && (
                        <Text tone="muted" surface="v5" className="mt-1 block text-data font-normal">
                          {variant.scopeSummary}
                        </Text>
                      )}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={variants.length + 1} className="p-brand-4">
                  <Text tone="muted" surface="v5">
                    {t("noCostLineItems")}
                  </Text>
                </td>
              </tr>
            ) : (
              displayedRows.map((row) => (
                <tr key={row.label} className="border-b border-brand-v5-line/50 last:border-b-0">
                  <th scope="row" className="p-brand-3 text-left">
                    <Text as="span" tone="muted" surface="v5" className="font-medium">
                      {row.label}
                    </Text>
                  </th>
                  {row.cells.map((status, index) => {
                    const Icon = status ? STATUS_ICON[status] : null;
                    return (
                      <td key={variants[index].id} className="p-brand-3">
                        {variants[index].isPlaceholder ? (
                          <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>
                        ) : status ? (
                          <span className={`flex items-center gap-brand-1 ${STATUS_COLOR_CLASS[status]}`}>
                            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                            <Text as="span" surface="v5" className={`text-data font-medium ${STATUS_COLOR_CLASS[status]}`}>
                              {statusLabel[status]}
                            </Text>
                          </span>
                        ) : (
                          <Text tone="muted" surface="v5" className="text-data">
                            {t("notIncluded")}
                          </Text>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hiddenRowCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="focus-ring flex w-fit items-center gap-brand-1 rounded-data text-body font-semibold text-brand-v5-ink underline underline-offset-2"
        >
          {expanded ? t("showFewer") : t("showMore", { count: hiddenRowCount })}
          <ChevronDown
            className={`size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
