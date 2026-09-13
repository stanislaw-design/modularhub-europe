import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProjectRequestFlow } from "@/components/klient/ProjectRequestFlow";
import { getCountries } from "@/lib/data/countries";
import { routing } from "@/lib/i18n/routing";

type PageParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProjectRequestPage" });
  const canonicalPath = `/${locale}/project-request`;

  // Ten sam wzorzec co strona projektu (spec 0036 AC-8): x-default wskazuje
  // na /pl, jedyny język z gwarantowaną, kompletną treścią dziś.
  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/project-request`]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/project-request` },
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: canonicalPath,
    },
  };
}

export default async function ProjectRequestPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale } = await params;
  const countries = await getCountries();

  return <ProjectRequestFlow locale={locale} countries={countries} />;
}
