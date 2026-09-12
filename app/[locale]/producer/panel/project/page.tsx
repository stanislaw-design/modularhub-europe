import { ProjectWizard } from "@/components/producent/ProjectWizard";
import { getCountries } from "@/lib/data/countries";
import { requirePanelProducerSession } from "@/lib/panel-session";

// Kreator nowego produktu na sesji producenta (spec 0032 AC-4, AC-9): jedyna
// bramka to sesja, żadnych parametrów NIP/rejestracji z URL jak w dawnym
// mocku (spec 0016).
export default async function ProducerPanelProjektPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/producer/panel/project`;
  await requirePanelProducerSession(locale, selfHref);
  const countries = await getCountries();

  return <ProjectWizard locale={locale} countries={countries} />;
}
