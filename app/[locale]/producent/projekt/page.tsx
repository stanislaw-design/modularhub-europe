import { redirect } from "next/navigation";
import { ProducerRegistrationBar } from "@/components/producent/ProducerRegistrationBar";
import { ProjectWizard } from "@/components/producent/ProjectWizard";
import { Stack } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { parseRegistrationDetails } from "@/lib/producer-registration";

export default async function PierwszyProjektPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const countries = await getCountries();
  const knownCountryCodes = new Set(countries.map((country) => country.code));
  const details = parseRegistrationDetails(rawSearchParams, knownCountryCodes);

  if (details === null) {
    redirect(`/${locale}/producent`);
  }

  return (
    <Stack gap={4}>
      <ProducerRegistrationBar details={details} countries={countries} />
      <ProjectWizard locale={locale} nip={details.nip} countries={countries} />
    </Stack>
  );
}
