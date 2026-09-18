import { DemoScreenNotice } from "@/components/producent/DemoScreenNotice";
import { ExportReadinessMap } from "@/components/producent/ExportReadinessMap";
import { Stack } from "@/components/ui";
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

  // Ekran wersji demonstracyjnej (spec 0032 AC-11): "Zobacz produkty" wraca
  // teraz do realnego katalogu w panelu, nie do dawnego mocka NIP (spec 0016,
  // usunięty w tym samym buildzie).
  const catalogHref = `/${locale}/producer/panel/products`;

  const [countries, entries] = await Promise.all([getCountries(), getExportReadiness()]);

  return (
    <Stack gap={4}>
      <DemoScreenNotice />
      <ExportReadinessMap
        locale={locale}
        projectName={nazwa}
        countries={countries}
        entries={entries}
        catalogHref={catalogHref}
      />
    </Stack>
  );
}
