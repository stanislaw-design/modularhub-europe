import { ExportReadinessMap } from "@/components/producent/ExportReadinessMap";
import { getCountries } from "@/lib/data/countries";
import { getExportReadiness } from "@/lib/data/export-readiness";

interface GotowoscEksportowaPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GotowoscEksportowaPage({ params, searchParams }: GotowoscEksportowaPageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const nazwaRaw = rawSearchParams.nazwa;
  const nazwa = typeof nazwaRaw === "string" && nazwaRaw.trim().length > 0 ? nazwaRaw : null;

  const [countries, entries] = await Promise.all([getCountries(), getExportReadiness()]);

  return <ExportReadinessMap locale={locale} projectName={nazwa} countries={countries} entries={entries} />;
}
