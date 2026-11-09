import { Suspense } from "react";
import { CategoryFilterBar } from "@/components/klient/CategoryFilterBar";
import { FamilyTabs } from "@/components/klient/FamilyTabs";
import { OutdoorTvFilterBar } from "@/components/klient/OutdoorTvFilterBar";
import { ResultsFilterBar } from "@/components/klient/ResultsFilterBar";
import { ResultsSelection } from "@/components/klient/ResultsSelection";
import { SubcategoryFilterBar } from "@/components/klient/SubcategoryFilterBar";
import { Stack } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getProjectsForRequestCached } from "@/lib/data/public-cache";
import type { Locale } from "@/lib/i18n/routing";
import { sortOutdoorTvResults } from "@/lib/outdoor-tv-filters";
import { parseResultsSearchParams, sortResults } from "@/lib/results-filters";

interface ResultsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Spec 0078: szkielet strony jest statyczny, a wyniki (zależne od searchParams)
// strumieniują się za Suspense. Zapytania idą przez wspólny cache, a serca
// ulubionych ustala w przeglądarce AccountProvider, nie serwer.
export default function WynikiPage(props: ResultsPageProps) {
  return (
    <Suspense fallback={<div className="results-shell results-wide min-h-[60vh]" aria-busy="true" />}>
      <WynikiResults {...props} />
    </Suspense>
  );
}

async function WynikiResults({ params, searchParams }: ResultsPageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const parsedFilter = parseResultsSearchParams(rawSearchParams);
  // Outdoor TV (spec 0071 AC-5): kraj, metraż, cena i sortowanie z adresu są martwe,
  // więc nie docierają ani do zapytania, ani do nagłówka, linków rodzin i zaznaczenia.
  const isOutdoorTv = parsedFilter.family === "outdoor-tv";
  const filter = isOutdoorTv
    ? {
        ...parsedFilter,
        countryCode: undefined,
        sizeMin: undefined,
        sizeMax: undefined,
        priceMin: undefined,
        priceMax: undefined,
        sort: undefined,
      }
    : parsedFilter;

  // Spec 0082: kraj z adresu to tylko podpowiedź dla formularza zapytania, nie
  // trafia do zapytania ani do klucza cache (lista jest taka sama dla każdego kraju).
  const { countryCode: _countryHint, ...queryFilter } = filter;
  const [countries, projects] = await Promise.all([
    getCountries(),
    getProjectsForRequestCached({ ...queryFilter, locale: locale as Locale }),
  ]);

  const sortedProjects = isOutdoorTv
    ? sortOutdoorTvResults(projects, locale)
    : sortResults(projects, filter.sort);
  const countryNameByCode = new Map(
    countries.map((country) => [country.code, country.name]),
  );

  // Rodzina/kategoria/podkategoria (spec 0023, 0026) renderowane dwa razy:
  // raz w normalnym przepływie strony (widoczne tylko od `sm`, patrz
  // "hidden sm:contents" poniżej — rodzina nad paskiem wyszukiwania jak
  // dotąd, kategoria/podkategoria pod nim), raz jako `mobileFilters`
  // przekazane w głąb ResultsFilterBar, gdzie na telefonie trafiają do
  // rozwijanego arkusza filtrów razem z polami kraj/metraż/sortuj (żądanie:
  // na mobile domy widoczne od samej góry, cała wyszukiwarka schowana w
  // jednym miejscu). To zwykłe server components sterowane samym
  // `filter`/URL, bez stanu klienta, więc podwójne wyrenderowanie jest tanie
  // i bezpieczne — obie kopie zawsze pokazują ten sam, aktualny stan.
  const familyFilter = (
    <FamilyTabs
      locale={locale}
      family={filter.family}
      countryCode={filter.countryCode}
      sizeMin={filter.sizeMin}
      sizeMax={filter.sizeMax}
    />
  );
  const categoryFilters = (
    <>
      {filter.family === "dom" && (
        <CategoryFilterBar locale={locale} filter={filter} />
      )}
      <SubcategoryFilterBar locale={locale} filter={filter} />
    </>
  );

  return (
    <div className="results-shell results-wide grid gap-x-brand-5 gap-y-brand-5 lg:px-brand-4 lg:pt-brand-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      {/* Od `lg` pasek wyszukiwania jest lewym, przyklejonym panelem
          (kolumna 1); niżej zostaje poziomym rzędem nad treścią. Rodzina i
          kategorie wraz z nagłówkiem i siatką żyją w kolumnie 2, jak dotąd. */}
      {!isOutdoorTv && (
        <ResultsFilterBar
          locale={locale}
          filter={filter}
          mobileFilters={
            <>
              {familyFilter}
              {categoryFilters}
            </>
          }
          sidebarFilters={
            <>
              {familyFilter}
              {categoryFilters}
            </>
          }
        />
      )}
      <Stack gap={5} className={isOutdoorTv ? "lg:col-span-2" : "lg:col-start-2 lg:row-start-1"}>
        {isOutdoorTv ? (
          <>
            {familyFilter}
            <OutdoorTvFilterBar locale={locale} filter={filter} />
          </>
        ) : (
          <>
            <div className="hidden sm:contents lg:hidden">{familyFilter}</div>
            <div className="hidden sm:contents lg:hidden">{categoryFilters}</div>
          </>
        )}
        <ResultsSelection
        locale={locale}
        countryCode={filter.countryCode}
        sizeMin={filter.sizeMin}
        sizeMax={filter.sizeMax}
        family={filter.family}
        emptyClearHref={
          isOutdoorTv ? `/${locale}/results?family=outdoor-tv` : undefined
        }
        serverItems={sortedProjects.map((project) => ({
          project,
          countryName:
            countryNameByCode.get(project.countryOfProduction) ??
            project.countryOfProduction,
        }))}
        />
      </Stack>
    </div>
  );
}
