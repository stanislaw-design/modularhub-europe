import { ProducerInquiryList } from "@/components/producent/ProducerInquiryList";
import { getCountries } from "@/lib/data/countries";
import { getProducerInquiries } from "@/lib/data/producer-inquiries";
import { getProjects } from "@/lib/data/producer-mock-projects";

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

  return <ProducerInquiryList locale={locale} inquiries={inquiries} projects={projects} countries={countries} />;
}
