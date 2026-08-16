import { redirect } from "next/navigation";
import { RegistrationConfirmation } from "@/components/producent/RegistrationConfirmation";
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

  return <RegistrationConfirmation locale={locale} details={details} countries={countries} />;
}
