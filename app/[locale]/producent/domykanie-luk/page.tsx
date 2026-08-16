import { redirect } from "next/navigation";
import { GapClosureView } from "@/components/producent/GapClosureView";
import { getCountries } from "@/lib/data/countries";
import { getExportReadiness } from "@/lib/data/export-readiness";

interface DomykanieLukPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function buildMapHref(locale: string, projectName: string | null): string {
  return `/${locale}/producent/gotowosc-eksportowa${
    projectName ? `?nazwa=${encodeURIComponent(projectName)}` : ""
  }`;
}

export default async function DomykanieLukPage({ params, searchParams }: DomykanieLukPageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);

  const nazwaRaw = rawSearchParams.nazwa;
  const projectName = typeof nazwaRaw === "string" && nazwaRaw.trim().length > 0 ? nazwaRaw : null;
  const mapHref = buildMapHref(locale, projectName);

  const krajRaw = rawSearchParams.kraj;
  const krajCode = typeof krajRaw === "string" ? krajRaw : null;

  const [countries, entries] = await Promise.all([getCountries(), getExportReadiness()]);
  const entry = krajCode ? entries.find((candidate) => candidate.countryCode === krajCode) : undefined;

  // Brak/nieznany/niewarunkowy kraj → łagodny redirect na mapę (spec 0010, AC-3).
  if (!entry || entry.status !== "conditional") {
    redirect(mapHref);
  }

  const countryName = countries.find((country) => country.code === entry.countryCode)?.name ?? entry.countryCode;

  return (
    <GapClosureView
      countryCode={entry.countryCode}
      countryName={countryName}
      projectName={projectName}
      mapHref={mapHref}
    />
  );
}
