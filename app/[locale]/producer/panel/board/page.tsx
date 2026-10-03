import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, Heading, Stack, Text } from "@/components/ui";
import {
  getOpenProjectRequestsForBoard,
  getProducerIdForUser,
  getProducerVolumeVerificationStatus,
  PROJECT_REQUESTS_BOARD_PAGE_SIZE,
  type ProjectRequestBoardItem,
} from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Tablica ogłoszeń B2B (spec 0062 AC-2, AC-3): otwarta pull, widoczna dla
// każdego zweryfikowanego wolumenowo producenta, nie tylko dopasowanych po
// kraju dostawy. getOpenProjectRequestsForBoard nigdy nie wybiera kolumn
// kontaktowych (maskowanie na poziomie zapytania SQL), więc nic więcej do
// ukrycia tu w renderowaniu.
export default async function ProducerPanelBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const selfHref = `/${locale}/producer/panel/board`;
  const [session, t, tProjectRequest, tOptions] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerPanelBoardPage"),
    getTranslations("ProjectRequestFlow"),
    getTranslations("ProjectOptions"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const volumeStatus = producerId ? await getProducerVolumeVerificationStatus(producerId) : null;

  if (volumeStatus !== "approved") {
    return (
      <Stack gap={4}>
        <Heading level="h1">{t("heading")}</Heading>
        <Card as="div" padding="lg" className="flex flex-col items-center gap-brand-2 py-brand-5 text-center">
          <Heading level="h2">{t("notApprovedHeading")}</Heading>
          <Text tone="muted" measure className="mx-auto">
            {t("notApprovedDescription")}
          </Text>
          <Link href={`/${locale}/producer/panel`} className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline">
            {t("completeProfileLink")}
          </Link>
        </Card>
      </Stack>
    );
  }

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { items, totalCount } = await getOpenProjectRequestsForBoard({ page });
  const totalPages = Math.max(1, Math.ceil(totalCount / PROJECT_REQUESTS_BOARD_PAGE_SIZE));

  const statusLabel: Record<ProjectRequestBoardItem["status"], string> = {
    open: t("statusOpen"),
    quoted: t("statusQuoted"),
  };
  const trustSignalLabel: Record<ProjectRequestBoardItem["trustSignal"], string> = {
    new: t("trustSignalNew"),
    complete: t("trustSignalComplete"),
  };

  function pageHref(targetPage: number): string {
    return `${selfHref}?page=${targetPage}`;
  }

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">{t("intro")}</Text>
      </Stack>
      {items.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">{t("emptyMessage")}</Text>
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
                  {t("columnStatus")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnDate")}
                </Text>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-brand-steel/50 align-top last:border-b-0">
                  <td className="p-brand-2">
                    <Link
                      href={`/${locale}/producer/panel/board/${row.id}`}
                      className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline"
                    >
                      {row.countryName}
                    </Link>
                    <Text as="span" tone="muted" variant="label" className="ml-2">
                      {trustSignalLabel[row.trustSignal]}
                    </Text>
                  </td>
                  <Text as="td" className="p-brand-2">
                    {tProjectRequest(`projectType.${row.projectType}`)}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {row.families.map((family) => tOptions(`family.${family}`)).join(", ")}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {row.unitCountMin}
                    {row.unitCountMax ? `–${row.unitCountMax}` : "+"}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {row.floorAreaM2Min ? `${row.floorAreaM2Min}${row.floorAreaM2Max ? `–${row.floorAreaM2Max}` : "+"}` : "—"}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {statusLabel[row.status]}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {dateFormatter.format(row.createdAt)}
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
