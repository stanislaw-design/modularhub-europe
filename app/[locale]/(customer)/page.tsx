import { CategoryShowcase } from "@/components/klient/CategoryShowcase";
import { FeaturedProjectShowcase } from "@/components/klient/FeaturedProjectShowcase";
import { ClosingCta } from "@/components/klient/ClosingCta";
import { CompareHomesTeaser } from "@/components/klient/CompareHomesTeaser";
import { ComplianceEngineShowcase } from "@/components/klient/ComplianceEngineShowcase";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Faq } from "@/components/klient/Faq";
import { FloatingSearchButton } from "@/components/klient/FloatingSearchButton";
import { Hero } from "@/components/klient/Hero";
import { HomeStructuredData } from "@/components/klient/HomeStructuredData";
import { HowItWorksExplainer } from "@/components/klient/HowItWorksExplainer";
import { PopularHomes } from "@/components/klient/PopularHomes";
import { ProducerShowcase } from "@/components/klient/ProducerShowcase";
import { SearchCard } from "@/components/klient/SearchCard";
import { Testimonials } from "@/components/klient/Testimonials";
import { getCountries } from "@/lib/data/countries";
import { getProducers } from "@/lib/data/producers";
import { getProjects } from "@/lib/data/projects";
import { routing, type Locale } from "@/lib/i18n/routing";
import { captureError } from "@/lib/observability/errors";

// Sekcje wyłączone na razie (spec 0073 AC-7). categoryShowcase ("Więcej niż dom",
// spec 0029): wróci po decyzji produktowej o kategoriach. testimonials ("Co mówią nasi
// klienci"): wróci dopiero z prawdziwymi opiniami klientów.
const HOME_SECTIONS = { categoryShowcase: false, testimonials: false } as const;

const OG_IMAGE = "/images/og/home.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const languageAlternates = Object.fromEntries(routing.locales.map((code) => [code, `/${code}`]));

  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}` },
    },
    // Strona ustawia openGraph sama: płytkie scalenie metadanych zastępuje openGraph layoutu.
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: `/${locale}`,
      locale,
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: t("metaTitle") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: [{ url: OG_IMAGE, alt: t("metaTitle") }],
    },
  };
}

export default async function KlientHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const countries = await getCountries(locale as Locale);
  // Awaria jednego zapytania (np. limit bazy) ukrywa tylko zależne od niego sekcje, nie całą
  // stronę (spec 0073 AC-8). Błąd idzie do Sentry z area/section, żeby ukrycie nie było ciche.
  const [projectsResult, producersResult] = await Promise.allSettled([
    getProjects({ locale: locale as Locale }),
    getProducers(locale as Locale),
  ]);
  if (projectsResult.status === "rejected") {
    captureError(projectsResult.reason, { area: "home", section: "projects" });
  }
  if (producersResult.status === "rejected") {
    captureError(producersResult.reason, { area: "home", section: "producers" });
  }
  const projects = projectsResult.status === "fulfilled" ? projectsResult.value : [];
  const producers = producersResult.status === "fulfilled" ? producersResult.value : [];

  return (
    <div className="flex flex-col">
      <HomeStructuredData locale={locale} />
      <Hero>
        <SearchCard locale={locale} countries={countries} />
      </Hero>
      <FeaturedProjectShowcase locale={locale} />
      <PopularHomes locale={locale} projects={projects} countries={countries} />
      {HOME_SECTIONS.categoryShowcase ? <CategoryShowcase locale={locale} /> : null}
      <ComplianceEngineShowcase locale={locale} />
      <HowItWorksExplainer locale={locale} />
      <CompareHomesTeaser locale={locale} projects={projects} />
      <ProducerShowcase producers={producers} locale={locale} />
      <ClosingCta />
      {HOME_SECTIONS.testimonials ? <Testimonials /> : null}
      <Faq />
      <FloatingSearchButton locale={locale} />
    </div>
  );
}
