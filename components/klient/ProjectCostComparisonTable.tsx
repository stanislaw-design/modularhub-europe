"use client";

import { CheckCircle2, ChevronDown, CircleDot, HelpCircle, PlusCircle, TriangleAlert, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Checkbox, DataText, Heading, Text } from "@/components/ui";
import type { CompletionStandard, CostLineItemStatus, ProjectVariant } from "@/lib/data/types";

interface ProjectCostComparisonTableProps {
  variants: ProjectVariant[];
  heading: string;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Tylko pierwsze 10 pozycji widoczne od razu, reszta za "pokaż więcej" — ten
// sam próg co lista pomieszczeń (ProjectRoomLayout), tak żeby bogata
// specyfikacja (dziś potrafi mieć 20+ wierszy) nie zdominowała pierwszego
// ekranu przed resztą sekcji strony.
const PREVIEW_ROW_COUNT = 10;

// Literalne nazwy klas (nie budowane dynamicznie z liczby) — Tailwind musi
// widzieć każdą użytą klasę w źródle, żeby jej nie odciąć przy budowaniu.
// Tyle kolumn ile prawdziwych wariantów (1 do 3, spec 0054 AC-2).
const MOBILE_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

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
export function ProjectCostComparisonTable({ variants, heading }: ProjectCostComparisonTableProps) {
  const t = useTranslations("ProjectCostComparisonTable");
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const standardLabel: Record<CompletionStandard, string> = {
    "surowy-zamkniety": t("completionStandard.surowy-zamkniety"),
    deweloperski: t("completionStandard.deweloperski"),
    "pod-klucz": t("completionStandard.pod-klucz"),
  };
  const standardLabelShort: Record<CompletionStandard, string> = {
    "surowy-zamkniety": t("completionStandardShort.surowy-zamkniety"),
    deweloperski: t("completionStandardShort.deweloperski"),
    "pod-klucz": t("completionStandardShort.pod-klucz"),
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

  const visibleRows = onlyDifferences ? rows.filter((row) => new Set(row.cells).size > 1) : rows;

  const displayedRows = expanded ? visibleRows : visibleRows.slice(0, PREVIEW_ROW_COUNT);
  const hiddenRowCount = Math.max(visibleRows.length - PREVIEW_ROW_COUNT, 0);

  return (
    <div className="flex flex-col gap-brand-3">
      {/* Nagłówek sekcji i przełącznik "pokaż tylko różnice" w jednej linii
          (checkbox po prawej) — z jednym wariantem nie ma z czym porównywać,
          więc przełącznik nie ma sensu i się nie renderuje. */}
      <div className="flex flex-wrap items-center justify-between gap-brand-2">
        <Heading level="h2" surface="v5" className="text-h3">
          {heading}
        </Heading>
        {rows.length > 0 && variants.length >= 2 && (
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
      </div>
      {/* Mobile: karty zamiast szerokiej tabeli (wymagała poziomego scrolla) —
          nagłówek "Pozycja" znika, bo etykieta pozycji jest już tytułem karty;
          warianty (1 do 3, spec 0054 AC-2) stają się rzędem ikon z krótką
          podpisaną nazwą standardu pod spodem, bez osobnego tekstu statusu
          (ikona + podpis pod ikoną liczy się jako "status ikoną i tekstem",
          tekst statusu trafia do sr-only zamiast zajmować miejsce na
          ekranie). Pozycja spoza wariantu (brak statusu) to zawsze ten sam
          trójkąt z wykrzyknikiem. Legenda tłumaczy ikony raz na górze, więc
          karty poniżej nie muszą powtarzać tekstu statusu na widoku. */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-x-brand-3 gap-y-1 lg:hidden">
          {(Object.keys(STATUS_ICON) as CostLineItemStatus[]).map((status) => {
            const Icon = STATUS_ICON[status];
            return (
              <span key={status} className={`flex items-center gap-1 ${STATUS_COLOR_CLASS[status]}`}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <Text as="span" surface="v5" className="text-data font-medium">
                  {statusLabel[status]}
                </Text>
              </span>
            );
          })}
          <span className="flex items-center gap-1 text-status-conditional">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            <Text as="span" surface="v5" className="text-data font-medium">
              {t("legendMissing")}
            </Text>
          </span>
        </div>
      )}
      <div className="flex flex-col gap-brand-2 lg:hidden">
        {visibleRows.length === 0 ? (
          <Text tone="muted" surface="v5">
            {t("noCostLineItems")}
          </Text>
        ) : (
          displayedRows.map((row) => (
            <div key={row.label} className="rounded-v5-card border border-brand-v5-line p-brand-3">
              <Text as="p" surface="v5" className="font-medium">
                {row.label}
              </Text>
              <div className={`mt-brand-2 grid gap-brand-2 ${MOBILE_GRID_COLS[variants.length] ?? "grid-cols-3"}`}>
                {row.cells.map((status, index) => {
                  const variant = variants[index];
                  const missing = !status;
                  const Icon = missing ? TriangleAlert : STATUS_ICON[status];
                  const colorClass = missing ? "text-status-conditional" : STATUS_COLOR_CLASS[status];
                  const srLabel = status ? statusLabel[status] : t("notIncluded");
                  return (
                    <div key={variant.id} className="flex flex-col items-center gap-1 text-center">
                      <Icon className={`size-5 shrink-0 ${colorClass}`} aria-hidden="true" />
                      <span className="sr-only">{srLabel}</span>
                      <Text as="span" tone="muted" surface="v5" className="text-data font-medium">
                        {standardLabelShort[variant.completionStandard]}
                      </Text>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-v5-card border border-brand-v5-line lg:block">
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
                  <DataText as="span" surface="v5" className="block text-body-l font-semibold">
                    {variant.priceMin !== undefined
                      ? t("priceFrom", { price: priceFormatter.format(variant.priceMin) })
                      : t("priceOnRequest")}
                  </DataText>
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
                        {status ? (
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
