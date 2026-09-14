import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VerifiedManufacturerProjectCard } from "@/components/klient/VerifiedManufacturerProjectCard";
import { VerifiedManufacturersFilterBar } from "@/components/klient/VerifiedManufacturersFilterBar";
import { Button, Heading, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getVerifiedVolumeManufacturerProjects } from "@/lib/data/projects";
import { routing, type Locale } from "@/lib/i18n/routing";
import {
  buildVerifiedManufacturersHref,
  parseVerifiedManufacturersSearchParams,
} from "@/lib/verified-manufacturers-filters";

type PageParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "VerifiedManufacturersPage" });
  const canonicalPath = `/${locale}/verified-manufacturers`;

  // Ten sam wzorzec co /project-request (AC-18): x-default wskazuje na /pl,
  // jedyny język z gwarantowaną, kompletną treścią dziś.
  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/verified-manufacturers`]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/verified-manufacturers` },
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: canonicalPath,
    },
  };
}

export default async function VerifiedManufacturersPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const filter = parseVerifiedManufacturersSearchParams(rawSearchParams);
  const hasActiveFilter =
    filter.countryCode !== undefined || filter.sizeMin !== undefined || filter.sizeMax !== undefined || filter.q !== undefined;

  const [manufacturers, countries, t] = await Promise.all([
    getVerifiedVolumeManufacturerProjects(locale as Locale, filter),
    getCountries(),
    getTranslations("VerifiedManufacturersPage"),
  ]);

  // Odróżnia dwa stany puste (AC-14 vs AC-23): dopiero gdy filtrowany wynik
  // jest pusty I filtr jest aktywny, sprawdzamy, czy w ogóle istnieje
  // jakikolwiek zweryfikowany wolumenowo producent (bez filtra). Bez tego
  // rozróżnienia zawężenie filtrem do zera dopasowań wyglądałoby tak samo,
  // jak brak jakiegokolwiek zweryfikowanego producenta na platformie.
  let hasAnyVerifiedManufacturer = manufacturers.length > 0;
  if (!hasAnyVerifiedManufacturer && hasActiveFilter) {
    const unfiltered = await getVerifiedVolumeManufacturerProjects(locale as Locale);
    hasAnyVerifiedManufacturer = unfiltered.length > 0;
  }

  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));
  const projectRequestHref = `/${locale}/project-request`;

  // Bez wspólnego nagłówka producenta nad grupą projektów (na życzenie
  // zamawiającego): każdy kafelek niesie własny komplet danych producenta,
  // więc lista jest jedną, płaską kolumną kart zamiast sekcji pogrupowanych
  // per producent — przy większej liczbie zweryfikowanych producentów
  // wspólny nagłówek myliłby ze sobą projekty różnych producentów.
  const cards = manufacturers.flatMap((manufacturer) =>
    manufacturer.projects.map((project) => ({ manufacturer, project })),
  );

  return (
    // `full-bleed` + własny, szerszy niż standardowy Container (1440px) wrapper
    // (na życzenie zamawiającego): ten ekran to gęsta lista dwukolumnowa, nie
    // strona marketingowa, więc korzysta z tego samego, już istniejącego
    // wzorca ucieczki poza RouteShell/Container (Hero, CategoryShowcase, …),
    // tylko z własnym, szerszym ograniczeniem zamiast pełnego 100vw, żeby na
    // bardzo szerokich ekranach nie marnować miejsca po bokach na pusty margines.
    <div className="full-bleed px-[3%]">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-brand-6 lg:flex-row lg:items-start lg:gap-brand-4">
        {/* Aside renderuje się zawsze (na życzenie zamawiającego, usunięty
            nagłówek/przycisk nad listą): pasek filtra jest warunkowy (AC-19,
            tylko gdy istnieje co najmniej jeden zweryfikowany wolumenowo
            producent), ale blok z przyciskiem "Zgłoś zapytanie" pod nim
            zostaje zawsze widoczny, więc jeden, wspólny przycisk (AC-14)
            nadal istnieje na stronie niezależnie od stanu pustego/wypełnionego
            — ekran nigdy nie jest ślepą uliczką, tylko przeniesiony do paska
            zamiast nad listą. Węższy pasek (AC-19) zostawia więcej poziomego
            miejsca kafelkom projektów; `sticky` na dużych ekranach, więc
            zostaje widoczny przy przewijaniu listy kart po prawej. Offset
            `top-brand-7` (96px), nie `top-brand-6` (64px): `SiteHeader` jest
            sam `sticky`/`fixed` o wysokości ~88.7px (zmierzone na żywo), więc
            mniejszy offset chowałby górę paska pod nagłówkiem podczas
            przewijania. */}
        <aside className="flex w-full shrink-0 flex-col gap-brand-4 lg:sticky lg:top-brand-7 lg:w-64">
          {hasAnyVerifiedManufacturer && (
            <VerifiedManufacturersFilterBar locale={locale} countries={countries} filter={filter} />
          )}
          <div className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-4">
            <Heading level="h2" surface="v5" className="text-h3">
              {t("requestPromoHeading")}
            </Heading>
            <Button
              as="a"
              href={projectRequestHref}
              size="lg"
              surface="v5"
              className="bg-brand-v5-ink text-brand-v5-amber hover:bg-brand-v5-ink/90"
            >
              {t("ctaLabel")}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-brand-4">
          {/* h1 realny, ale wizualnie ukryty (WCAG 2.2 AA wymaga dokładnie
              jednego prawdziwego h1 na stronie): domy mają się renderować od
              samej góry, bez widocznego nagłówka nad nimi (na życzenie
              zamawiającego). */}
          <Heading level="h1" surface="v5" className="sr-only">
            {t("heading")}
          </Heading>

          {!hasAnyVerifiedManufacturer ? (
            <div className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-5">
              <Heading level="h2" surface="v5" className="text-h3">
                {t("emptyStateHeading")}
              </Heading>
              <Text tone="muted" surface="v5">
                {t("emptyStateBody")}
              </Text>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-5">
              <Heading level="h2" surface="v5" className="text-h3">
                {t("noMatchHeading")}
              </Heading>
              <Text tone="muted" surface="v5">
                {t("noMatchBody")}
              </Text>
              <Button as="a" href={buildVerifiedManufacturersHref(locale, {})} variant="secondary" surface="v5" className="w-fit">
                {t("clearFiltersLabel")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-brand-4">
              {cards.map(({ manufacturer, project }) => (
                <VerifiedManufacturerProjectCard
                  key={project.id}
                  project={project}
                  countryName={countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction}
                  href={`/${locale}/project/${project.id}`}
                  producerName={manufacturer.producerName}
                  unitsPerMonth={manufacturer.unitsPerMonth}
                  certifications={manufacturer.certifications}
                  deliveryCountries={manufacturer.deliveryCountries}
                  deliveryCountryNameByCode={countryNameByCode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
