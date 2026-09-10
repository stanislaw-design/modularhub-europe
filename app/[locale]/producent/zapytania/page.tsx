import { DemoScreenNotice } from "@/components/producent/DemoScreenNotice";
import { ProducerInquiryList } from "@/components/producent/ProducerInquiryList";
import { Stack } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getProducerInquiries } from "@/lib/data/producer-inquiries";
import { getProjects } from "@/lib/data/producer-mock-projects";

// Ekran demonstracyjny formularza oferty (spec 0032 AC-11), odróżniony nazwą
// ("Zapytania i oferty") i funkcją (formularz oferty na danych przykładowych)
// od realnego /producent/panel/zapytania (tylko odczyt, własne dane producenta).
export default async function ProducerZapytaniaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [inquiries, projects, countries] = await Promise.all([
    getProducerInquiries(),
    getProjects(),
    getCountries(),
  ]);

  return (
    <Stack gap={4}>
      <DemoScreenNotice />
      <ProducerInquiryList locale={locale} inquiries={inquiries} projects={projects} countries={countries} />
    </Stack>
  );
}
