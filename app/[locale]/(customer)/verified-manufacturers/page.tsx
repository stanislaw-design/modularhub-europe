import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PopularHomeCard } from "@/components/klient/PopularHomeCard";
import { Button, Heading, StatusPill, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getVerifiedVolumeManufacturerProjects } from "@/lib/data/projects";
import { routing, type Locale } from "@/lib/i18n/routing";

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
}: {
  params: Promise<PageParams>;
}) {
  const { locale } = await params;
  const [manufacturers, countries, t] = await Promise.all([
    getVerifiedVolumeManufacturerProjects(locale as Locale),
    getCountries(),
    getTranslations("VerifiedManufacturersPage"),
  ]);

  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));
  const projectRequestHref = `/${locale}/project-request`;

  return (
    <div className="flex flex-col gap-brand-6">
      <div className="flex flex-col gap-brand-3">
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text tone="muted" surface="v5" className="text-body-l" measure>
          {t("intro")}
        </Text>
        {/* Jeden, wspólny przycisk dla całej strony (AC-14): renderuje się raz,
            niezależnie od stanu pustego/wypełnionego poniżej, ekran nigdy nie
            jest ślepą uliczką. */}
        <Button as="a" href={projectRequestHref} size="lg" surface="v5" className="w-fit">
          {t("ctaLabel")}
        </Button>
      </div>

      {manufacturers.length === 0 ? (
        <div className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-5">
          <Heading level="h2" surface="v5" className="text-h3">
            {t("emptyStateHeading")}
          </Heading>
          <Text tone="muted" surface="v5">
            {t("emptyStateBody")}
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-brand-6">
          {manufacturers.map((manufacturer) => (
            <div key={manufacturer.producerId} className="flex flex-col gap-brand-3">
              <div className="flex flex-wrap items-center gap-brand-2 border-b border-brand-v5-line pb-brand-3">
                <Heading level="h2" surface="v5" className="text-h3">
                  {manufacturer.producerName}
                </Heading>
                <StatusPill status="approved">{t("verifiedBadge")}</StatusPill>
              </div>
              <div className="flex flex-wrap gap-brand-4">
                {manufacturer.unitsPerMonth !== null && (
                  <Text tone="muted" surface="v5" className="text-data">
                    {t("capacityLabel", { units: manufacturer.unitsPerMonth })}
                  </Text>
                )}
                {manufacturer.certifications.length > 0 && (
                  <Text tone="muted" surface="v5" className="text-data">
                    {t("certificationsLabel", { list: manufacturer.certifications.join(", ") })}
                  </Text>
                )}
                {manufacturer.deliveryCountries.length > 0 && (
                  <Text tone="muted" surface="v5" className="text-data">
                    {t("deliveryLabel", {
                      list: manufacturer.deliveryCountries
                        .map((code) => countryNameByCode.get(code) ?? code)
                        .join(", "),
                    })}
                  </Text>
                )}
              </div>
              <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-3">
                {manufacturer.projects.map((project) => (
                  <PopularHomeCard
                    key={project.id}
                    project={project}
                    countryName={countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction}
                    href={`/${locale}/project/${project.id}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
