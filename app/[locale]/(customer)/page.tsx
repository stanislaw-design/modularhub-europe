// Tymczasowo wyłączone — sekcja "Więcej niż dom" (spec 0029), patrz użycie niżej.
// import { CategoryShowcase } from "@/components/klient/CategoryShowcase";
import { BulkOrdersShowcase } from "@/components/klient/BulkOrdersShowcase";
import { ClosingCta } from "@/components/klient/ClosingCta";
import { CompareHomesTeaser } from "@/components/klient/CompareHomesTeaser";
import { ComplianceEngineShowcase } from "@/components/klient/ComplianceEngineShowcase";
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
import type { Locale } from "@/lib/i18n/routing";

export default async function KlientHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [countries, projects, producers] = await Promise.all([
    getCountries(),
    getProjects({ locale: locale as Locale }),
    getProducers(),
  ]);

  return (
    <div className="flex flex-col">
      <Hero>
        <SearchCard locale={locale} countries={countries} />
      </Hero>
      <BulkOrdersShowcase locale={locale} />
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
