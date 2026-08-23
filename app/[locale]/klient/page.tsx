import { CategoryShowcase } from "@/components/klient/CategoryShowcase";
import { ClosingCta } from "@/components/klient/ClosingCta";
import { CompareHomesTeaser } from "@/components/klient/CompareHomesTeaser";
import { ComplianceEngineShowcase } from "@/components/klient/ComplianceEngineShowcase";
import { Faq } from "@/components/klient/Faq";
import { Hero } from "@/components/klient/Hero";
import { HowItWorksExplainer } from "@/components/klient/HowItWorksExplainer";
import { PopularHomes } from "@/components/klient/PopularHomes";
import { ProducerShowcase } from "@/components/klient/ProducerShowcase";
import { SearchCard } from "@/components/klient/SearchCard";
import { Testimonials } from "@/components/klient/Testimonials";
import { getCountries } from "@/lib/data/countries";
import { getProducers } from "@/lib/data/producers";
import { getProjects } from "@/lib/data/projects";

export default async function KlientHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [countries, projects, producers] = await Promise.all([
    getCountries(),
    getProjects(),
    getProducers(),
  ]);

  return (
    <div className="flex flex-col">
      <Hero>
        <SearchCard locale={locale} countries={countries} />
      </Hero>
      <PopularHomes locale={locale} projects={projects} countries={countries} />
      <CategoryShowcase locale={locale} />
      <ComplianceEngineShowcase locale={locale} />
      <HowItWorksExplainer />
      <CompareHomesTeaser locale={locale} projects={projects} />
      <ProducerShowcase producers={producers} />
      <ClosingCta />
      <Testimonials />
      <Faq />
    </div>
  );
}
