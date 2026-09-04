import { redirect } from "next/navigation";
import { ProducerOfferForm } from "@/components/producent/ProducerOfferForm";
import { getCountries } from "@/lib/data/countries";
import { getProducerInquiryById } from "@/lib/data/producer-inquiries";
import { getProjectById } from "@/lib/data/producer-mock-projects";

export default async function ProducerOfertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const listHref = `/${locale}/producent/zapytania`;

  const inquiryId = typeof rawSearchParams.zapytanie === "string" ? rawSearchParams.zapytanie : undefined;
  if (!inquiryId) {
    redirect(listHref);
  }

  const inquiry = await getProducerInquiryById(inquiryId);
  if (!inquiry) {
    redirect(listHref);
  }

  const [project, countries] = await Promise.all([getProjectById(inquiry.projectId), getCountries()]);
  if (!project) {
    redirect(listHref);
  }

  const countryName =
    countries.find((country) => country.code === inquiry.deliveryCountry)?.name ?? inquiry.deliveryCountry;

  return <ProducerOfferForm inquiry={inquiry} project={project} countryName={countryName} listHref={listHref} />;
}
