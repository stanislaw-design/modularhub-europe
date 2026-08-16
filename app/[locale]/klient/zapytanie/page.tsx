import { redirect } from "next/navigation";
import { InquiryFlow } from "@/components/klient/InquiryFlow";
import type { Project } from "@/lib/data/types";
import { getProjectById, getProjects } from "@/lib/data/projects";
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
  return `/${locale}/klient/wyniki${query ? `?${query}` : ""}`;
}

function buildDzialkaHref(
  locale: string,
  projectIds: string[],
  searchParams: { [key: string]: string | string[] | undefined }
): string {
  const params = new URLSearchParams({ projects: projectIds.join(",") });
  for (const key of ["country", "sizeMin", "sizeMax"] as const) {
    const value = searchParams[key];
    if (typeof value === "string") params.set(key, value);
  }
  return `/${locale}/klient/dzialka?${params.toString()}`;
}

export default async function ZapytaniePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const resultsHref = buildResultsHref(locale, rawSearchParams);

  const allProjects = await getProjects();
  const knownIds = new Set(allProjects.map((project) => project.id));
  const projectIds = parseInquiryProjectIds(rawSearchParams.projects, knownIds);

  if (projectIds === null) {
    redirect(resultsHref);
  }

  const selectedProjects = (await Promise.all(projectIds.map(getProjectById))).filter(
    (project): project is Project => project !== null
  );
  const dzialkaHref = buildDzialkaHref(locale, projectIds, rawSearchParams);

  return <InquiryFlow projects={selectedProjects} resultsHref={resultsHref} dzialkaHref={dzialkaHref} />;
}
