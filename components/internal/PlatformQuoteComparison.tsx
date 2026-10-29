import { Check } from "lucide-react";
import { DownloadQuotePdfButton } from "@/components/klient/DownloadQuotePdfButton";
import { MarkPlatformQuoteButton } from "@/components/internal/PlatformSelectionControls";
import { QuotePublicationControls } from "@/components/internal/QuotePublicationControls";
import { Text } from "@/components/ui";
import type { LargeOrderQuoteForAdmin } from "@/lib/db/queries";
import { QUOTE_LOGISTICS_ITEMS, storedLogisticsSchema, type QuoteLogisticsItem } from "@/lib/project-quote-specs";

const LOGISTICS_LABEL: Record<QuoteLogisticsItem, string> = {
  transport: "Transport",
  assembly: "Montaż",
  crane: "Dźwig",
};

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency }).format(cents / 100);
}

// Pozycja logistyki jako tekst: kwota, widełki albo "do późniejszej wyceny" (nigdy zero).
function formatLogisticsItem(raw: Record<string, unknown>, item: QuoteLogisticsItem, currency: string): string {
  const parsed = storedLogisticsSchema.safeParse(raw);
  const value = parsed.success ? parsed.data[item] : undefined;
  if (!value) return "brak danych";
  const note = value.note ? ` (${value.note})` : "";
  if (value.mode === "tbd") return `do późniejszej wyceny${note}`;
  if (value.mode === "amount") return `${formatMoney(value.amountCents, currency)}${note}`;
  return `${formatMoney(value.amountCents, currency)} do ${formatMoney(value.maxAmountCents, currency)}${note}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Spec 0077 AC-15: tabela porównawcza wszystkich aktywnych ofert projektu własnego, od razu po ich
// złożeniu, bez publikacji. Jedna kolumna na ofertę, wiersze to cechy. Waluty nie są przeliczane,
// a cena netto i brutto jest jasno oznaczona. Oferty zastąpione nie są pokazywane.
export function PlatformQuoteComparison({
  requestId,
  quotes,
  markedQuoteId,
  selectionOpen,
}: {
  requestId: string;
  quotes: LargeOrderQuoteForAdmin[];
  markedQuoteId: string | null;
  // Wybór jeszcze nie zakończony: można oznaczać oferty i dodawać komentarz.
  selectionOpen: boolean;
}) {
  const visible = quotes.filter((quote) => quote.status !== "superseded");
  if (visible.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-brand-steel p-brand-4">
        <Text tone="muted">Nikt jeszcze nie złożył oferty. Pojawią się tutaj od razu, gdy producenci odpowiedzą przed terminem.</Text>
      </div>
    );
  }

  const rows: { label: string; render: (quote: LargeOrderQuoteForAdmin) => React.ReactNode }[] = [
    { label: "Producent", render: (q) => <span className="font-semibold">{q.producerName}</span> },
    { label: "Wariant", render: (q) => q.variantLabel ?? "brak" },
    {
      label: "Cena łączna",
      render: (q) => (
        <span>
          <span className="block font-semibold tabular-nums">{formatMoney(q.totalPriceCents, q.currency)}</span>
          <span className="block text-data text-brand-technical-graphite">
            {q.priceTaxMode === "gross" ? "brutto" : "netto"}
            {q.vatRatePercent ? `, VAT ${q.vatRatePercent}%` : ""}
          </span>
        </span>
      ),
    },
    { label: "Cena za sztukę", render: (q) => (q.unitPriceCents ? formatMoney(q.unitPriceCents, q.currency) : "brak") },
    { label: "Waluta", render: (q) => q.currency },
    { label: "Zakres w cenie", render: (q) => <span className="whitespace-pre-line">{q.scopeIncluded ?? "brak"}</span> },
    { label: "Zakres poza ceną", render: (q) => <span className="whitespace-pre-line">{q.scopeExcluded ?? "brak"}</span> },
    ...QUOTE_LOGISTICS_ITEMS.map((item) => ({
      label: LOGISTICS_LABEL[item],
      render: (q: LargeOrderQuoteForAdmin) => formatLogisticsItem(q.logistics, item, q.currency),
    })),
    { label: "Plan płatności", render: (q) => <span className="whitespace-pre-line">{q.paymentPlan ?? "brak"}</span> },
    { label: "Ważna do", render: (q) => q.validUntil ?? "brak" },
    { label: "Gwarancja", render: (q) => q.warrantyNote ?? "brak" },
    { label: "Termin produkcji", render: (q) => (q.proposedLeadTimeWeeks ? `${q.proposedLeadTimeWeeks} tyg.` : "brak") },
    {
      label: "Okno dostawy",
      render: (q) =>
        q.deliveryWindowFrom || q.deliveryWindowTo ? `${q.deliveryWindowFrom ?? "?"} do ${q.deliveryWindowTo ?? "?"}` : "brak",
    },
    { label: "Notatki producenta", render: (q) => <span className="whitespace-pre-line">{q.notes ?? "brak"}</span> },
    { label: "Złożona", render: (q) => dateTimeFormatter.format(q.submittedAt) },
    { label: "Oferta PDF", render: (q) => (q.hasPdf ? <DownloadQuotePdfButton quoteId={q.id} /> : "brak") },
    {
      label: "Komentarz ModularHub",
      render: (q) => (
        <div className="flex flex-col gap-brand-2">
          {q.advisorNote && <span className="whitespace-pre-line">{q.advisorNote}</span>}
          {q.status === "active" && selectionOpen && (
            <QuotePublicationControls quoteId={q.id} advisorNote={q.advisorNote} isPublished={false} isSelected={false} />
          )}
        </div>
      ),
    },
    {
      label: "Wybór",
      render: (q) =>
        q.status === "accepted" ? (
          <span className="inline-flex items-center gap-brand-1 font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="size-4" aria-hidden="true" />
            Wybrana
          </span>
        ) : q.status === "rejected" ? (
          <span className="text-brand-technical-graphite">Niewybrana</span>
        ) : selectionOpen ? (
          <MarkPlatformQuoteButton requestId={requestId} quoteId={q.id} isMarked={markedQuoteId === q.id} />
        ) : (
          "brak"
        ),
    },
  ];

  return (
    <div className="overflow-x-auto rounded-card border border-brand-steel">
      <table className="w-full min-w-max border-collapse text-body">
        <caption className="sr-only">Porównanie ofert producentów w projekcie własnym</caption>
        <thead>
          <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
            <th scope="col" className="sticky left-0 z-10 bg-brand-steel/20 p-brand-2 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">
              Cecha
            </th>
            {visible.map((quote, index) => (
              <th
                key={quote.id}
                scope="col"
                className={`min-w-[14rem] max-w-[20rem] p-brand-2 align-top font-medium ${markedQuoteId === quote.id ? "bg-emerald-500/10" : ""}`}
              >
                Oferta {index + 1}
                {markedQuoteId === quote.id && <span className="ml-brand-2 text-data text-emerald-700 dark:text-emerald-300">(oznaczona)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-brand-steel/50 align-top last:border-b-0">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-brand-warm-white p-brand-2 text-left text-data font-medium text-brand-technical-graphite"
              >
                {row.label}
              </th>
              {visible.map((quote) => (
                <td key={quote.id} className={`p-brand-2 ${markedQuoteId === quote.id ? "bg-emerald-500/5" : ""}`}>
                  {row.render(quote)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
