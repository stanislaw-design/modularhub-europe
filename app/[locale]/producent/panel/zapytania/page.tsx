import { getTranslations } from "next-intl/server";
import { Card, Heading, Stack, Text } from "@/components/ui";
import { getInquiriesForProducer, getProducerIdForUser, type InquiryWithItems } from "@/lib/db/queries";
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
  const inquiries = producerId ? await getInquiriesForProducer(producerId) : [];

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
                  <Text as="td" className="p-brand-2">
                    {row.productNames.join(", ") || "—"}
                  </Text>
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
