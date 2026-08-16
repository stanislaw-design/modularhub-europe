import { CategoryFilterBar } from "@/components/klient/CategoryFilterBar";
import { EmptyResults } from "@/components/klient/EmptyResults";
import { ResultsFilterBar } from "@/components/klient/ResultsFilterBar";
import { ResultsHeader } from "@/components/klient/ResultsHeader";
import { ResultsSelection } from "@/components/klient/ResultsSelection";
import { Stack } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getEligibilityByCountry, getProjects } from "@/lib/data/projects";
import type { EligibilityByCountry, Project } from "@/lib/data/types";
import { parseResultsSearchParams } from "@/lib/results-filters";

export default async function WynikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const filter = parseResultsSearchParams(rawSearchParams);

  const [countries, projects, eligibilityRows] = await Promise.all([
    getCountries(),
    getProjects(filter),
    filter.countryCode
      ? getEligibilityByCountry(filter.countryCode)
      : Promise.resolve<EligibilityByCountry[]>([]),
  ]);

  const sortedProjects = sortResults(projects);
  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));
  const eligibilityByProjectId = new Map(eligibilityRows.map((row) => [row.projectId, row.status]));

  return (
    <Stack gap={5}>
      <ResultsFilterBar
        locale={locale}
        countries={countries}
        countryCode={filter.countryCode}
        sizeMin={filter.sizeMin}
        sizeMax={filter.sizeMax}
      />
      <CategoryFilterBar />
      <ResultsHeader count={sortedProjects.length} countryCode={filter.countryCode} />
      {sortedProjects.length === 0 ? (
        <EmptyResults locale={locale} />
      ) : (
        <ResultsSelection
          locale={locale}
          countryCode={filter.countryCode}
          sizeMin={filter.sizeMin}
          sizeMax={filter.sizeMax}
          items={sortedProjects.map((project) => ({
            project,
            countryName: countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction,
            eligibilityStatus: eligibilityByProjectId.get(project.id),
          }))}
        />
      )}
    </Stack>
  );
}

function sortResults(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.priceMin - b.priceMin;
  });
}
