import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Heading, ScrollReveal, Text } from "@/components/ui";
import type { Country, Project } from "@/lib/data/types";
import { resolveProductHref } from "@/lib/product-family-groups";
import { PopularHomeCard } from "./PopularHomeCard";

interface PopularHomesProps {
  locale: string;
  projects: Project[];
  countries: Country[];
}

// One lead photo plus up to three beside it; more than four would break the
// composition, the rest is one click away on the results page.
const MAX_SHOWN = 4;

// The big left-hand card; the rest keep their incoming order.
const LEAD_SLUG = "framedev-31";

// Real projects (Project.featured === true, already "polecane" per spec
// 0004 AC-12) shown right after the search card, so the product sells
// itself before any marketing copy (spec 0015 AC-4). Illustrative in the
// sense that "popular" isn't computed from real view counts. Full-bleed band,
// same breakout as Hero, so the section runs edge to edge of the viewport.
export async function PopularHomes({ locale, projects, countries }: PopularHomesProps) {
  // getProjects has no ORDER BY, so without this the lead card is whichever
  // featured row Postgres returns first.
  const featured = projects
    .filter((project) => project.featured)
    .sort((a, b) => Number(b.slug === LEAD_SLUG) - Number(a.slug === LEAD_SLUG))
    .slice(0, MAX_SHOWN);
  // Pusta lista nie zostawia samego nagłówka (spec 0073 AC-9).
  if (featured.length === 0) return null;
  const t = await getTranslations("PopularHomes");
  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));
  const [lead, ...rest] = featured;

  const renderCard = (project: Project, variant: "lead" | "compact") => (
    <PopularHomeCard
      key={project.id}
      project={project}
      variant={variant}
      countryName={countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction}
      locale={locale}
      href={resolveProductHref(project.family, project.id, locale, project.slug, project.spaSubcategory)}
    />
  );

  return (
    <section className="full-bleed my-brand-5 border-y border-brand-v5-line bg-brand-v5-line/10 py-brand-6">
      <div className="mx-auto flex max-w-[2000px] flex-col gap-brand-4 px-[3%]">
        <div className="flex flex-col gap-brand-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <Heading level="h2">{t("heading")}</Heading>
            <Text tone="muted">{t("subheading")}</Text>
          </div>
          <Link
            href={`/${locale}/results`}
            className="focus-ring group inline-flex w-fit items-center gap-1 text-data font-semibold text-brand-v5-ink"
          >
            {t("viewAll")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
        <ScrollReveal>
          <div className="grid grid-cols-1 gap-brand-3 lg:grid-cols-12">
            <div className={`flex ${rest.length === 0 ? "lg:col-span-12" : "lg:col-span-7"}`}>
              {renderCard(lead, "lead")}
            </div>
            {rest.length > 0 ? (
              <div className="flex flex-col gap-brand-3 lg:col-span-5 lg:[&>a]:flex-1">
                {rest.map((project) => renderCard(project, "compact"))}
              </div>
            ) : null}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
