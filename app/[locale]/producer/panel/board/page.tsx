import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BoardFilters } from "@/components/producent/BoardFilters";
import { Card, Heading, Stack, TAG_TONES, TagPill, Text } from "@/components/ui";
import {
  getAllCountries,
  getOpenProjectRequestsForBoard,
  getProducerIdForUser,
  getProducerVolumeVerificationStatus,
  PROJECT_REQUESTS_BOARD_PAGE_SIZE,
  type ProjectRequestBoardFilters,
} from "@/lib/db/queries";
import { productFamilyEnum, projectTypeEnum } from "@/lib/db/schema";
import { requirePanelProducerSession } from "@/lib/panel-session";

const PROJECT_TYPES = projectTypeEnum.enumValues;
const FAMILIES = productFamilyEnum.enumValues;

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Tablica ogłoszeń B2B (spec 0070 AC-10, AC-22): producent widzi tylko zapytania
// dopasowane do niego regułą dopasowania, z terminem ofert i stanem własnej
// oferty, nigdy ze statusem zapytania. getOpenProjectRequestsForBoard nigdy nie
// wybiera kolumn kontaktowych (maskowanie na poziomie zapytania SQL), więc nic
// więcej do ukrycia tu w renderowaniu.
export default async function ProducerPanelBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; country?: string; type?: string; family?: string }>;
}) {
  const { locale } = await params;
  const { page: pageParam, country: countryParam, type: typeParam, family: familyParam } = await searchParams;
  const selfHref = `/${locale}/producer/panel/board`;
  const [session, t, tProjectRequest, tOptions, tDetail] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerPanelBoardPage"),
    getTranslations("ProjectRequestFlow"),
    getTranslations("ProjectOptions"),
    getTranslations("ProducerBoardDetailPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const volumeStatus = producerId ? await getProducerVolumeVerificationStatus(producerId) : null;

  if (!producerId || volumeStatus !== "approved") {
    return (
      <Stack gap={4}>
        <Heading level="h1">{t("heading")}</Heading>
        <Card as="div" padding="lg" className="flex flex-col items-center gap-brand-2 py-brand-5 text-center">
          <Heading level="h2">{t("notApprovedHeading")}</Heading>
          <Text tone="muted" measure className="mx-auto">
            {t("notApprovedDescription")}
          </Text>
          <Link href={`/${locale}/producer/panel/capacity`} className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline">
            {t("completeProfileLink")}
          </Link>
        </Card>
      </Stack>
    );
  }

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const countries = await getAllCountries();
  const filters: ProjectRequestBoardFilters = {
    countryCode: countries.find((c) => c.code === countryParam)?.code,
    projectType: PROJECT_TYPES.find((v) => v === typeParam),
    family: FAMILIES.find((v) => v === familyParam),
  };
  const hasFilters = Object.values(filters).some(Boolean);
  const { items, totalCount } = await getOpenProjectRequestsForBoard({ producerId, page, filters });
  const totalPages = Math.max(1, Math.ceil(totalCount / PROJECT_REQUESTS_BOARD_PAGE_SIZE));

  const ownQuoteLabel: Record<string, string> = {
    active: tDetail("ownQuoteStatusActive"),
    accepted: tDetail("ownQuoteStatusAccepted"),
    rejected: tDetail("ownQuoteStatusRejected"),
    superseded: tDetail("ownQuoteStatusSuperseded"),
  };
  const trustSignalLabel: Record<(typeof items)[number]["trustSignal"], string> = {
    new: t("trustSignalNew"),
    complete: t("trustSignalComplete"),
  };

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (filters.countryCode) params.set("country", filters.countryCode);
    if (filters.projectType) params.set("type", filters.projectType);
    if (filters.family) params.set("family", filters.family);
    params.set("page", String(targetPage));
    return `${selfHref}?${params.toString()}`;
  }

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">{t("intro")}</Text>
      </Stack>
      <BoardFilters
        countries={countries}
        projectTypes={[...PROJECT_TYPES]}
        families={[...FAMILIES]}
        labels={{
          projectType: Object.fromEntries(PROJECT_TYPES.map((v) => [v, tProjectRequest(`projectType.${v}`)])),
          family: Object.fromEntries(FAMILIES.map((v) => [v, tOptions(`family.${v}`)])),
        }}
      />
      {items.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">{hasFilters ? t("emptyFiltered") : t("emptyMessage")}</Text>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-data border border-brand-steel">
          <table className="w-full min-w-[42rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnCountry")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnProjectType")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnFamilies")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnUnits")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnFloorArea")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnDeadline")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnOwnQuote")}
                </Text>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="relative border-b border-brand-steel/50 align-top last:border-b-0 hover:bg-brand-steel/20">
                  <td className="p-brand-2">
                    <Link
                      href={`/${locale}/producer/panel/board/${row.id}`}
                      className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline after:absolute after:inset-0 after:content-['']"
                    >
                      {row.countryName}
                    </Link>
                    <Text as="span" tone="muted" variant="label" className="ml-2">
                      {trustSignalLabel[row.trustSignal]}
                    </Text>
                    {!row.deliversToCountry && (
                      <Text as="span" variant="label" className="mt-1 block text-status-conditional">
                        {t("notDeliveringNote")}{" "}
                        <Link
                          href={`/${locale}/producer/panel/capacity`}
                          className="focus-ring relative z-10 rounded-data font-medium text-brand-passage-blue hover:underline"
                        >
                          {t("notDeliveringLink")}
                        </Link>
                      </Text>
                    )}
                  </td>
                  <td className="p-brand-2">
                    <TagPill tone={TAG_TONES[PROJECT_TYPES.indexOf(row.projectType) % TAG_TONES.length]}>
                      {tProjectRequest(`projectType.${row.projectType}`)}
                    </TagPill>
                  </td>
                  <td className="p-brand-2">
                    <div className="flex flex-wrap gap-brand-1">
                      {row.families.map((family) => (
                        <TagPill key={family} tone={TAG_TONES[(TAG_TONES.length - 1 - FAMILIES.indexOf(family)) % TAG_TONES.length]}>
                          {tOptions(`family.${family}`)}
                        </TagPill>
                      ))}
                    </div>
                  </td>
                  <Text as="td" className="p-brand-2">
                    {row.unitCount}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {row.floorAreaM2Min ? `${row.floorAreaM2Min}${row.floorAreaM2Max ? `–${row.floorAreaM2Max}` : "+"}` : "—"}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {dateFormatter.format(row.deadlineAt)}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {row.ownQuoteStatus ? (ownQuoteLabel[row.ownQuoteStatus] ?? row.ownQuoteStatus) : t("ownQuoteNone")}
                  </Text>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <nav aria-label={t("paginationAriaLabel")} className="flex items-center gap-brand-3">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="focus-ring rounded-data text-brand-passage-blue underline">
              {t("previousPage")}
            </Link>
          ) : (
            <span className="text-brand-technical-graphite">{t("previousPage")}</span>
          )}
          <Text as="span" tone="muted">
            {t("pageLabel", { current: page, total: totalPages })}
          </Text>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="focus-ring rounded-data text-brand-passage-blue underline">
              {t("nextPage")}
            </Link>
          ) : (
            <span className="text-brand-technical-graphite">{t("nextPage")}</span>
          )}
        </nav>
      )}
    </Stack>
  );
}
