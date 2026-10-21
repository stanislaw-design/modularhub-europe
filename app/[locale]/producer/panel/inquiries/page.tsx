import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button, Card, Heading, Stack, Text } from "@/components/ui";
import { getProducerIdForUser } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";
import { ageInDays } from "@/lib/age-in-days";
import {
  getMergedInquiriesForProducer,
  INQUIRY_LIST_STATUSES,
  parseInquiryListFilter,
  type InquiryListFilter,
  type InquiryListStatus,
  type MergedInquiryRow,
} from "@/lib/producer-inquiry-list";

const FILTER_KEY: Record<InquiryListFilter, string> = {
  "needs-offer": "filterNeedsOffer",
  decision: "filterDecision",
  offered: "filterOffered",
  closed: "filterClosed",
  all: "filterAll",
};

const STATUS_KEY: Record<InquiryListStatus, string> = {
  "needs-offer": "statusNeedsOffer",
  decision: "statusDecision",
  offered: "statusOffered",
  closed: "statusClosed",
};

// Jedna lista dwóch źródeł zapytań (spec 0074 AC-7): zapytania z listy porównań
// (`inquiry`, legacy_direct, spec 0032) i zapytania o produkt (`bulk_product_inquiry`,
// spec 0070). Wszystko ograniczone do producerId z sesji, bez danych kontaktowych klienta.
export default async function ProducerPanelZapytaniaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const panelHref = `/${locale}/producer/panel`;
  const selfHref = `${panelHref}/inquiries`;
  const [session, t] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerPanelZapytaniaPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const rows: MergedInquiryRow[] = producerId ? await getMergedInquiriesForProducer(producerId, panelHref) : [];

  const counts: Record<InquiryListFilter, number> = {
    "needs-offer": 0,
    decision: 0,
    offered: 0,
    closed: 0,
    all: rows.length,
  };
  for (const row of rows) counts[row.status] += 1;

  // Domyślnie "Wymaga oferty", a gdy nic tam nie ma, wszystkie.
  const requested = parseInquiryListFilter(query.status);
  const filter: InquiryListFilter = requested ?? (counts["needs-offer"] > 0 ? "needs-offer" : "all");
  const visible = filter === "all" ? rows : rows.filter((row) => row.status === filter);

  const ageLabel = (createdAt: Date) => {
    const days = ageInDays(createdAt);
    return days <= 0 ? t("ageToday") : t("ageDays", { days });
  };

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">{t("intro")}</Text>
      </Stack>

      <nav aria-label={t("filtersAriaLabel")}>
        <ul className="flex flex-wrap gap-brand-2">
          {([...INQUIRY_LIST_STATUSES, "all"] as const).map((key) => {
            const active = key === filter;
            return (
              <li key={key}>
                <Link
                  href={`${selfHref}?status=${key}`}
                  aria-current={active ? "true" : undefined}
                  className={`focus-ring inline-flex min-h-11 items-center gap-brand-1 rounded-marketing border px-brand-3 text-body ${
                    active
                      ? "border-brand-passage-blue bg-brand-passage-blue text-brand-action-foreground"
                      : "border-brand-steel bg-brand-warm-white text-brand-foundation-navy hover:bg-brand-steel/30"
                  }`}
                >
                  {t(FILTER_KEY[key])}
                  <span className="tabular-nums">{counts[key]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">{rows.length === 0 ? t("emptyMessage") : t("emptyFiltered")}</Text>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-data border border-brand-steel">
          <table className="w-full min-w-[44rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
                {(["columnProduct", "columnSource", "columnCountry", "columnStatus", "columnAge", "columnAction"] as const).map(
                  (column) => (
                    <Text key={column} as="th" className="p-brand-2 font-medium">
                      {t(column)}
                    </Text>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.source}-${row.id}`} className="border-b border-brand-steel/50 align-middle last:border-b-0">
                  <td className="p-brand-2">
                    <Link href={row.href} className="focus-ring inline-flex min-h-11 items-center rounded-data font-medium text-brand-passage-blue hover:underline">
                      {row.title || "—"}
                    </Link>
                    {row.unreadDecision && (
                      <span
                        className="ml-2 inline-block size-2 rounded-full bg-brand-passage-blue align-middle"
                        role="img"
                        aria-label={t("unreadDecisionLabel")}
                      />
                    )}
                  </td>
                  <Text as="td" className="p-brand-2">
                    {row.source === "shortlist" ? t("sourceShortlist") : t("sourceProduct")}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {row.countryName}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {t(STATUS_KEY[row.status])}
                  </Text>
                  <Text as="td" className="p-brand-2 tabular-nums">
                    {ageLabel(row.createdAt)}
                  </Text>
                  <td className="p-brand-2">
                    <Button as="a" href={row.href} variant="secondary" size="md">
                      {t("open")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
}
