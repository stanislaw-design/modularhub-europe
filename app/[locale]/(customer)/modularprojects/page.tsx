import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ModularProjectCard } from "@/components/klient/ModularProjectCard";
import { ModularProjectsBrowser } from "@/components/klient/ModularProjectsBrowser";
import { ModularProjectStructuredData } from "@/components/klient/ModularProjectStructuredData";
import { Heading, Text } from "@/components/ui";
import { getModularProjects } from "@/lib/data/modularprojects";
import { routing } from "@/lib/i18n/routing";

type PageParams = { locale: string };

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ModularProjectsPage" });
  const projects = await getModularProjects(locale);
  const canonicalPath = `/${locale}/modularprojects`;
  const languageAlternates = Object.fromEntries(routing.locales.map((code) => [code, `/${code}/modularprojects`]));

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/modularprojects` },
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: canonicalPath,
      ...(projects[0] ? { images: [{ url: projects[0].cover.src, alt: projects[0].cover.alt }] } : {}),
    },
  };
}

// Publiczna lista realizacji ModularProjects (spec 0076 AC-6), od najnowszej.
export default async function ModularProjectsPage({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "ModularProjectsPage" });
  const projects = await getModularProjects(locale);

  return (
    <div className="modularprojects-wide py-brand-6">
      <ModularProjectStructuredData
        kind="collection"
        locale={locale}
        name={t("heading")}
        description={t("metaDescription")}
        projects={projects}
      />
      <div className="flex flex-col gap-brand-4">
        <header className="flex max-w-3xl flex-col gap-brand-2">
          <Heading level="h1" surface="v5">
            {t("heading")}
          </Heading>
          <Text surface="v5" tone="muted" measure>
            {t("intro")}
          </Text>
        </header>
        {projects.length === 0 ? (
          <Text surface="v5">{t("empty")}</Text>
        ) : (
          <ModularProjectsBrowser
            locale={locale}
            items={projects.map((project) => ({
              slug: project.slug,
              title: project.title,
              lead: project.lead,
              status: project.status,
              publishedAt: project.publishedAt,
              card: <ModularProjectCard project={project} locale={locale} />,
              featuredCard: <ModularProjectCard project={project} locale={locale} variant="featured" />,
            }))}
          />
        )}
      </div>
    </div>
  );
}
