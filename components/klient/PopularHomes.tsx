import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";
import type { Country, Project } from "@/lib/data/types";
import { PopularHomeCard } from "./PopularHomeCard";

interface PopularHomesProps {
  locale: string;
  projects: Project[];
  countries: Country[];
}

// Real projects (Project.featured === true, already "polecane" per spec
// 0004 AC-12) shown right after the search card, so the product sells
// itself before any marketing copy (spec 0015 AC-4). Illustrative in the
// sense that "popular" isn't computed from real view counts.
export async function PopularHomes({ locale, projects, countries }: PopularHomesProps) {
  const t = await getTranslations("PopularHomes");
  const featured = projects.filter((project) => project.featured);
  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));

  return (
    <section className="py-brand-5">
      <div className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{t("heading")}</Heading>
          <Text tone="muted">{t("subheading")}</Text>
        </div>
        <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((project) => (
            <PopularHomeCard
              key={project.id}
              project={project}
              countryName={countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction}
              href={`/${locale}/klient/projekt/${project.id}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
