import { ImageOff, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { DataText, Heading, Text } from "@/components/ui";
import { SAUNA_COMPARE_ROWS, type SaunaCompareValue } from "@/lib/compare-rows";
import type { Project } from "@/lib/data/types";
import { resolveProductHref } from "@/lib/product-family-groups";

export interface SaunaCompareColumn {
  id: string;
  /** null = usunięta, nieopublikowana albo spoza spa-modulowe/sauna (spec 0068 AC-14). */
  project: Project | null;
}

interface SaunaCompareTableProps {
  locale: string;
  columns: SaunaCompareColumn[];
  hasUnavailable: boolean;
  listHref: string;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Tabela porównania saun (spec 0068 AC-13), wiersze z COMPARE_ROWS_BY_KIND
// (lib/compare-rows.ts), nie z warunków w tym pliku. Osobny komponent obok
// ProjectCompareTable, który zostaje nietknięty. Bez stanu klienta, więc zwykły
// komponent serwerowy z useTranslations. Brak danych pola to "Brak danych",
// nigdy pusta komórka ani błąd.
export function SaunaCompareTable({ locale, columns, hasUnavailable, listHref }: SaunaCompareTableProps) {
  const t = useTranslations("SaunaCategoryPage.compare");

  function renderValue(project: Project, value: SaunaCompareValue) {
    switch (value.type) {
      case "producer":
        return project.producerName || null;
      case "price":
        return project.priceOnRequest ? (
          t("priceOnRequest")
        ) : (
          <DataText as="span" surface="v5" className="font-semibold">
            {priceFormatter.format(project.priceMin)} €
          </DataText>
        );
      case "yesno":
        if (value.value === null) return null;
        if (!value.value) return t("changingAreaNo");
        return value.description ? `${t("changingAreaYes")}, ${value.description}` : t("changingAreaYes");
      case "text":
        return value.text ?? null;
    }
  }

  return (
    <div className="flex flex-col gap-brand-5">
      <Heading level="h1" surface="v5" className="text-h2">
        {t("heading")}
      </Heading>

      {hasUnavailable && (
        <div className="flex flex-col gap-2 rounded-v5-card border border-status-conditional/40 bg-status-conditional/10 p-brand-3">
          <Text surface="v5" className="font-medium">
            {t("unavailableNotice")}
          </Text>
          <Link
            href={listHref}
            className="focus-ring w-fit rounded-data text-body font-medium text-brand-v5-ink underline underline-offset-2"
          >
            {t("back")}
          </Link>
        </div>
      )}

      <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
        <table className="w-full min-w-[40rem] table-fixed border-collapse text-left">
          <caption className="sr-only">{t("heading")}</caption>
          <colgroup>
            <col className="w-40" />
            {columns.map((column) => (
              <col key={column.id} className="w-56" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-brand-v5-line bg-brand-v5-line/10">
              <th scope="col" className="sticky left-0 z-10 bg-brand-v5-line/10 p-brand-3 text-label font-semibold text-brand-v5-muted">
                <span className="sr-only">{t("model")}</span>
              </th>
              {columns.map((column) => (
                <th key={column.id} scope="col" className="p-brand-3 align-top">
                  {column.project ? (
                    <span className="sr-only">{column.project.name}</span>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <XCircle className="size-6 text-brand-v5-muted" aria-hidden="true" />
                      <Text surface="v5" className="font-medium">
                        {t("unavailable")}
                      </Text>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAUNA_COMPARE_ROWS.map((row) => (
              <tr key={row.key} className="border-b border-brand-v5-line/50 last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-brand-v5-surface p-brand-3 text-left align-top font-medium text-brand-v5-ink"
                >
                  {t(row.labelKey)}
                </th>
                {columns.map((column) => {
                  if (!column.project) {
                    return (
                      <td key={column.id} className="p-brand-3 align-top">
                        <Text tone="muted" surface="v5" className="text-data">
                          —
                        </Text>
                      </td>
                    );
                  }
                  if (row.key === "model") {
                    return (
                      <td key={column.id} className="p-brand-3 align-top">
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
                            href={resolveProductHref(
                              column.project.family,
                              column.project.id,
                              locale,
                              column.project.slug,
                              column.project.spaSubcategory,
                            )}
                            className="focus-ring rounded-data font-display text-body-l font-semibold text-brand-v5-ink underline-offset-2 hover:underline"
                          >
                            {column.project.name}
                          </Link>
                        </div>
                      </td>
                    );
                  }
                  const content = renderValue(column.project, row.getValue(column.project));
                  return (
                    <td key={column.id} className="p-brand-3 align-top">
                      <Text tone={content ? "default" : "muted"} surface="v5" className="text-data">
                        {content ?? t("noData")}
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
