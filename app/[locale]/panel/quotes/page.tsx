import { getTranslations } from "next-intl/server";
import { AcceptQuoteButton } from "@/components/klient/AcceptQuoteButton";
import { DownloadQuotePdfButton } from "@/components/klient/DownloadQuotePdfButton";
import { PanelEmptyState } from "@/components/klient/PanelEmptyState";
import { DataText, Heading, Stack, Text } from "@/components/ui";
import { getClientIdForUser, getProjectRequestsWithQuotesForClient, type ClientReceivedQuote } from "@/lib/db/queries";
import { requirePanelClientSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Otrzymane wyceny klienta (spec 0062 AC-6): własne project_request i
// bulk_product_inquiry, każde z listą otrzymanych wycen (producer imienny,
// bo tożsamość producenta jest już publiczna). Przycisk Akceptuj woła bez
// zmian istniejące acceptProjectQuote; gdy b2bVerificationStatus klienta nie
// jest zatwierdzone, przycisk pozostaje klikalny i pokazuje komunikat błędu
// w miejscu (AcceptQuoteButton), nigdy fałszywy sukces.
export default async function ClientPanelQuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/panel/quotes`;
  const [session, t] = await Promise.all([
    requirePanelClientSession(locale, selfHref),
    getTranslations("ClientPanelQuotesPage"),
  ]);

  const clientId = await getClientIdForUser(session.user.id);
  const items = clientId ? await getProjectRequestsWithQuotesForClient(clientId) : [];

  const statusLabel: Record<ClientReceivedQuote["status"], string> = {
    active: t("statusActive"),
    accepted: t("statusAccepted"),
    rejected: t("statusRejected"),
    superseded: t("statusSuperseded"),
  };

  const itemsWithQuotes = items.filter((item) => item.quotes.length > 0);

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading")}
      </Heading>
      {itemsWithQuotes.length === 0 ? (
        <PanelEmptyState locale={locale} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Stack gap={4}>
          {itemsWithQuotes.map((item) => (
            <Stack key={item.id} gap={2}>
              <Text className="font-medium" surface="v5">
                {item.source === "project_request" ? t("requestHeading") : `${t("bulkInquiryHeadingPrefix")}${item.productName}`}
              </Text>
              <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
                <table className="w-full min-w-[42rem] border-collapse text-body">
                  <thead>
                    <tr className="border-b border-brand-v5-line bg-brand-v5-line/10 text-left">
                      <Text as="th" surface="v5" className="p-brand-2 font-medium">
                        {t("producerColumn")}
                      </Text>
                      <Text as="th" surface="v5" className="p-brand-2 font-medium">
                        {t("priceColumn")}
                      </Text>
                      <Text as="th" surface="v5" className="p-brand-2 font-medium">
                        {t("leadTimeColumn")}
                      </Text>
                      <Text as="th" surface="v5" className="p-brand-2 font-medium">
                        {t("statusColumn")}
                      </Text>
                      <Text as="th" surface="v5" className="p-brand-2 font-medium">
                        {t("notesColumn")}
                      </Text>
                      <th className="p-brand-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {item.quotes.map((quote) => (
                      <tr key={quote.id} className="border-b border-brand-v5-line/50 align-top last:border-b-0">
                        <td className="p-brand-2">
                          <Text surface="v5">{quote.producerName}</Text>
                          <Text tone="muted" surface="v5" variant="label">
                            {dateFormatter.format(quote.submittedAt)}
                          </Text>
                        </td>
                        <Text as="td" surface="v5" className="p-brand-2">
                          <DataText>{priceFormatter.format(quote.totalPriceCents / 100)} €</DataText>
                        </Text>
                        <Text as="td" surface="v5" className="p-brand-2">
                          {quote.proposedLeadTimeWeeks ? t("leadTimeWeeks", { weeks: quote.proposedLeadTimeWeeks }) : "—"}
                        </Text>
                        <Text as="td" surface="v5" className="p-brand-2">
                          {statusLabel[quote.status]}
                        </Text>
                        <Text as="td" surface="v5" className="p-brand-2" measure>
                          {quote.notes ?? "—"}
                        </Text>
                        <td className="p-brand-2 text-right">
                          <div className="flex flex-col items-end gap-2">
                            {quote.status === "active" && <AcceptQuoteButton quoteId={quote.id} />}
                            {quote.hasPdf && <DownloadQuotePdfButton quoteId={quote.id} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
