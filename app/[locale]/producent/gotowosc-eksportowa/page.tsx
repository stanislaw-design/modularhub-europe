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

  // Opcjonalne nip/countries/technology (spec 0016, AC-6): obecne tylko gdy producent
  // trafił tu z zapisu produktu, budują link do katalogu; brak nip nie zmienia dzisiejszego
  // zachowania (spec 0008, AC-10).
  const nipRaw = rawSearchParams.nip;
  const countriesRaw = rawSearchParams.countries;
  const technologyRaw = rawSearchParams.technology;
  const catalogHref =
    typeof nipRaw === "string" && nipRaw.length > 0
      ? `/${locale}/producent/produkty?${new URLSearchParams({
          nip: nipRaw,
          ...(typeof countriesRaw === "string" ? { countries: countriesRaw } : {}),
          ...(typeof technologyRaw === "string" ? { technology: technologyRaw } : {}),
        }).toString()}`
      : null;

  const [countries, entries] = await Promise.all([getCountries(), getExportReadiness()]);

  return (
    <ExportReadinessMap
      locale={locale}
      projectName={nazwa}
      countries={countries}
      entries={entries}
      catalogHref={catalogHref}
    />
  );
}
