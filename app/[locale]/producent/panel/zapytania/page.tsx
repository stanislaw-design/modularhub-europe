import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, Heading, Stack, Text } from "@/components/ui";
import {
  getInquiriesForProducer,
  getProducerIdForUser,
  getUnreadDecisionInquiryIds,
  type InquiryWithItems,
} from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Wyłącznie własne zapytania producenta (spec 0032 AC-8): getInquiriesForProducer
// filtruje po producer.id z sesji w samym zapytaniu SQL, więc nazwy cudzych
// produktów z tego samego zapytania nigdy tu nie docierają.
export default async function ProducerPanelZapytaniaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/producent/panel/zapytania`;
  const [session, t] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerPanelZapytaniaPage"),
  ]);

  const statusLabel: Record<InquiryWithItems["status"], string> = {
    open: t("statusOpen"),
    offered: t("statusOffered"),
    closed: t("statusClosed"),
  };

  const producerId = await getProducerIdForUser(session.user.id);
  const [inquiries, unreadDecisionIds] = producerId
    ? await Promise.all([getInquiriesForProducer(producerId), getUnreadDecisionInquiryIds(producerId)])
    : [[], new Set<string>()];

  return (
    <Stack gap={4}>
      <Heading level="h1">{t("heading")}</Heading>
      {inquiries.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">{t("emptyMessage")}</Text>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-data border border-brand-steel">
          <table className="w-full min-w-[36rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnProducts")}
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
              {inquiries.map((row) => (
                <tr key={row.id} className="border-b border-brand-steel/50 align-top last:border-b-0">
                  <td className="p-brand-2">
                    <Link href={`/${locale}/producent/panel/zapytania/${row.id}`} className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline">
                      {row.productNames.join(", ") || "—"}
                    </Link>
                    {unreadDecisionIds.has(row.id) && (
                      <span
                        className="ml-2 inline-block size-2 rounded-full bg-brand-passage-blue align-middle"
                        role="img"
                        aria-label={t("unreadDecisionLabel")}
                      />
                    )}
                  </td>
                  <Text as="td" className="p-brand-2">
                    {statusLabel[row.status]}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {dateFormatter.format(row.receivedAt)}
                  </Text>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
}
