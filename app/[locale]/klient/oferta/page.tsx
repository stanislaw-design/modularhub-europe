import { redirect } from "next/navigation";
import { BindingOfferView } from "@/components/klient/BindingOfferView";
import { getProjectById } from "@/lib/data/projects";

export default async function OfertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);

  const projectId = typeof rawSearchParams.project === "string" ? rawSearchParams.project : undefined;
  if (!projectId) {
    redirect(`/${locale}/klient/wyniki`);
  }

  const project = await getProjectById(projectId);
  if (!project) {
    redirect(`/${locale}/klient/wyniki`);
  }

  // Address is a snapshot passed by the plot dossier panel (spec 0006 AC-4,
  // AC-6); missing it means this wasn't reached through that flow, so send
  // the client back to re-run it for this project.
  const address = typeof rawSearchParams.address === "string" ? rawSearchParams.address.trim() : "";
  if (!address) {
    redirect(`/${locale}/klient/dzialka?projects=${projectId}`);
  }

  return <BindingOfferView locale={locale} project={project} address={address} />;
}
