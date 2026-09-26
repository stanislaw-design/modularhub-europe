"use client";

import { ImageOff, Ruler, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Checkbox, DataText, Heading, Text } from "@/components/ui";
import { getInPriceCostLineItemLabels } from "@/lib/data/project-variants";
import type { CompletionStandard, Project, ProjectVariant } from "@/lib/data/types";

export interface CompareTableColumn {
  id: string;
  /** null = removed, unpublished, or outside the "dom" family (spec 0044 AC-10). */
  project: Project | null;
  selectedVariant?: ProjectVariant;
  variantLinks: { standard: CompletionStandard; href: string; isSelected: boolean }[];
}

interface ProjectCompareTableProps {
  locale: string;
  columns: CompareTableColumn[];
  hasUnavailable: boolean;
  resultsHref: string;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

interface CompareRow {
  key: string;
  label: string;
  getValue: (column: CompareTableColumn) => string | number | undefined;
  render: (column: CompareTableColumn) => string | undefined;
}

// Dokument bez productVariantId dotyczy każdego wariantu (spec 0041 Feature
// design), ten sam wzorzec co ProjectGalleryTabs.
function hasFloorPlan(column: CompareTableColumn): boolean {
  if (!column.project) return false;
  return column.project.documents.some(
    (doc) =>
      doc.purpose === "product_floor_plan" &&
      (doc.productVariantId === undefined || doc.productVariantId === column.selectedVariant?.id)
  );
}

// Tabela pokazuje dziś tylko atrybuty już jednoznacznie zdefiniowane na
// Project/ProjectVariant. Pięć kategorii kosztów (projekt, fundament,
// transport, montaż, przyłącza) świadomie NIE jest tu jeszcze wierszem: spec
// 0044 Plan realizacji #5 włącza je dopiero po ustaleniu jawnego mapowania
// cost_line_item → kategoria, którego dziś nie ma (Ryzyka: "Mapowanie
// kosztów"). Dodanie ich teraz zgadywałoby znaczenie wolnego tekstu `label`,
// dokładnie to, czego AC-8 zabrania.
export function ProjectCompareTable({ locale, columns, hasUnavailable, resultsHref }: ProjectCompareTableProps) {
  const t = useTranslations("ProjectCompareTable");
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  const standardLabel: Record<CompletionStandard, string> = {
    "surowy-zamkniety": t("completionStandard.surowy-zamkniety"),
    deweloperski: t("completionStandard.deweloperski"),
    "pod-klucz": t("completionStandard.pod-klucz"),
  };

  const rows: CompareRow[] = [
      {
        key: "floorArea",
        label: t("floorAreaLabel"),
        getValue: (c) => c.project?.floorAreaM2,
        render: (c) => (c.project ? t("areaValue", { area: c.project.floorAreaM2 }) : undefined),
      },
      {
        key: "builtUpArea",
        label: t("builtUpAreaLabel"),
        getValue: (c) => c.project?.builtUpAreaM2,
        render: (c) => (c.project ? t("areaValue", { area: c.project.builtUpAreaM2 }) : undefined),
      },
      {
        key: "bedrooms",
        label: t("bedroomsLabel"),
        getValue: (c) => c.project?.bedrooms,
        render: (c) => c.project?.bedrooms.toString(),
      },
      {
        key: "bathrooms",
        label: t("bathroomsLabel"),
        getValue: (c) => c.project?.bathrooms,
        render: (c) => c.project?.bathrooms.toString(),
      },
      {
        key: "storeys",
        label: t("storeysLabel"),
        getValue: (c) => c.project?.storeys,
        render: (c) => c.project?.storeys.toString(),
      },
      {
        key: "externalDimensions",
        label: t("externalDimensionsLabel"),
        getValue: (c) => c.project?.externalDimensions,
        render: (c) => c.project?.externalDimensions,
      },
      {
        key: "completionStandard",
        label: t("completionStandardLabel"),
        getValue: (c) => c.selectedVariant?.completionStandard,
        render: (c) => (c.selectedVariant ? standardLabel[c.selectedVariant.completionStandard] : undefined),
      },
      {
        key: "productionTime",
        label: t("productionTimeLabel"),
        getValue: (c) => {
          const produkcja = c.selectedVariant?.timelineStages.find((s) => s.stageKey === "produkcja");
          const montaz = c.selectedVariant?.timelineStages.find((s) => s.stageKey === "montaz");
          if (!produkcja && !montaz) return undefined;
          return `${produkcja?.durationMinDays ?? 0}-${produkcja?.durationMaxDays ?? 0}/${montaz?.durationMinDays ?? 0}-${montaz?.durationMaxDays ?? 0}`;
        },
        render: (c) => {
          const produkcja = c.selectedVariant?.timelineStages.find((s) => s.stageKey === "produkcja");
          const montaz = c.selectedVariant?.timelineStages.find((s) => s.stageKey === "montaz");
          if (!produkcja && !montaz) return undefined;
          return t("productionTimeValue", {
            productionMin: produkcja?.durationMinDays ?? 0,
            productionMax: produkcja?.durationMaxDays ?? 0,
            assemblyMin: montaz?.durationMinDays ?? 0,
            assemblyMax: montaz?.durationMaxDays ?? 0,
          });
        },
      },
      {
        key: "floorPlan",
        label: t("floorPlanLabel"),
        getValue: (c) => (c.project ? String(hasFloorPlan(c)) : undefined),
        render: (c) => (c.project ? (hasFloorPlan(c) ? t("floorPlanYes") : t("floorPlanNo")) : undefined),
      },
  ];

  const visibleRows = onlyDifferences
    ? rows.filter((row) => {
        const values = columns.map((column) => row.getValue(column));
        if (values.some((value) => value === undefined)) return true;
        return new Set(values).size > 1;
      })
    : rows;

  return (
    <div className="flex flex-col gap-brand-5">
      <Heading level="h1" surface="v5" className="text-h2">
        {t("heading")}
      </Heading>
      <Text tone="muted" surface="v5" measure>
        {t("intro", { count: columns.length })}
      </Text>

      {hasUnavailable && (
        <div className="flex flex-col gap-2 rounded-v5-card border border-status-conditional/40 bg-status-conditional/10 p-brand-3">
          <Text surface="v5" className="font-medium">
            {t("unavailableNotice")}
          </Text>
          <Link
            href={resultsHref}
            className="focus-ring w-fit rounded-data text-body font-medium text-brand-v5-ink underline underline-offset-2"
          >
            {t("backToResults")}
          </Link>
        </div>
      )}

      <label className="focus-ring flex w-fit cursor-pointer items-center gap-brand-2 rounded-data">
        <Checkbox surface="v5" checked={onlyDifferences} onChange={() => setOnlyDifferences((value) => !value)} />
        <Text as="span" surface="v5">
          {t("onlyDifferences")}
        </Text>
      </label>

      <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
        <table className="w-full min-w-[40rem] table-fixed border-collapse text-left">
          <caption className="sr-only">{t("tableCaption")}</caption>
          {/* table-fixed + colgroup: bez tego kolumna z dwoma "pigułkami"
              wariantu (np. KA78 G1 SZ) robi się szersza niż reszta w
              domyślnym auto-layout, a razem z nią rośnie też zdjęcie (w-full
              na stałym aspect-ratio) — jedna karta wygląda inaczej niż reszta
              mimo tego samego kodu. Równe kolumny wymuszają równe zdjęcia. */}
          <colgroup>
            <col className="w-40" />
            {columns.map((column) => (
              <col key={column.id} className="w-56" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-brand-v5-line bg-brand-v5-line/10">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-brand-v5-line/10 p-brand-3 text-label font-semibold text-brand-v5-muted"
              >
                {t("attributeColumn")}
              </th>
              {columns.map((column) => (
                <th key={column.id} scope="col" className="p-brand-3 align-top">
                  {column.project ? (
                    <div className="flex flex-col gap-brand-2">
                      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-data bg-brand-v5-line/40">
                        {column.project.coverImageUrl ? (
                          <Image
                            src={column.project.coverImageUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 20vw, 40vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <ImageOff className="size-6 text-brand-v5-muted/50" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/${locale}/project/${column.project.id}`}
                        className="focus-ring rounded-data font-display text-body-l font-semibold text-brand-v5-ink underline-offset-2 hover:underline"
                      >
                        {column.project.name}
                      </Link>
                      <Text tone="muted" surface="v5" className="text-data">
                        {column.project.producerName}
                      </Text>
                      {column.variantLinks.length > 0 && (
                        <div
                          role="group"
                          aria-label={t("variantPickerLabel", { name: column.project.name })}
                          className="flex flex-wrap gap-1"
                        >
                          {column.variantLinks.map((link) => (
                            <Link
                              key={link.standard}
                              href={link.href}
                              aria-current={link.isSelected}
                              className={`focus-ring rounded-full border px-brand-2 py-0.5 text-data font-medium transition-colors ${
                                link.isSelected
                                  ? "border-brand-v5-amber-strong bg-brand-v5-amber/10 text-brand-v5-ink"
                                  : "border-brand-v5-line text-brand-v5-muted hover:text-brand-v5-ink"
                              }`}
                            >
                              {standardLabel[link.standard]}
                            </Link>
                          ))}
                        </div>
                      )}
                      {column.selectedVariant && column.selectedVariant.priceMin !== undefined ? (
                        <>
                          <DataText as="span" surface="v5" className="block text-body-l font-semibold">
                            {t("priceFrom", { price: priceFormatter.format(column.selectedVariant.priceMin) })}
                          </DataText>
                          <Text tone="muted" surface="v5" className="text-data">
                            {(() => {
                              const { labels, extraCount } = getInPriceCostLineItemLabels(column.selectedVariant);
                              if (labels.length === 0) return t("costIncludedFallback");
                              return extraCount > 0
                                ? `${labels.join(", ")} ${t("costIncludedMore", { count: extraCount })}`
                                : labels.join(", ");
                            })()}
                          </Text>
                        </>
                      ) : (
                        <DataText as="span" surface="v5" className="block text-body-l font-semibold">
                          {t("priceOnRequest")}
                        </DataText>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <XCircle className="size-6 text-brand-v5-muted" aria-hidden="true" />
                      <Text surface="v5" className="font-medium">
                        {t("unavailableColumnLabel")}
                      </Text>
                      <Text tone="muted" surface="v5" className="text-data">
                        {t("unavailableColumnHint")}
                      </Text>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key} className="border-b border-brand-v5-line/50 last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-brand-v5-surface p-brand-3 text-left align-top font-medium text-brand-v5-ink"
                >
                  {row.key === "floorPlan" && <Ruler className="mr-1 inline size-3.5" aria-hidden="true" />}
                  {row.label}
                </th>
                {columns.map((column) => {
                  const value = row.render(column);
                  return (
                    <td key={column.id} className="p-brand-3 align-top">
                      <Text tone={value ? "default" : "muted"} surface="v5" className="text-data">
                        {value ?? t("notProvided")}
                      </Text>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
