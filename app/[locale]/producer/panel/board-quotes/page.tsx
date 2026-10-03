import { getTranslations } from "next-intl/server";
import { Card, DataText, Heading, Stack, Text } from "@/components/ui";
import { getProducerIdForUser, getProjectQuotesForProducer, type ProjectQuoteForProducer } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Status własnych wycen producenta (spec 0062 AC-5, AC-7, AC-12, AC-15):
// obie ścieżki (tablica i modal bulk_product_inquiry), kontakt inwestora
// widoczny wyłącznie dla wiersza z contactRevealedAt ustawionym (maskowanie
// na poziomie zapytania SQL, getProjectQuotesForProducer). Nie wymaga
// volumeVerificationStatus = approved (AC-12): producent widzi swoje
// dawniejsze wyceny nawet po cofnięciu weryfikacji.
export default async function ProducerPanelBoardQuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/producer/panel/board-quotes`;
  const [session, t] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerPanelBoardQuotesPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const quotes = producerId ? await getProjectQuotesForProducer(producerId) : [];

  const statusLabel: Record<ProjectQuoteForProducer["status"], string> = {
    active: t("statusActive"),
    accepted: t("statusAccepted"),
    rejected: t("statusRejected"),
    superseded: t("statusSuperseded"),
  };
  const sourceLabel: Record<ProjectQuoteForProducer["source"], string> = {
    project_request: t("sourceProjectRequest"),
    bulk_product_inquiry: t("sourceBulkProductInquiry"),
  };

  return (
    <Stack gap={4}>
      <Heading level="h1">{t("heading")}</Heading>
      {quotes.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">{t("emptyMessage")}</Text>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-data border border-brand-steel">
          <table className="w-full min-w-[42rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnSource")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnPrice")}
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
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b border-brand-steel/50 align-top last:border-b-0">
                  <td className="p-brand-2">
                    <Text>{sourceLabel[quote.source]}</Text>
                    {quote.contactEmail && (
                      <Text tone="muted" variant="label" className="mt-1">
                        {t("contactRevealedLabel")}: {quote.contactName} · {quote.contactEmail}
                        {quote.contactPhone ? ` · ${quote.contactPhone}` : ""}
                      </Text>
                    )}
                  </td>
                  <Text as="td" className="p-brand-2">
                    <DataText>{priceFormatter.format(quote.totalPriceCents / 100)} €</DataText>
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {statusLabel[quote.status]}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {dateFormatter.format(quote.submittedAt)}
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
