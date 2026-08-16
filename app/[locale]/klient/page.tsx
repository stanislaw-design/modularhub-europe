import { CategoryFilterBar } from "@/components/klient/CategoryFilterBar";
import { FeaturedHomes } from "@/components/klient/FeaturedHomes";
import { Hero } from "@/components/klient/Hero";
import { HowItWorks } from "@/components/klient/HowItWorks";
import { Stack } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getFeaturedProjects } from "@/lib/data/projects";

export default async function KlientHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [countries, featuredProjects] = await Promise.all([
    getCountries(),
    getFeaturedProjects(),
  ]);

  return (
    <Stack gap={5}>
      <Hero locale={locale} countries={countries} />
      <CategoryFilterBar />
      <FeaturedHomes locale={locale} projects={featuredProjects} countries={countries} />
      <HowItWorks />
    </Stack>
  );
}
