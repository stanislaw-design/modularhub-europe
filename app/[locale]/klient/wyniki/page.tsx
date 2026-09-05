import { auth } from "@/auth";
import { CategoryFilterBar } from "@/components/klient/CategoryFilterBar";
import { FamilyTabs } from "@/components/klient/FamilyTabs";
import { ResultsFilterBar } from "@/components/klient/ResultsFilterBar";
import { ResultsSelection } from "@/components/klient/ResultsSelection";
import { SubcategoryFilterBar } from "@/components/klient/SubcategoryFilterBar";
import { Stack } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getEligibilityByCountry, getProjects } from "@/lib/data/projects";
import type { EligibilityByCountry } from "@/lib/data/types";
import { getClientIdForUser, getFavoritedProductIds } from "@/lib/db/queries";
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

  const [countries, projects, eligibilityRows, session] = await Promise.all([
    getCountries(),
    getProjects(filter),
    filter.countryCode
      ? getEligibilityByCountry(filter.countryCode)
      : Promise.resolve<EligibilityByCountry[]>([]),
    auth(),
  ]);

  const isClientSession = session?.user.role === "client";
  let favoritedIds = new Set<string>();
  if (session && isClientSession) {
    const clientId = await getClientIdForUser(session.user.id);
    if (clientId) favoritedIds = await getFavoritedProductIds(clientId);
  }

  const sortedProjects = sortResults(projects, filter.sort);
  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));
  const eligibilityByProjectId = new Map(eligibilityRows.map((row) => [row.projectId, row.status]));

  return (
    <Stack gap={5}>
      <FamilyTabs
        locale={locale}
        family={filter.family}
        countryCode={filter.countryCode}
        sizeMin={filter.sizeMin}
        sizeMax={filter.sizeMax}
      />
      <ResultsFilterBar locale={locale} countries={countries} filter={filter} />
      {filter.family === "dom" && <CategoryFilterBar locale={locale} filter={filter} />}
      <SubcategoryFilterBar locale={locale} filter={filter} />
      <ResultsSelection
        locale={locale}
        countryCode={filter.countryCode}
        sizeMin={filter.sizeMin}
        sizeMax={filter.sizeMax}
        family={filter.family}
        sort={filter.sort}
        countries={countries}
        isClientSession={isClientSession}
        serverItems={sortedProjects.map((project) => ({
          project,
          countryName: countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction,
          eligibilityStatus: eligibilityByProjectId.get(project.id),
          favorited: favoritedIds.has(project.id),
        }))}
      />
    </Stack>
  );
}
