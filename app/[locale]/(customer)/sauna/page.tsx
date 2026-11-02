import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CategoryHeading } from "@/components/klient/CategoryHeading";
import { FamilyTabs } from "@/components/klient/FamilyTabs";
import { ResultsSelection } from "@/components/klient/ResultsSelection";
import { SaunaFilterBar } from "@/components/klient/SaunaFilterBar";
import { Stack, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getProjectsForRequestCached, getSaunaProducerOptionsCached } from "@/lib/data/public-cache";
import { routing, type Locale } from "@/lib/i18n/routing";
import { resolveProductHref } from "@/lib/product-family-groups";
import { sortResults } from "@/lib/results-filters";
import { buildSaunaHref, hasActiveSaunaFilter, parseSaunaSearchParams } from "@/lib/sauna-filters";

type PageParams = { locale: string };
type PageSearchParams = { [key: string]: string | string[] | undefined };

// Strona kategorii saun (spec 0068): własny H1 i SEO, a pod spodem to samo
// zapytanie (getProjects) i te same karty (ResultsSelection) co /results, więc
// nie powstaje druga kopia listy. Istnieje tylko dlatego, że /sauna/[slug] sam
// zwracał 404 pod adresem /sauna.
export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SaunaCategoryPage" });
  // Spec 0068 AC-4: canonical zawsze na /sauna bez parametrów. Noindex dla widoku
  // z filtrem ustawia sama strona znacznikiem <meta robots> (spec 0078: metadane
  // nie mogą czytać searchParams, żeby reszta strony została statyczna).
  const canonicalPath = `/${locale}/sauna`;
  const languageAlternates = Object.fromEntries(routing.locales.map((code) => [code, `/${code}/sauna`]));

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: {
        ...languageAlternates,
        "x-default": `/${routing.defaultLocale}/sauna`,
      },
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: canonicalPath,
    },
  };
}

interface SaunaCategoryPageProps {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}

// Spec 0078: statyczny szkielet, lista saun (zależna od searchParams) za Suspense.
export default function SaunaCategoryPage(props: SaunaCategoryPageProps) {
  return (
    <Suspense fallback={<div className="results-shell results-wide min-h-[60vh]" aria-busy="true" />}>
      <SaunaCategoryContent {...props} />
    </Suspense>
  );
}

async function SaunaCategoryContent({ params, searchParams }: SaunaCategoryPageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const filter = parseSaunaSearchParams(rawSearchParams);
  const t = await getTranslations({ locale, namespace: "SaunaCategoryPage" });

  const [countries, projects, producerOptions] = await Promise.all([
    getCountries(),
    getProjectsForRequestCached({
      family: "spa-modulowe",
      spaSubcategory: "sauna",
      seatingMin: filter.seatingMin,
      priceMin: filter.priceMin,
      priceMax: filter.priceMax,
      producerId: filter.producer,
      locale: locale as Locale,
    }),
    getSaunaProducerOptionsCached(),
  ]);

  const sortedProjects = sortResults(projects, filter.sort);
  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));

  // Spec 0068 AC-4: ItemList tylko dla widoku bez filtrów, bo widok z filtrem
  // jest noindex i jego lista nie opisuje kategorii.
  const jsonLd = hasActiveSaunaFilter(filter)
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: t("heading"),
        itemListElement: sortedProjects.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: resolveProductHref(project.family, project.id, locale, project.slug, project.spaSubcategory),
          name: project.name,
        })),
      };

  return (
    <>
      {hasActiveSaunaFilter(filter) && <meta name="robots" content="noindex, follow" />}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {/* Jak /results: od `lg` filtry w lewym panelu, wyniki dostają resztę
          szerokości (`.results-wide` zdejmuje limit kontenera, globals.css). */}
      <div className="results-shell results-wide grid gap-x-brand-5 gap-y-brand-5 lg:px-brand-4 lg:pt-brand-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <SaunaFilterBar
          locale={locale}
          filter={filter}
          producers={producerOptions}
          familyTabs={<FamilyTabs locale={locale} family="spa-modulowe" />}
        />
        <Stack gap={5} className="lg:col-start-2 lg:row-start-1">
          <Stack gap={2}>
            <CategoryHeading locale={locale} title={t("heading")} count={sortedProjects.length} />
            <Text tone="muted" surface="v5" measure>
              {t("intro")}
            </Text>
          </Stack>
          <ResultsSelection
            locale={locale}
            family="spa-modulowe"
            hideHeader
            compareKind="sauna"
            emptyClearHref={buildSaunaHref(locale)}
            serverItems={sortedProjects.map((project) => ({
              project,
              countryName: countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction,
            }))}
          />
        </Stack>
      </div>
    </>
  );
}
