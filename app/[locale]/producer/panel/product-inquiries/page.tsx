import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, Heading, Stack, Text } from "@/components/ui";
import { getProducerIdForUser, getProductInquiriesForProducer } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Zapytania o konkretne produkty producenta (spec 0070 AC-21): ten sam termin, ta sama
// bramka publikacji i ten sam wybór klienta co przy tablicy, ale odbiorcą jest producent
// produktu, bez reguły dopasowania i bez wymogu weryfikacji wolumenowej (spec 0037).
// Lista nigdy nie wybiera kolumn kontaktowych (AC-22).
export default async function ProducerProductInquiriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const selfHref = `/${locale}/producer/panel/product-inquiries`;
  const [session, t, tDetail] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerProductInquiriesPage"),
    getTranslations("ProducerBoardDetailPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const items = producerId ? await getProductInquiriesForProducer(producerId) : [];

  const ownQuoteLabel: Record<string, string> = {
    active: tDetail("ownQuoteStatusActive"),
    accepted: tDetail("ownQuoteStatusAccepted"),
    rejected: tDetail("ownQuoteStatusRejected"),
    superseded: tDetail("ownQuoteStatusSuperseded"),
  };

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
          <table className="w-full min-w-[36rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnProduct")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnCountry")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnUnits")}
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
                      href={`${selfHref}/${row.id}`}
                      className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline after:absolute after:inset-0 after:content-['']"
                    >
                      {row.productName}
                    </Link>
                  </td>
                  <Text as="td" className="p-brand-2">
                    {row.countryName}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {row.unitCount}
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
    </Stack>
  );
}
