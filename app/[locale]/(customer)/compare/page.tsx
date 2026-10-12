import { redirect } from "next/navigation";
import { ProjectCompareTable, type CompareTableColumn } from "@/components/klient/ProjectCompareTable";
import { SaunaCompareTable, type SaunaCompareColumn } from "@/components/klient/SaunaCompareTable";
import { getProjectById, getPublishedProductIds } from "@/lib/data/projects";
import type { CompletionStandard } from "@/lib/data/types";
import { parseCompareProjectIds } from "@/lib/compare";
import { getCompareListPath, isEligibleForCompareKind, parseCompareKind } from "@/lib/compare-rows";
import type { Locale } from "@/lib/i18n/routing";

type PageSearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Klon dzisiejszego search params z jedną nadpisaną wartością (ten sam wzorzec
// co app/[locale]/(customer)/project/[id]/page.tsx): każdy przełącznik
// wariantu zachowuje wybory pozostałych kolumn i resztę parametrów (np.
// country), bo idzie przez zwykłą nawigację <Link>, nie stan klienta
// (spec 0044 AC-6, zgodnie z regułą AGENTS.md o stanie w URL).
function buildQueryHref(searchParams: PageSearchParams, overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const resolved = firstParam(value);
    if (resolved) params.set(key, resolved);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  // Spec 0068 AC-13: bez `kind` (albo z nieznanym) to dzisiejsze porównanie domów.
  const kind = parseCompareKind(rawSearchParams.kind);
  const resultsHref = getCompareListPath(kind, locale);

  const ids = parseCompareProjectIds(rawSearchParams.products);
  if (ids === null) {
    redirect(resultsHref);
  }

  const [publishedIds, resolvedProjects] = await Promise.all([
    getPublishedProductIds(),
    Promise.all(ids.map((id) => getProjectById(id, locale as Locale))),
  ]);

  if (kind === "sauna") {
    // Spec 0068 AC-14: ta sama zasada "niedostępne", ale warunek to
    // spa-modulowe + sauna, więc jacuzzi nie dziedziczy tabeli saun.
    const saunaColumns: SaunaCompareColumn[] = ids.map((id, index) => {
      const project = resolvedProjects[index];
      const eligible = project !== null && isEligibleForCompareKind("sauna", project) && publishedIds.has(id);
      return { id, project: eligible ? project : null };
    });
    const saunaAvailableCount = saunaColumns.filter((column) => column.project !== null).length;
    if (saunaAvailableCount === 0) {
      redirect(resultsHref);
    }
    return (
      <SaunaCompareTable
        locale={locale}
        columns={saunaColumns}
        hasUnavailable={saunaAvailableCount < saunaColumns.length}
        listHref={resultsHref}
      />
    );
  }

  // Produkt usunięty, nieopublikowany albo spoza rodziny "dom" nie renderuje
  // się jako dostępna oferta (spec 0044 AC-10) — kolumna zostaje, ale bez
  // danych, żeby widok jasno pokazał "część pozycji niedostępna" zamiast po
  // cichu zredukować porównanie albo przekierować od razu.
  const columns: CompareTableColumn[] = ids.map((id, index) => {
    const project = resolvedProjects[index];
    const eligible = project !== null && isEligibleForCompareKind("dom", project) && publishedIds.has(id);
    if (!eligible || project === null) {
      return { id, project: null, selectedVariant: undefined, variantLinks: [] };
    }

    const requestedStandard = firstParam(rawSearchParams[`v_${id}`]);
    const selectedVariant =
      project.variants.find((variant) => variant.completionStandard === requestedStandard) ??
      project.variants.find((variant) => variant.isDefault) ??
      project.variants[0];

    const variantLinks =
      project.variants.length > 1
        ? project.variants.map((variant) => ({
            standard: variant.completionStandard as CompletionStandard,
            href: `/${locale}/compare${buildQueryHref(rawSearchParams, { [`v_${id}`]: variant.completionStandard })}`,
            isSelected: variant.id === selectedVariant?.id,
          }))
        : [];

    return { id, project, selectedVariant, variantLinks };
  });

  const availableCount = columns.filter((column) => column.project !== null).length;
  if (availableCount === 0) {
    redirect(resultsHref);
  }

  return (
    <ProjectCompareTable
      locale={locale}
      columns={columns}
      hasUnavailable={availableCount < columns.length}
      resultsHref={resultsHref}
    />
  );
}
