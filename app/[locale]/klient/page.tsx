import { CategoryShowcase } from "@/components/klient/CategoryShowcase";
import { ClosingCta } from "@/components/klient/ClosingCta";
import { Hero } from "@/components/klient/Hero";
import { SearchCard } from "@/components/klient/SearchCard";
import { StatsBar } from "@/components/klient/StatsBar";
import { TrustedProducers } from "@/components/klient/TrustedProducers";
import { TrustFooterRow } from "@/components/klient/TrustFooterRow";
import { WhyUs } from "@/components/klient/WhyUs";
import { getCountries } from "@/lib/data/countries";
import { getProjects } from "@/lib/data/projects";

export default async function KlientHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [countries, projects] = await Promise.all([getCountries(), getProjects()]);
  const producerNames = [...new Set(projects.map((project) => project.producerName))];

  return (
    <div className="flex flex-col">
      <Hero>
        <SearchCard locale={locale} countries={countries} />
      </Hero>
      <StatsBar />
      <CategoryShowcase locale={locale} />
      <WhyUs />
      <TrustedProducers producerNames={producerNames} />
      <ClosingCta />
      <TrustFooterRow />
    </div>
  );
}
