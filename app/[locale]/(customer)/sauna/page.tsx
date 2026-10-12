import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/auth";
import { ResultsSelection } from "@/components/klient/ResultsSelection";
import { SaunaFilterBar } from "@/components/klient/SaunaFilterBar";
import { Heading, Stack, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getProjects, getSaunaProducerOptions } from "@/lib/data/projects";
import { getClientIdForUser, getFavoritedProductIds } from "@/lib/db/queries";
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
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "SaunaCategoryPage" });
  // Spec 0068 AC-4: ktokolwiek parametr filtra, canonical zawsze na /sauna bez
  // parametrów, a widok z filtrem dostaje noindex, follow (parametry nie mnożą
  // indeksowanych adresów).
  const filtered = hasActiveSaunaFilter(parseSaunaSearchParams(rawSearchParams));
  const canonicalPath = `/${locale}/sauna`;
  const languageAlternates = Object.fromEntries(routing.locales.map((code) => [code, `/${code}/sauna`]));

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/sauna` },
    },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), url: canonicalPath },
  };
}

export default async function SaunaCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const filter = parseSaunaSearchParams(rawSearchParams);
  const t = await getTranslations({ locale, namespace: "SaunaCategoryPage" });

  const [countries, projects, producerOptions, session] = await Promise.all([
    getCountries(),
    getProjects({
      family: "spa-modulowe",
      spaSubcategory: "sauna",
      seatingMin: filter.seatingMin,
      priceMin: filter.priceMin,
      priceMax: filter.priceMax,
      producerId: filter.producer,
      locale: locale as Locale,
    }),
    getSaunaProducerOptions(),
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
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <Stack gap={5} className="results-shell">
        <nav aria-label={t("breadcrumbAriaLabel")}>
          <ol className="flex items-center gap-brand-1 text-data text-brand-v5-muted">
            <li>
              <Link href={`/${locale}`} className="focus-ring rounded-data underline-offset-2 hover:underline">
                {t("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{t("breadcrumbCurrent")}</li>
          </ol>
        </nav>
        <Stack gap={2}>
          <Heading level="h1" surface="v5">
            {t("heading")}
            <span className="ml-brand-2 text-brand-v5-muted">
              {t("modelCount", { count: sortedProjects.length })}
            </span>
          </Heading>
          <Text tone="muted" surface="v5" measure>
            {t("intro")}
          </Text>
        </Stack>
        <SaunaFilterBar locale={locale} filter={filter} producers={producerOptions} />
        <ResultsSelection
          locale={locale}
          family="spa-modulowe"
          isClientSession={isClientSession}
          hideHeader
          compareKind="sauna"
          emptyClearHref={buildSaunaHref(locale)}
          serverItems={sortedProjects.map((project) => ({
            project,
            countryName: countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction,
            favorited: favoritedIds.has(project.id),
          }))}
        />
      </Stack>
    </>
  );
}
