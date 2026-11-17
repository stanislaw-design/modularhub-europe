import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CategoryHeading } from "@/components/klient/CategoryHeading";
import { FamilyTabs } from "@/components/klient/FamilyTabs";
import { OutdoorKitchenFilterBar } from "@/components/klient/OutdoorKitchenFilterBar";
import { ResultCard } from "@/components/klient/ResultCard";
import { Heading, Stack, Text } from "@/components/ui";
import { RouteWidthMarker } from "@/components/RouteWidthMarker";
import { getCountries } from "@/lib/data/countries";
import { getOutdoorKitchensCached } from "@/lib/data/public-cache";
import { routing, type Locale } from "@/lib/i18n/routing";
import {
  buildOutdoorKitchenHref,
  filterOutdoorKitchens,
  hasActiveOutdoorKitchenFilter,
  parseOutdoorKitchenSearchParams,
} from "@/lib/outdoor-kitchen-filters";
import { splitOutdoorKitchenSections } from "@/lib/outdoor-kitchen-sections";
import { resolveProductHref } from "@/lib/product-family-groups";

type PageParams = { locale: string };
type PageSearchParams = { [key: string]: string | string[] | undefined };

interface OutdoorKitchenCategoryPageProps {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}

// Strona kategorii kuchni ogrodowych (spec 0086 AC-12 do AC-14): dwie sekcje (w obudowie, modułowe) z kartami
// ResultCard i lewy panel jak na /sauna (przełącznik rodziny, typ, cena, sortowanie; decyzja właściciela
// 2026-11-17, rozszerza AC-14). Canonical zawsze bez parametrów; widok z filtrem dostaje noindex.
export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OutdoorKitchenCategoryPage" });
  const canonicalPath = `/${locale}/outdoor-kitchen`;
  const languageAlternates = Object.fromEntries(routing.locales.map((code) => [code, `/${code}/outdoor-kitchen`]));

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/outdoor-kitchen` },
    },
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), url: canonicalPath },
  };
}

// Serce ulubionych (FavoriteButton) czyta useSearchParams, więc lista stoi za Suspense,
// tak jak na /sauna (spec 0078): szkielet zostaje statyczny.
export default function OutdoorKitchenCategoryPage(props: OutdoorKitchenCategoryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="results-shell min-h-[60vh]" aria-busy="true">
          <RouteWidthMarker name="results-wide" />
        </div>
      }
    >
      <OutdoorKitchenCategoryContent {...props} />
    </Suspense>
  );
}

async function OutdoorKitchenCategoryContent({ params, searchParams }: OutdoorKitchenCategoryPageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const filter = parseOutdoorKitchenSearchParams(rawSearchParams);
  const filtered = hasActiveOutdoorKitchenFilter(filter);
  const [t, countries, projects] = await Promise.all([
    getTranslations({ locale, namespace: "OutdoorKitchenCategoryPage" }),
    getCountries(locale as Locale),
    getOutdoorKitchensCached(locale as Locale),
  ]);
  const sections = splitOutdoorKitchenSections(filterOutdoorKitchens(projects, filter), filter.sort);
  const listed = sections.flatMap((section) => section.projects);
  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("heading"),
    itemListElement: listed.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: resolveProductHref(project.family, project.id, locale, project.slug),
      name: project.name,
    })),
  };

  return (
    <>
      {filtered && <meta name="robots" content="noindex, follow" />}
      {/* ItemList tylko dla widoku bez filtrów (jak /sauna), bo widok z filtrem jest noindex. */}
      {!filtered && listed.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {/* Jak /sauna: od `lg` filtry w lewym, przyklejonym panelu, wyniki w drugiej kolumnie. */}
      <div className="results-shell grid gap-x-brand-5 gap-y-brand-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:px-brand-4 lg:pt-brand-4">
        <RouteWidthMarker name="results-wide" />
        <OutdoorKitchenFilterBar
          locale={locale}
          filter={filter}
          familyTabs={<FamilyTabs locale={locale} family="outdoor-kitchen" />}
        />
        <Stack gap={5} className="lg:col-start-2 lg:row-start-1">
          <Stack gap={2}>
            <CategoryHeading locale={locale} title={t("heading")} count={listed.length} />
            <Text tone="muted" surface="v5" measure>
              {t("intro")}
            </Text>
          </Stack>

          {sections.length === 0 && filtered ? (
            <Stack gap={2} className="rounded-v5-card border border-brand-v5-line p-brand-5">
              <Text surface="v5" className="font-semibold">
                {t("noMatches")}
              </Text>
              <Link
                href={buildOutdoorKitchenHref(locale)}
                className="focus-ring w-fit rounded-data text-data font-semibold text-brand-v5-ink underline underline-offset-2"
              >
                {t("clearFilters")}
              </Link>
            </Stack>
          ) : sections.length === 0 ? (
            // AC-13: brak produktów to pusty stan z drogą dalej, nigdy 404.
            <Stack gap={2} className="rounded-v5-card border border-brand-v5-line p-brand-5">
              <Text surface="v5" className="font-semibold">
                {t("emptyHeading")}
              </Text>
              <Link
                href={`/${locale}/results`}
                className="focus-ring w-fit rounded-data text-data font-semibold text-brand-v5-ink underline underline-offset-2"
              >
                {t("emptyLink")}
              </Link>
            </Stack>
          ) : (
            sections.map((section) => (
              <section
                key={section.kitchenType}
                aria-labelledby={`sekcja-${section.kitchenType}`}
                className="flex flex-col gap-brand-3"
              >
                <Stack gap={1}>
                  <Heading level="h2" surface="v5" className="text-h3">
                    <span id={`sekcja-${section.kitchenType}`}>{t(`sections.${section.kitchenType}.heading`)}</span>
                  </Heading>
                  <Text tone="muted" surface="v5" measure>
                    {t(`sections.${section.kitchenType}.intro`)}
                  </Text>
                </Stack>
                <ul className="grid gap-brand-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {section.projects.map((project) => (
                    <li key={project.id}>
                      <ResultCard
                        project={project}
                        locale={locale}
                        countryName={countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction}
                        favorite={{}}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </Stack>
      </div>
    </>
  );
}
