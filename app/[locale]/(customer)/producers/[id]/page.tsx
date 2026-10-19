import { ArrowLeft, BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PopularHomeCard } from "@/components/klient/PopularHomeCard";
import { Heading, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getProducerById } from "@/lib/data/producers";
import { getProjects } from "@/lib/data/projects";
import type { ProductFamily } from "@/lib/data/types";
import { routing, type Locale } from "@/lib/i18n/routing";
import { resolveProductHref } from "@/lib/product-family-groups";

type PageParams = { locale: string; id: string };

const FAMILIES: ProductFamily[] = ["dom", "spa-modulowe", "kontenery-modulowe", "outdoor-tv"];

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const producer = await getProducerById(id, locale as Locale);
  if (!producer || !producer.verified) return { robots: { index: false } };
  const t = await getTranslations({ locale, namespace: "ProducerDetailPage" });
  const canonicalPath = `/${locale}/producers/${id}`;
  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/producers/${id}`]),
  );
  const title = t("metaTitle", { name: producer.name });

  return {
    title,
    description: producer.description ?? t("metaDescription", { name: producer.name }),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/producers/${id}` },
    },
    openGraph: { title, url: canonicalPath },
  };
}

// Strona producenta: kim jest i wszystkie jego opublikowane modele, ze
// wszystkich rodzin (getProjects filtruje po jednej rodzinie naraz).
export default async function ProducerDetailPage({ params }: { params: Promise<PageParams> }) {
  const { locale, id } = await params;
  const producer = await getProducerById(id, locale as Locale);
  if (!producer || !producer.verified) notFound();

  const [t, countries, projectsByFamily] = await Promise.all([
    getTranslations({ locale, namespace: "ProducerDetailPage" }),
    getCountries(locale as Locale),
    Promise.all(
      FAMILIES.map((family) => getProjects({ family, producerId: id, locale: locale as Locale })),
    ),
  ]);
  const projects = projectsByFamily.flat();
  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));
  const deliveryNames = producer.deliveryCountries.map(
    (code) => countryNameByCode.get(code) ?? code,
  );

  return (
    <div className="full-bleed px-[3%] py-brand-6">
      <div className="mx-auto flex max-w-[2000px] flex-col gap-brand-5">
        <Link
          href={`/${locale}/producers`}
          className="focus-ring inline-flex w-fit items-center gap-1 text-data font-semibold text-brand-v5-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("back")}
        </Link>
        <header className="flex flex-col gap-brand-2">
          <span className="inline-flex w-fit items-center gap-1 text-data font-semibold text-brand-v5-ink">
            <BadgeCheck className="size-4 text-status-approved" aria-hidden="true" />
            {t("verified")}
          </span>
          <Heading level="h1" surface="v5">
            {producer.name}
          </Heading>
          <ul className="flex flex-wrap gap-x-brand-4 gap-y-1 text-data text-brand-v5-muted">
            {producer.completedProjectsCount > 0 ? (
              <li className="font-semibold text-brand-v5-ink">
                {t("completedProjects", { count: producer.completedProjectsCount })}
              </li>
            ) : null}
            <li>{t("models", { count: producer.modelsCount })}</li>
            {deliveryNames.length > 0 ? (
              <li>{t("deliveryTo", { countries: deliveryNames.join(", ") })}</li>
            ) : null}
          </ul>
          {producer.description ? (
            <Text surface="v5" measure className="mt-brand-1">
              {producer.description}
            </Text>
          ) : null}
        </header>
        <section className="flex flex-col gap-brand-3">
          <Heading level="h2">{t("modelsHeading")}</Heading>
          {projects.length === 0 ? (
            <Text tone="muted">{t("noModels")}</Text>
          ) : (
            <ul className="grid grid-cols-1 gap-brand-3 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <li key={project.id} className="flex">
                  <PopularHomeCard
                    project={project}
                    variant="lead"
                    locale={locale}
                    countryName={
                      countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction
                    }
                    href={resolveProductHref(
                      project.family,
                      project.id,
                      locale,
                      project.slug,
                      project.spaSubcategory,
                    )}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
