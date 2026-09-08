import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { InquiryFlow } from "@/components/klient/InquiryFlow";
import type { CountryCode, Project } from "@/lib/data/types";
import { getCountries } from "@/lib/data/countries";
import { getProjectById, getProjects } from "@/lib/data/projects";
import type { Locale } from "@/lib/i18n/routing";
import { parseInquiryProjectIds } from "@/lib/inquiry";

const VALID_COUNTRY_CODES: readonly CountryCode[] = ["PL", "DE", "NL"];

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

// Zachowuje dokładnie ten sam URL (wliczając projects=), żeby po zalogowaniu
// klient wrócił na ten sam wybór produktów (spec 0023 AC-5).
function buildSelfHref(
  locale: string,
  searchParams: { [key: string]: string | string[] | undefined }
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  return `/${locale}/klient/zapytanie${query ? `?${query}` : ""}`;
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

  const session = await auth();
  if (!session) {
    const selfHref = buildSelfHref(locale, rawSearchParams);
    redirect(`/${locale}/logowanie?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role === "producer") {
    redirect(`/${locale}/producent`);
  }
  if (session.user.role === "admin") {
    redirect(`/${locale}/internal/zapytania`);
  }

  const [allProjects, countries] = await Promise.all([
    getProjects({ locale: locale as Locale }),
    getCountries(),
  ]);
  const knownIds = new Set(allProjects.map((project) => project.id));
  const projectIds = parseInquiryProjectIds(rawSearchParams.projects, knownIds);

  if (projectIds === null) {
    redirect(resultsHref);
  }

  const selectedProjects = (
    await Promise.all(projectIds.map((id) => getProjectById(id, locale as Locale)))
  ).filter((project): project is Project => project !== null);
  const dzialkaHref = buildDzialkaHref(locale, projectIds, rawSearchParams);

  const rawCountry = rawSearchParams.country;
  const initialCountryCode =
    typeof rawCountry === "string" && VALID_COUNTRY_CODES.includes(rawCountry as CountryCode)
      ? (rawCountry as CountryCode)
      : null;

  return (
    <InquiryFlow
      projects={selectedProjects}
      resultsHref={resultsHref}
      dzialkaHref={dzialkaHref}
      countries={countries}
      initialContact={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        phone: session.user.phone ?? "",
      }}
      initialCountryCode={initialCountryCode}
    />
  );
}
