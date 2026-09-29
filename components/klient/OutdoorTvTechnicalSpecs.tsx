"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Heading, Text } from "@/components/ui";

interface OutdoorTvTechnicalSpecsProps {
  specs?: Record<string, unknown>;
  /** Przetłumaczona etykieta pola per klucz jsonb (spec 0056 Follow-up),
   * używana zamiast humanizeKey(key) gdy dostępna dla danego klucza. */
  labels?: Record<string, string>;
}

// Etykieta z surowego klucza jsonb (np. "screenSizeInches" -> "Screen Size
// Inches"): outdoor-tv nie ma jeszcze własnego schematu Zod (spec 0056 AC-7),
// więc nie ma też katalogu tłumaczonych etykiet pól jak ProjectOptions dla
// "dom" — to jedyna opcja do czasu, aż follow-up spec ustali prawdziwy kształt
// i słownik etykiet po spotkaniu z MirageVision.
function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

// Klucze zaczynające się od "_" to wewnętrzne pola-mosty (np. _extraImageUrls,
// patrz lib/data/AGENTS.md), nie prawdziwa specyfikacja — i tak nie są
// stringiem do wyświetlenia. Ten filtr był opisany w spec 0056 Build plan, ale
// nigdy nie zaimplementowany; bez niego _extraImageUrls wyciekało wprost do tej
// tabeli jako "spec".
function isDisplayableSpecEntry(key: string, value: unknown): value is string {
  return !key.startsWith("_") && typeof value === "string" && value.trim().length > 0;
}

// Ten sam próg i wzorzec "pokaż więcej" co ProjectCostComparisonTable: pełna
// tabela MirageVision (szafka + telewizor) ma dziś ~28 wierszy, więcej niż
// jeden ekran — reszta chowa się za przyciskiem zamiast dominować stronę.
const PREVIEW_ROW_COUNT = 10;

// Puste lub brak specs → sekcja nie renderuje się w ogóle (spec 0056 AC-4),
// ten sam wzorzec co ProjectCertifications/ProjectDocumentsAndFaq. Komponent
// kliencki tylko dla stanu "rozwinięte" (ten sam powód co
// ProjectCostComparisonTable) — reszta zostaje statyczna.
export function OutdoorTvTechnicalSpecs({ specs, labels }: OutdoorTvTechnicalSpecsProps) {
  const t = useTranslations("OutdoorTvPage");
  const [expanded, setExpanded] = useState(false);

  const entries = specs
    ? (Object.entries(specs).filter(([key, value]) => isDisplayableSpecEntry(key, value)) as [string, string][])
    : [];
  if (entries.length === 0) return null;

  const displayedEntries = expanded ? entries : entries.slice(0, PREVIEW_ROW_COUNT);
  const hiddenCount = Math.max(entries.length - PREVIEW_ROW_COUNT, 0);

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("specsHeading")}
      </Heading>
      <div className="overflow-hidden rounded-v5-card border border-brand-v5-line">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t("specsHeading")}</caption>
          <tbody>
            {displayedEntries.map(([key, value]) => (
              <tr key={key} className="border-b border-brand-v5-line/50 odd:bg-brand-v5-surface last:border-b-0">
                <th scope="row" className="w-1/2 p-brand-3 align-top sm:w-2/5">
                  <Text as="span" variant="label" tone="muted" surface="v5">
                    {labels?.[key] ?? humanizeKey(key)}
                  </Text>
                </th>
                <td className="p-brand-3 align-top">
                  <Text as="span" surface="v5" className="font-semibold">
                    {value}
                  </Text>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="focus-ring flex w-fit items-center gap-brand-1 rounded-data text-body font-semibold text-brand-v5-ink underline underline-offset-2"
        >
          {expanded ? t("showFewer") : t("showMore", { count: hiddenCount })}
          <ChevronDown
            className={`size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
