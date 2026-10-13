import { getTranslations } from "next-intl/server";
import { AcceptQuoteButton } from "@/components/klient/AcceptQuoteButton";
import { CancelRequestButton } from "@/components/klient/CancelRequestButton";
import { DownloadQuotePdfButton } from "@/components/klient/DownloadQuotePdfButton";
import { PanelEmptyState } from "@/components/klient/PanelEmptyState";
import { RequestHeader } from "@/components/klient/RequestHeader";
import { Button, DataText, Heading, Stack, Text } from "@/components/ui";
import {
  getClientIdForUser,
  getProjectRequestsWithQuotesForClient,
  type ClientReceivedQuote,
  type ClientRequestWithQuotes,
} from "@/lib/db/queries";
import { requirePanelClientSession } from "@/lib/panel-session";
import { BULK_REQUEST_EMAIL_LIMIT } from "@/lib/project-request-specs";

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Zamknięte zapytanie można wznowić przez 30 dni (spec 0070 AC-19), starszych nie pokazujemy.
const CLOSED_VISIBLE_DAYS = 30;
function closedVisibleCutoff(): number {
  return Date.now() - CLOSED_VISIBLE_DAYS * 24 * 60 * 60 * 1000;
}
const ACTIVE_STATUSES: ClientRequestWithQuotes["status"][] = ["open", "quoted", "published"];

// Duże zamówienia klienta (spec 0062 AC-6, rozszerzone w 0070 AC-40 do AC-42): wszystkie
// własne project_request i bulk_product_inquiry, także bez ofert i zamknięte z ostatnich
// 30 dni, każde z czytelnym nagłówkiem, przyciskiem zamknięcia i listą otrzymanych wycen.
// Zwykłe zapytania (tabela inquiry) i sprawy doradcze są na /panel/inquiries i nie
// mieszają się z tą listą ani z limitem trzech zapytań.
export default async function ClientPanelQuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/panel/quotes`;
  const [session, t] = await Promise.all([
    requirePanelClientSession(locale, selfHref),
    getTranslations({ locale, namespace: "ClientPanelQuotesPage" }),
  ]);

  const clientId = await getClientIdForUser(session.user.id);
  const items = clientId ? await getProjectRequestsWithQuotesForClient(clientId) : [];

  const statusLabel: Record<ClientReceivedQuote["status"], string> = {
    active: t("statusActive"),
    accepted: t("statusAccepted"),
    rejected: t("statusRejected"),
    superseded: t("statusSuperseded"),
  };

  const closedCutoff = closedVisibleCutoff();
  const shown = items.filter((item) => item.status !== "closed" || (item.closedAt !== null && item.closedAt.getTime() >= closedCutoff));
  const current = shown.filter((item) => item.status !== "closed");
  const closed = shown.filter((item) => item.status === "closed");
  const activeCount = items.filter((item) => ACTIVE_STATUSES.includes(item.status)).length;
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function renderCard(item: ClientRequestWithQuotes) {
    const kind = item.source === "project_request" ? "request" : "product";
    return (
      <Stack key={`${item.source}-${item.id}`} gap={2}>
        <div className="flex flex-wrap items-start justify-between gap-brand-3">
          <RequestHeader item={item} locale={locale} />
          {ACTIVE_STATUSES.includes(item.status) && <CancelRequestButton id={item.id} kind={kind} />}
        </div>
        {item.quotes.length === 0 ? (
          item.status !== "closed" && (
            <Text tone="muted" surface="v5">
              {t("noQuotesYet", { date: dateFormatter.format(item.deadlineAt) })}
            </Text>
          )
        ) : (
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
        )}
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <div className="flex flex-wrap items-center justify-between gap-brand-3">
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Button as="a" href={`/${locale}/project-request`} surface="v5">
          {t("addRequest")}
        </Button>
      </div>
      {shown.length === 0 ? (
        <PanelEmptyState locale={locale} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Stack gap={4}>
          <div>
            <Text surface="v5" className="font-medium">
              {t("activeCounter", { count: activeCount, max: BULK_REQUEST_EMAIL_LIMIT })}
            </Text>
            {activeCount >= BULK_REQUEST_EMAIL_LIMIT && (
              <Text surface="v5" tone="muted">
                {t("limitHint")}
              </Text>
            )}
          </div>
          {current.map(renderCard)}
          {closed.length > 0 && (
            <Stack gap={4}>
              <Heading level="h2" surface="v5">
                {t("closedGroupHeading")}
              </Heading>
              {closed.map(renderCard)}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
