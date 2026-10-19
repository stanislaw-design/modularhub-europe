import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { DataText, Heading, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";
import { formatPriceEur } from "@/lib/format-price";
import { resolveProductHref } from "@/lib/product-family-groups";

interface CompareHomesTeaserProps {
  locale: string;
  projects: Project[];
}

type Winner = "min" | "max";

// Indeksy kolumn z najlepszą wartością w wierszu. Bez zwycięzcy, gdy brakuje
// danych (mniej niż dwie wartości) albo wszystkie są równe: wyróżnienie, które
// nic nie rozstrzyga, tylko zaciemnia.
function bestIndexes(values: (number | null)[], mode: Winner): Set<number> {
  const present = values.filter((value): value is number => value !== null);
  if (present.length < 2 || new Set(present).size === 1) return new Set();
  const best = mode === "min" ? Math.min(...present) : Math.max(...present);
  return new Set(values.flatMap((value, index) => (value === best ? [index] : [])));
}

// Marketing preview only: a real, tabular side-by-side of a few illustrative
// projects (a genuine <table>, not a layout hack — spec 0015 AC-8). No
// comparison logic lives here beyond marking the best value per row; the button
// hands off to /results, where selecting up to three projects and comparing
// them for real already works (spec 0004/0005).
export async function CompareHomesTeaser({ locale, projects }: CompareHomesTeaserProps) {
  const compareProjects = projects.filter((project) => project.featured).slice(0, 3);
  // Jedna kolumna nie jest porównaniem (spec 0073 AC-9).
  if (compareProjects.length < 2) return null;
  const t = await getTranslations("CompareHomesTeaser");
  const resultsHref = `/${locale}/results`;

  const pricePerM2 = compareProjects.map((project) =>
    project.floorAreaM2 !== null && project.floorAreaM2 > 0
      ? Math.round(project.priceMin / project.floorAreaM2)
      : null,
  );

  const rows: {
    key: string;
    label: string;
    values: (number | null)[];
    mode: Winner;
    bestLabel: string;
    render: (project: Project, index: number) => ReactNode;
    emphasis?: boolean;
  }[] = [
    {
      key: "price",
      label: t("priceFromRow"),
      values: compareProjects.map((project) => project.priceMin),
      mode: "min",
      bestLabel: t("bestLowest"),
      render: (project) => formatPriceEur(project.priceMin, locale),
      emphasis: true,
    },
    {
      key: "pricePerM2",
      label: t("pricePerM2Row"),
      values: pricePerM2,
      mode: "min",
      bestLabel: t("bestLowest"),
      render: (_project, index) => {
        const value = pricePerM2[index];
        return value !== null ? t("perSquareMeter", { price: formatPriceEur(value, locale) }) : "—";
      },
    },
    {
      key: "floorArea",
      label: t("floorAreaRow"),
      values: compareProjects.map((project) => project.floorAreaM2),
      mode: "max",
      bestLabel: t("bestLargest"),
      render: (project) => (project.floorAreaM2 !== null ? `${project.floorAreaM2} m²` : "—"),
    },
    {
      key: "rooms",
      label: t("roomsRow"),
      values: compareProjects.map((project) => project.rooms),
      mode: "max",
      bestLabel: t("bestMost"),
      render: (project) => (project.rooms !== null ? project.rooms : "—"),
    },
    {
      key: "bedrooms",
      label: t("bedroomsRow"),
      values: compareProjects.map((project) => project.bedrooms),
      mode: "max",
      bestLabel: t("bestMost"),
      render: (project) => (project.bedrooms !== null ? project.bedrooms : "—"),
    },
    {
      key: "warranty",
      label: t("warrantyRow"),
      values: compareProjects.map((project) =>
        project.structuralWarrantyYears > 0 ? project.structuralWarrantyYears : null,
      ),
      mode: "max",
      bestLabel: t("bestLongest"),
      render: (project) =>
        project.structuralWarrantyYears > 0
          ? t("warrantyYears", { count: project.structuralWarrantyYears })
          : "—",
    },
  ];

  return (
    <section className="full-bleed py-brand-7">
      <div className="mx-auto flex max-w-[2000px] flex-col gap-brand-4 px-[3%]">
        <div className="flex flex-wrap items-end justify-between gap-brand-3">
          <div className="flex flex-col gap-1">
            <Heading level="h2">{t("heading")}</Heading>
            <Text tone="muted">{t("subheading")}</Text>
          </div>
          <Link
            href={resultsHref}
            className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong"
          >
            {t("compareButton")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="flex flex-col gap-brand-3 md:hidden">
          {compareProjects.map((project, index) => (
            <li
              key={project.id}
              className="overflow-hidden rounded-v5-card border border-brand-v5-line"
            >
              <Link
                href={resolveProductHref(
                  project.family,
                  project.id,
                  locale,
                  project.slug,
                  project.spaSubcategory,
                )}
                className="focus-ring group block"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={project.coverImageUrl}
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col p-brand-3">
                  <span className="flex items-center justify-between gap-2 text-body-l font-semibold text-brand-v5-ink">
                    {project.name}
                    <ArrowUpRight className="size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
                  </span>
                  <span className="text-data text-brand-v5-muted">{project.producerName}</span>
                </div>
              </Link>
              <dl className="flex flex-col">
                {rows.map((row) => {
                  const isBest = bestIndexes(row.values, row.mode).has(index);
                  return (
                    <div
                      key={row.key}
                      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-brand-v5-line p-brand-3 ${isBest ? "bg-brand-v5-amber/15" : ""}`}
                    >
                      <dt className="text-data font-semibold text-brand-v5-muted">{row.label}</dt>
                      <dd className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        <DataText
                          className={
                            row.emphasis
                              ? "text-2xl font-bold tracking-tight"
                              : isBest
                                ? "text-body-l font-bold"
                                : "text-body-l"
                          }
                        >
                          {row.render(project, index)}
                        </DataText>
                        {isBest ? (
                          <span className="inline-flex items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-2 py-0.5 text-data font-semibold text-brand-v5-amber-foreground">
                            <Check className="size-3.5" aria-hidden="true" />
                            {row.bestLabel}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-v5-card border border-brand-v5-line md:block">
          <table className="w-full min-w-[40rem] table-fixed border-collapse text-left">
            <caption className="sr-only">
              {t("captionCompare", { count: compareProjects.length })}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-28 p-brand-3 sm:w-40 lg:w-52">
                  <span className="sr-only">{t("featureColumnSr")}</span>
                </th>
                {compareProjects.map((project) => (
                  <th key={project.id} scope="col" className="p-brand-3 align-top lg:p-brand-4">
                    <Link
                      href={resolveProductHref(
                        project.family,
                        project.id,
                        locale,
                        project.slug,
                        project.spaSubcategory,
                      )}
                      className="focus-ring group block rounded-v5-card"
                    >
                      <div className="relative mb-brand-2 aspect-[16/10] w-full overflow-hidden rounded-v5-card">
                        <Image
                          src={project.coverImageUrl}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 28vw, 33vw"
                          className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                        />
                      </div>
                      <span className="flex items-center justify-between gap-2 text-body-l font-semibold text-brand-v5-ink">
                        {project.name}
                        <ArrowUpRight
                          className="size-4 shrink-0 text-brand-v5-muted transition-colors group-hover:text-brand-v5-ink"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="block text-data font-normal text-brand-v5-muted">
                        {project.producerName}
                      </span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const best = bestIndexes(row.values, row.mode);
                return (
                  <tr key={row.key} className="border-t border-brand-v5-line">
                    <th
                      scope="row"
                      className="p-brand-3 text-data font-semibold text-brand-v5-muted lg:p-brand-4"
                    >
                      {row.label}
                    </th>
                    {compareProjects.map((project, index) => {
                      const isBest = best.has(index);
                      return (
                        <td
                          key={project.id}
                          className={`p-brand-3 lg:p-brand-4 ${isBest ? "bg-brand-v5-amber/15" : ""}`}
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <DataText
                              className={
                                row.emphasis
                                  ? "text-2xl font-bold tracking-tight"
                                  : isBest
                                    ? "text-body-l font-bold"
                                    : "text-body-l"
                              }
                            >
                              {row.render(project, index)}
                            </DataText>
                            {isBest ? (
                              <span className="inline-flex items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-2 py-0.5 text-data font-semibold text-brand-v5-amber-foreground">
                                <Check className="size-3.5" aria-hidden="true" />
                                {row.bestLabel}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
