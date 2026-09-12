import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { DataText, Heading, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";

interface CompareHomesTeaserProps {
  locale: string;
  projects: Project[];
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Marketing preview only: a real, tabular side-by-side of a few illustrative
// projects (a genuine <table>, not a layout hack — spec 0015 AC-8). No
// comparison logic lives here; the button hands off to /wyniki, where
// selecting up to three projects and comparing them for real already works
// (spec 0004/0005).
export async function CompareHomesTeaser({ locale, projects }: CompareHomesTeaserProps) {
  const t = await getTranslations("CompareHomesTeaser");
  const compareProjects = projects.filter((project) => project.featured).slice(0, 3);
  const resultsHref = `/${locale}/results`;

  return (
    <section className="py-brand-7">
      <div className="flex flex-col gap-brand-4">
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
        <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
          <table className="w-full min-w-[36rem] table-fixed border-collapse text-left">
            <caption className="sr-only">
              {t("captionCompare", { count: compareProjects.length })}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-32 p-brand-2">
                  <span className="sr-only">{t("featureColumnSr")}</span>
                </th>
                {compareProjects.map((project) => (
                  <th key={project.id} scope="col" className="p-brand-2">
                    <div className="relative mb-brand-1 aspect-[4/3] w-full overflow-hidden rounded-v5-card">
                      <Image
                        src={project.coverImageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 20vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-body-l font-semibold text-brand-v5-ink">
                      {project.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-brand-v5-line">
                <th scope="row" className="p-brand-2 text-data font-semibold text-brand-v5-muted">
                  {t("priceFromRow")}
                </th>
                {compareProjects.map((project) => (
                  <td key={project.id} className="p-brand-2">
                    <DataText className="text-body font-semibold">
                      {priceFormatter.format(project.commercial.housePriceMinEur)} €
                    </DataText>
                  </td>
                ))}
              </tr>
              <tr className="border-t border-brand-v5-line">
                <th scope="row" className="p-brand-2 text-data font-semibold text-brand-v5-muted">
                  {t("floorAreaRow")}
                </th>
                {compareProjects.map((project) => (
                  <td key={project.id} className="p-brand-2">
                    <DataText className="text-body">{project.floorAreaM2} m²</DataText>
                  </td>
                ))}
              </tr>
              <tr className="border-t border-brand-v5-line">
                <th scope="row" className="p-brand-2 text-data font-semibold text-brand-v5-muted">
                  {t("roomsRow")}
                </th>
                {compareProjects.map((project) => (
                  <td key={project.id} className="p-brand-2">
                    <DataText className="text-body">{project.rooms}</DataText>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
