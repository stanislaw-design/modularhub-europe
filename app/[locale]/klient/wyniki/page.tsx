import { CategoryFilterBar } from "@/components/klient/CategoryFilterBar";
import { ResultsFilterBar } from "@/components/klient/ResultsFilterBar";
import { ResultsSelection } from "@/components/klient/ResultsSelection";
import { Stack } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getEligibilityByCountry, getProjects } from "@/lib/data/projects";
import type { EligibilityByCountry } from "@/lib/data/types";
import { parseResultsSearchParams, sortResults } from "@/lib/results-filters";

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
      <ResultsSelection
        locale={locale}
        countryCode={filter.countryCode}
        sizeMin={filter.sizeMin}
        sizeMax={filter.sizeMax}
        countries={countries}
        serverItems={sortedProjects.map((project) => ({
          project,
          countryName: countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction,
          eligibilityStatus: eligibilityByProjectId.get(project.id),
        }))}
      />
    </Stack>
  );
}
