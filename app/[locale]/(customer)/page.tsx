// Tymczasowo wyłączone — sekcja "Więcej niż dom" (spec 0029), patrz użycie niżej.
// import { CategoryShowcase } from "@/components/klient/CategoryShowcase";
import { FeaturedProjectShowcase } from "@/components/klient/FeaturedProjectShowcase";
import { ClosingCta } from "@/components/klient/ClosingCta";
import { CompareHomesTeaser } from "@/components/klient/CompareHomesTeaser";
import { ComplianceEngineShowcase } from "@/components/klient/ComplianceEngineShowcase";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Faq } from "@/components/klient/Faq";
import { FloatingSearchButton } from "@/components/klient/FloatingSearchButton";
import { Hero } from "@/components/klient/Hero";
import { HowItWorksExplainer } from "@/components/klient/HowItWorksExplainer";
import { PopularHomes } from "@/components/klient/PopularHomes";
import { ProducerShowcase } from "@/components/klient/ProducerShowcase";
import { SearchCard } from "@/components/klient/SearchCard";
// Tymczasowo wyłączone — sekcja "Co mówią nasi klienci", patrz użycie niżej.
// import { Testimonials } from "@/components/klient/Testimonials";
import { getCountries } from "@/lib/data/countries";
import { getProducers } from "@/lib/data/producers";
import { getProjects } from "@/lib/data/projects";
import { routing, type Locale } from "@/lib/i18n/routing";

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
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: `/${locale}`,
      locale,
      type: "website",
    },
  };
}

export default async function KlientHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [countries, projects, producers] = await Promise.all([
    getCountries(),
    getProjects({ locale: locale as Locale }),
    getProducers(locale as Locale),
  ]);

  return (
    <div className="flex flex-col">
      <Hero>
        <SearchCard locale={locale} countries={countries} />
      </Hero>
      <FeaturedProjectShowcase locale={locale} />
      <PopularHomes locale={locale} projects={projects} countries={countries} />
      {/* Tymczasowo wyłączone — sekcja "Więcej niż dom" (spec 0029). Przywrócić: <CategoryShowcase locale={locale} /> */}
      <ComplianceEngineShowcase locale={locale} />
      <HowItWorksExplainer />
      <CompareHomesTeaser locale={locale} projects={projects} />
      <ProducerShowcase producers={producers} />
      <ClosingCta />
      {/* Tymczasowo wyłączone — sekcja "Co mówią nasi klienci". Przywrócić: <Testimonials /> */}
      <Faq />
      <FloatingSearchButton locale={locale} />
    </div>
  );
}
