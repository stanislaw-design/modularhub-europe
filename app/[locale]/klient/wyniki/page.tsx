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
import type { Locale } from "@/lib/i18n/routing";
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
    getProjects({ ...filter, locale: locale as Locale }),
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

  // Rodzina/kategoria/podkategoria (spec 0023, 0026) renderowane dwa razy:
  // raz w normalnym przepływie strony (widoczne tylko od `sm`, patrz
  // "hidden sm:contents" poniżej — inline nad siatką jak dotąd), raz jako
  // `mobileFilters` przekazane w głąb ResultsFilterBar, gdzie na telefonie
  // trafiają do rozwijanego arkusza filtrów razem z polami kraj/metraż/sortuj
  // (żądanie: na mobile domy widoczne od samej góry, cała wyszukiwarka
  // schowana w jednym miejscu). To zwykłe server components sterowane samym
  // `filter`/URL, bez stanu klienta, więc podwójne wyrenderowanie jest tanie
  // i bezpieczne — obie kopie zawsze pokazują ten sam, aktualny stan.
  const familyAndCategoryFilters = (
    <>
      <FamilyTabs
        locale={locale}
        family={filter.family}
        countryCode={filter.countryCode}
        sizeMin={filter.sizeMin}
        sizeMax={filter.sizeMax}
      />
      {filter.family === "dom" && <CategoryFilterBar locale={locale} filter={filter} />}
      <SubcategoryFilterBar locale={locale} filter={filter} />
    </>
  );

  return (
    <Stack gap={5} className="results-shell">
      <div className="hidden sm:contents">{familyAndCategoryFilters}</div>
      <ResultsFilterBar
        locale={locale}
        countries={countries}
        filter={filter}
        mobileFilters={familyAndCategoryFilters}
      />
      <ResultsSelection
        locale={locale}
        countryCode={filter.countryCode}
        sizeMin={filter.sizeMin}
        sizeMax={filter.sizeMax}
        family={filter.family}
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
