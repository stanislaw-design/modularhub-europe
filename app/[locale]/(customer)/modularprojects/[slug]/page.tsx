import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ModularProjectArticle } from "@/components/klient/ModularProjectArticle";
import { ModularProjectStructuredData } from "@/components/klient/ModularProjectStructuredData";
import { getModularProjectBySlug, MODULARPROJECT_ENTRIES } from "@/lib/data/modularprojects";
import { routing } from "@/lib/i18n/routing";

type PageParams = { locale: string; slug: string };

// Wszystkie wpisy we wszystkich językach powstają statycznie (spec 0076 AC-7).
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    MODULARPROJECT_ENTRIES.map((entry) => ({ locale, slug: entry.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getModularProjectBySlug(slug, locale);
  if (!project) return {};

  const canonicalPath = `/${locale}/modularprojects/${slug}`;
  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/modularprojects/${slug}`]),
  );

  return {
    title: project.title,
    description: project.lead,
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/modularprojects/${slug}` },
    },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.lead,
      url: canonicalPath,
      publishedTime: project.publishedAt,
      images: [{ url: project.cover.src, alt: project.cover.alt }],
    },
  };
}

export default async function ModularProjectPage({ params }: { params: Promise<PageParams> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const project = await getModularProjectBySlug(slug, locale);
  if (!project) notFound();

  return (
    <>
      <ModularProjectStructuredData kind="article" locale={locale} project={project} />
      <ModularProjectArticle project={project} locale={locale} />
    </>
  );
}
