import { getTranslations } from "next-intl/server";
import { InquiryAttachmentsPanel } from "@/components/inquiry-attachments/InquiryAttachmentsPanel";
import { getInquiryAttachmentLabels } from "@/components/inquiry-attachments/getInquiryAttachmentLabels";
import { CancelRequestButton } from "@/components/klient/CancelRequestButton";
import { PanelEmptyState } from "@/components/klient/PanelEmptyState";
import { ReopenRequestButton } from "@/components/klient/ReopenRequestButton";
import { QuoteComparisonTable } from "@/components/klient/QuoteComparisonTable";
import { RequestHeader } from "@/components/klient/RequestHeader";
import { Button, Heading, Stack, Text } from "@/components/ui";
import {
  getClientIdForUser,
  getProjectRequestsWithQuotesForClient,
  type ClientRequestWithQuotes,
} from "@/lib/db/queries";
import { listInquiryAttachments, type InquiryAttachmentItem } from "@/lib/inquiry-attachment-actions";
import type { Locale } from "@/lib/i18n/routing";
import { requirePanelClientSession } from "@/lib/panel-session";
import { BULK_REQUEST_EMAIL_LIMIT } from "@/lib/project-request-specs";

// Zamknięte zapytanie można wznowić przez 30 dni (spec 0070 AC-19), starszych nie pokazujemy.
const CLOSED_VISIBLE_DAYS = 30;
function closedVisibleCutoff(): number {
  return Date.now() - CLOSED_VISIBLE_DAYS * 24 * 60 * 60 * 1000;
}
// Powody zamknięcia, po których klient może wznowić zapytanie (zamknięte przez ModularHub nie).
const REOPENABLE_REASONS: (string | null)[] = ["client_cancelled", "no_offers", "expired"];
const ACTIVE_STATUSES:ClientRequestWithQuotes["status"][] = ["open", "quoted", "published"];
// "Teraz" dla blokady zmian plików; osobna funkcja tylko dla reguły react-hooks/purity.
const getNow = () => Date.now();

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
  const items = clientId ? await getProjectRequestsWithQuotesForClient(clientId, locale as Locale) : [];

  const closedCutoff = closedVisibleCutoff();
  const shown = items.filter((item) => item.status !== "closed" || (item.closedAt !== null && item.closedAt.getTime() >= closedCutoff));
  const current = shown.filter((item) => item.status !== "closed");
  const closed = shown.filter((item) => item.status === "closed");
  const activeCount = items.filter((item) => ACTIVE_STATUSES.includes(item.status)).length;
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  // Pliki zapytań (spec 0070 część D): lista i etykiety raz na stronę, nie w pętli kart.
  const attachmentLabels = await getInquiryAttachmentLabels(locale);
  const attachmentsByRequest = new Map<string, InquiryAttachmentItem[]>(
    await Promise.all(
      shown.map(async (item) => [
        item.id,
        await listInquiryAttachments(item.source === "project_request" ? "request" : "product", item.id),
      ] as const),
    ),
  );
  // Klient zmienia pliki tylko, dopóki zapytanie jest aktywne, bez wyboru oferty, przed
  // terminem i przed publikacją podsumowania (AC-28, AC-33).
  const nowMs = getNow();
  function canChangeFiles(item: ClientRequestWithQuotes): boolean {
    return (
      ACTIVE_STATUSES.includes(item.status) &&
      item.selectedQuoteId === null &&
      item.summaryPublishedAt === null &&
      item.deadlineAt.getTime() >= nowMs
    );
  }

  function renderCard(item: ClientRequestWithQuotes) {
    const kind = item.source === "project_request" ? "request" : "product";
    return (
      <Stack key={`${item.source}-${item.id}`} gap={2}>
        <div className="flex flex-wrap items-start justify-between gap-brand-3">
          <RequestHeader item={item} locale={locale} />
          {ACTIVE_STATUSES.includes(item.status) && <CancelRequestButton id={item.id} kind={kind} />}
          {item.status === "closed" && REOPENABLE_REASONS.includes(item.closedReason) && (
            <ReopenRequestButton id={item.id} kind={kind} />
          )}
        </div>
        {item.quotes.length === 0 ? (
          item.status !== "closed" && (
            <Text tone="muted" surface="v5">
              {t("noQuotesYet", { date: dateFormatter.format(item.deadlineAt) })}
            </Text>
          )
        ) : (
          <QuoteComparisonTable
            quotes={item.quotes}
            locale={locale}
            selectedQuoteId={item.selectedQuoteId}
            requestClosed={item.status === "closed"}
          />
        )}
        <InquiryAttachmentsPanel
          kind={kind}
          inquiryId={item.id}
          items={attachmentsByRequest.get(item.id) ?? []}
          viewer="client"
          labels={attachmentLabels}
          locale={locale}
          canChange={canChangeFiles(item)}
        />
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
