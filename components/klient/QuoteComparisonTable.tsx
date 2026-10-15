import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Heading, Text } from "@/components/ui";
import type { ClientReceivedQuote } from "@/lib/db/queries";
import { QUOTE_LOGISTICS_ITEMS } from "@/lib/project-quote-specs";
import { DownloadQuotePdfButton } from "./DownloadQuotePdfButton";
import { SelectQuoteButton } from "./SelectQuoteButton";

interface QuoteComparisonTableProps {
  quotes: ClientReceivedQuote[];
  locale: string;
  // Wybór klienta zapisany na zapytaniu (spec 0070 AC-16), null gdy jeszcze nie wybrał.
  selectedQuoteId: string | null;
  // Zapytanie zamknięte: oferty zostają do wglądu, ale nie można już wybierać.
  requestClosed: boolean;
}

// Spec 0070 AC-15: tabela porównawcza ofert generowana z pól oferty. Kolumny to producenci,
// wiersze to pola wspólnego formatu (AC-11). Wartość, której oferta nie podała, jest
// pokazana jako "brak danych" albo "do wyceny", nigdy jako zero. Nie ma tu e maila, telefonu
// ani adresu strony producenta (kontakt dostaje producent dopiero po połączeniu stron, a
// klient kontaktu producenta nie widzi w polach systemu). Dla zapytania o produkt jest jedna
// kolumna. Pliki PDF ofert są pod tabelą jako załączniki (podpisane linki przy kliknięciu).
export function QuoteComparisonTable({ quotes, locale, selectedQuoteId, requestClosed }: QuoteComparisonTableProps) {
  const t = useTranslations("QuoteComparisonTable");
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  const noData = <span className="text-brand-v5-muted">{t("noData")}</span>;
  const toBeQuoted = <span className="text-brand-v5-muted">{t("toBeQuoted")}</span>;

  function formatDate(value: string): string {
    return dateFormatter.format(new Date(`${value}T00:00:00Z`));
  }

  function textOrNoData(value: string | null): ReactNode {
    return value && value.trim() !== "" ? <span className="whitespace-pre-line">{value}</span> : noData;
  }

  function logisticsCell(quote: ClientReceivedQuote, item: (typeof QUOTE_LOGISTICS_ITEMS)[number]): ReactNode {
    const entry = quote.logistics[item];
    if (!entry) return noData;
    if (entry.mode === "tbd") return toBeQuoted;
    const amount =
      entry.mode === "range"
        ? t("range", { from: money.format(entry.amountCents / 100), to: money.format(entry.maxAmountCents / 100) })
        : money.format(entry.amountCents / 100);
    return entry.note ? (
      <>
        {amount}
        <br />
        <span className="text-brand-v5-muted">{entry.note}</span>
      </>
    ) : (
      amount
    );
  }

  function deliveryWindowCell(quote: ClientReceivedQuote): ReactNode {
    const { deliveryWindowFrom: from, deliveryWindowTo: to } = quote;
    if (from && to) return t("deliveryWindowRange", { from: formatDate(from), to: formatDate(to) });
    if (from) return t("deliveryWindowFrom", { from: formatDate(from) });
    if (to) return t("deliveryWindowTo", { to: formatDate(to) });
    return noData;
  }

  const statusLabel: Record<ClientReceivedQuote["status"], string> = {
    active: t("statusActive"),
    accepted: t("statusAccepted"),
    rejected: t("statusRejected"),
    superseded: t("statusSuperseded"),
  };

  const rows: { key: string; label: string; cell: (quote: ClientReceivedQuote) => ReactNode }[] = [
    {
      key: "price",
      label: t("rowPrice"),
      cell: (quote) => (
        <>
          <span className="font-medium">{money.format(quote.totalPriceCents / 100)}</span>
          <br />
          <span className="text-brand-v5-muted">
            {quote.priceTaxMode === "gross"
              ? quote.vatRatePercent === null
                ? t("priceGross")
                : t("priceGrossVat", { rate: quote.vatRatePercent })
              : quote.vatRatePercent === null
                ? t("priceNet")
                : t("priceNetVat", { rate: quote.vatRatePercent })}
          </span>
        </>
      ),
    },
    { key: "unitPrice", label: t("rowUnitPrice"), cell: (quote) => (quote.unitPriceCents ? money.format(quote.unitPriceCents / 100) : noData) },
    { key: "scopeIncluded", label: t("rowScopeIncluded"), cell: (quote) => textOrNoData(quote.scopeIncluded) },
    { key: "scopeExcluded", label: t("rowScopeExcluded"), cell: (quote) => textOrNoData(quote.scopeExcluded) },
    { key: "transport", label: t("rowTransport"), cell: (quote) => logisticsCell(quote, "transport") },
    { key: "assembly", label: t("rowAssembly"), cell: (quote) => logisticsCell(quote, "assembly") },
    { key: "crane", label: t("rowCrane"), cell: (quote) => logisticsCell(quote, "crane") },
    { key: "paymentPlan", label: t("rowPaymentPlan"), cell: (quote) => textOrNoData(quote.paymentPlan) },
    { key: "validUntil", label: t("rowValidUntil"), cell: (quote) => (quote.validUntil ? formatDate(quote.validUntil) : noData) },
    { key: "warranty", label: t("rowWarranty"), cell: (quote) => textOrNoData(quote.warrantyNote) },
    {
      key: "leadTime",
      label: t("rowLeadTime"),
      cell: (quote) => (quote.proposedLeadTimeWeeks ? t("leadTimeWeeks", { weeks: quote.proposedLeadTimeWeeks }) : noData),
    },
    { key: "deliveryWindow", label: t("rowDeliveryWindow"), cell: deliveryWindowCell },
    { key: "notes", label: t("rowNotes"), cell: (quote) => textOrNoData(quote.notes) },
    { key: "advisorNote", label: t("rowAdvisorNote"), cell: (quote) => textOrNoData(quote.advisorNote) },
    {
      key: "certifications",
      label: t("rowCertifications"),
      cell: (quote) =>
        quote.certifications.length === 0 ? (
          noData
        ) : (
          <ul className="flex flex-col gap-1">
            {quote.certifications.map((certification) => (
              <li key={certification.name}>
                {certification.name}
                {certification.confirmed && <span className="text-brand-v5-muted"> ({t("certificationConfirmed")})</span>}
              </li>
            ))}
          </ul>
        ),
    },
    { key: "status", label: t("rowStatus"), cell: (quote) => statusLabel[quote.status] },
  ];

  const attachments = quotes.filter((quote) => quote.hasPdf);
  // Po połączeniu stron (jedna oferta accepted) wyboru nie zmienia się już tutaj (AC-16).
  const connected = quotes.some((quote) => quote.status === "accepted");
  const canSelect = !connected && !requestClosed;
  const pendingSelection = canSelect && selectedQuoteId !== null && quotes.some((quote) => quote.id === selectedQuoteId);

  return (
    <div className="flex flex-col gap-brand-3">
      <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
        <table className="w-full min-w-[40rem] border-collapse text-body text-brand-v5-ink">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="border-b border-brand-v5-line bg-brand-v5-line/10 text-left align-top">
              <th scope="col" className="p-brand-2 font-medium">
                <span className="sr-only">{t("rowHeader")}</span>
              </th>
              {quotes.map((quote) => (
                <th key={quote.id} scope="col" className="p-brand-2 font-medium">
                  {quote.producerName}
                  <br />
                  <span className="text-label font-normal text-brand-v5-muted">{dateFormatter.format(quote.submittedAt)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-brand-v5-line/50 align-top last:border-b-0">
                <th scope="row" className="p-brand-2 text-left font-medium text-brand-v5-muted">
                  {row.label}
                </th>
                {quotes.map((quote) => (
                  <td key={quote.id} className="max-w-[24rem] p-brand-2">
                    {row.cell(quote)}
                  </td>
                ))}
              </tr>
            ))}
            {canSelect && quotes.some((quote) => quote.status === "active") && (
              <tr className="align-top">
                <th scope="row" className="p-brand-2 text-left font-medium text-brand-v5-muted">
                  {t("rowAction")}
                </th>
                {quotes.map((quote) => (
                  <td key={quote.id} className="p-brand-2">
                    {quote.status === "active" && (
                      <SelectQuoteButton
                        quoteId={quote.id}
                        isSelected={quote.id === selectedQuoteId}
                        hasOtherSelection={selectedQuoteId !== null && quote.id !== selectedQuoteId}
                      />
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {connected && (
        <div role="status">
          <Text surface="v5" className="font-medium text-status-approved">
            {t("connectedNote")}
          </Text>
        </div>
      )}
      {pendingSelection && (
        <div role="status">
          <Text surface="v5" tone="muted">
            {t("pendingNote")}
          </Text>
        </div>
      )}
      {attachments.length > 0 && (
        <section className="flex flex-col gap-brand-2">
          <Heading level="h3" surface="v5">
            {t("attachmentsHeading")}
          </Heading>
          <ul className="flex flex-col gap-brand-2">
            {attachments.map((quote) => (
              <li key={quote.id} className="flex flex-wrap items-center gap-brand-3">
                <Text surface="v5">{t("attachmentLabel", { producer: quote.producerName })}</Text>
                <DownloadQuotePdfButton quoteId={quote.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
