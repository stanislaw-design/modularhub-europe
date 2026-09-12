import { redirect } from "next/navigation";
import { PlotDossierPanel } from "@/components/klient/PlotDossierPanel";
import type { Project } from "@/lib/data/types";
import { getProjectById, getPublishedProductIds } from "@/lib/data/projects";
import type { Locale } from "@/lib/i18n/routing";
import { parseInquiryProjectIds } from "@/lib/inquiry";

function buildResultsHref(
  locale: string,
  searchParams: { [key: string]: string | string[] | undefined }
): string {
  const params = new URLSearchParams();
  for (const key of ["country", "sizeMin", "sizeMax"] as const) {
    const value = searchParams[key];
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  return `/${locale}/results${query ? `?${query}` : ""}`;
}

export default async function DzialkaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const resultsHref = buildResultsHref(locale, rawSearchParams);

  const knownIds = await getPublishedProductIds();
  const projectIds = parseInquiryProjectIds(rawSearchParams.projects, knownIds);

  if (projectIds === null) {
    redirect(resultsHref);
  }

  const selectedProjects = (
    await Promise.all(projectIds.map((id) => getProjectById(id, locale as Locale)))
  ).filter((project): project is Project => project !== null);

  return <PlotDossierPanel locale={locale} projects={selectedProjects} resultsHref={resultsHref} />;
}
