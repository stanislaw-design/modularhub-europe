import { ArrowLeft, Check, Circle, Mail, Megaphone, Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { InquiryAttachmentsPanel } from "@/components/inquiry-attachments/InquiryAttachmentsPanel";
import { getInquiryAttachmentLabels } from "@/components/inquiry-attachments/getInquiryAttachmentLabels";
import { DownloadQuotePdfButton } from "@/components/klient/DownloadQuotePdfButton";
import {
  LargeOrderKindPill,
  LargeOrderQuoteStatusPill,
  LargeOrderStatusPill,
  LargeOrderTonePill,
} from "@/components/internal/LargeOrderPills";
import { describeDeadline } from "@/components/internal/largeOrderDeadline";
import { CloseRequestControl } from "@/components/internal/CloseRequestControl";
import { ConnectSelectionControl } from "@/components/internal/ConnectSelectionControl";
import { ExtendDeadlineControl } from "@/components/internal/ExtendDeadlineControl";
import { PublishSummaryControl } from "@/components/internal/PublishSummaryControl";
import { QuotePublicationControls } from "@/components/internal/QuotePublicationControls";
import { ProducerOverridesAdminSection } from "@/components/internal/ProducerOverridesAdminSection";
import { Heading, Stack, Text } from "@/components/ui";
import { getProducerMatchesForAdmin } from "@/lib/db/project-request-matching";
import { getLargeOrderForAdmin, type LargeOrderKind, type LargeOrderQuoteForAdmin } from "@/lib/db/queries";
import { listInquiryAttachments } from "@/lib/inquiry-attachment-actions";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const closeReasonLabel: Record<string, string> = {
  client_cancelled: "Klient zrezygnował",
  no_offers: "Brak ofert",
  expired: "Termin minął",
  staff_closed: "Zamknięte przez zespół",
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// "Teraz" dla terminu ofert; osobna funkcja tylko dla reguły react-hooks/purity.
const getNow = () => Date.now();

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency }).format(cents / 100);
}

// Szczegóły dużego zamówienia dla administratora (spec 0070 część A, AC-2, AC-22):
// pełne dane kontaktowe klienta, wszystkie oferty (także nieopublikowane),
// PDF przez krótko ważny link (getProjectQuotePdfUrl ma gałąź dla admina) i
// znaczniki czasu. Rodzaj w parametrze ?kind=, bo identyfikatory są w dwóch
// tabelach. Dla zapytania wolnego jest też lista producentów z wyjątkami
// dopasowania (spec 0070 AC-10).
//
// Układ: nagłówek z rodzajem i statusem, pasek faktów (termin, skala, kraj,
// oferty), potem oferty jako główna praca w lewej kolumnie, a klient i oś czasu
// jako materiał pomocniczy w prawej.
export default async function InternalLargeOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { locale, id } = await params;
  const { kind: kindParam } = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/large-orders/${id}${kindParam ? `?kind=${kindParam}` : ""}`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  if (!UUID_PATTERN.test(id)) notFound();
  const kind: LargeOrderKind = kindParam === "product" ? "product" : "request";
  const order = await getLargeOrderForAdmin(kind, id);
  if (!order) notFound();
  // Dopasowanie dotyczy tylko zapytania wolnego; zapytanie o produkt idzie do producenta produktu.
  const producerMatches = kind === "request" ? await getProducerMatchesForAdmin(id) : null;
  // Pliki inwestora (spec 0070 AC-31, AC-32): admin widzi wszystkie, także ukryte i usunięte.
  // Panel admina jest po polsku niezależnie od języka adresu.
  const [attachments, attachmentLabels] = await Promise.all([
    listInquiryAttachments(kind, id),
    getInquiryAttachmentLabels("pl"),
  ]);

  const contactRevealedAt = order.quotes.find((quote) => quote.contactRevealedAt)?.contactRevealedAt ?? null;
  const deadline = describeDeadline(order.deadlineAt, order.status, getNow());
  const pendingPublication = order.quotes.filter((quote) => quote.status === "active" && !quote.publishedToClientAt).length;
  const units = String(order.unitCount);

  const timeline: { label: string; at: Date | null }[] = [
    { label: "Złożenie zapytania", at: order.createdAt },
    { label: "Publikacja podsumowania", at: order.summaryPublishedAt },
    { label: "Wybór klienta", at: order.selectedAt },
    { label: "Połączenie stron", at: contactRevealedAt },
    { label: "Zamknięcie", at: order.closedAt },
  ];

  return (
    <Stack gap={5}>
      <header className="flex flex-col gap-brand-3">
        <div className="flex flex-wrap items-center gap-x-brand-3 gap-y-brand-2">
          <LargeOrderKindPill kind={order.kind} />
          <LargeOrderStatusPill status={order.status} />
          <Text as="span">
            <span className="font-medium">{order.contactName}</span>
            <span className="text-brand-technical-graphite">, złożone {dateTimeFormatter.format(order.createdAt)}</span>
          </Text>
          {order.closedReason && (
            <Text as="span" tone="muted">
              {closeReasonLabel[order.closedReason] ?? order.closedReason}
            </Text>
          )}
          <Link
            href={`/${locale}/internal/large-orders`}
            className="focus-ring ml-auto inline-flex items-center gap-brand-1 rounded-data text-data font-medium text-brand-technical-graphite hover:text-brand-foundation-navy"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Wszystkie duże zamówienia
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-x-brand-5 gap-y-brand-3">
          <Heading level="h1" className="min-w-0">
            {order.kind === "product" ? order.productName : "Zapytanie wolne"}
          </Heading>
          <section aria-labelledby="order-timeline-heading" className="ml-auto">
            <h2 id="order-timeline-heading" className="sr-only">
              Oś czasu
            </h2>
            <ol className="flex">
              {timeline.map((step, index) => (
                <li key={step.label} className="relative flex w-[7.5rem] flex-col items-center gap-brand-1 text-center">
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className={`absolute right-1/2 top-[0.6875rem] h-px w-full ${step.at ? "bg-emerald-500/50" : "bg-brand-steel"}`}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative flex size-[1.375rem] items-center justify-center rounded-full border bg-brand-warm-white ${
                      step.at
                        ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                        : "border-brand-steel text-brand-technical-graphite"
                    }`}
                  >
                    {step.at ? <Check className="size-3.5" /> : <Circle className="size-2" />}
                  </span>
                  <p className={`text-label ${step.at ? "font-medium" : "text-brand-technical-graphite"}`}>{step.label}</p>
                  <p className="text-label text-brand-technical-graphite">{step.at ? dateTimeFormatter.format(step.at) : "jeszcze nie"}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-brand-steel bg-brand-steel sm:grid-cols-4">
        <Fact label="Termin ofert">
          <span className="block font-semibold">{dateTimeFormatter.format(order.deadlineAt)}</span>
          {deadline && (
            <span className={`block text-data font-medium ${deadline.urgent ? "text-status-conditional" : "text-brand-technical-graphite"}`}>
              {deadline.text}
            </span>
          )}
          {order.status !== "accepted" && order.status !== "closed" && <ExtendDeadlineControl id={id} kind={kind} />}
        </Fact>
        <Fact label="Liczba domów">
          <span className="block font-semibold tabular-nums">{units}</span>
        </Fact>
        <Fact label="Kraj">
          <span className="block font-semibold">
            {order.countryName} ({order.countryCode})
          </span>
        </Fact>
        <Fact label="Oferty">
          <span className={`block font-semibold tabular-nums ${order.quotes.length === 0 ? "text-brand-technical-graphite" : ""}`}>
            {order.quotes.length}
          </span>
          {pendingPublication > 0 && (
            <span className="block text-data font-medium text-status-conditional">{pendingPublication} do publikacji</span>
          )}
        </Fact>
      </dl>

      <div className="grid gap-brand-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-brand-5">
          <section aria-labelledby="order-quotes-heading" className="flex flex-col gap-brand-3">
            <h2 id="order-quotes-heading" className="text-h3 font-semibold">
              Oferty producentów
            </h2>
            {order.status !== "closed" && <CloseRequestControl id={id} kind={kind} />}
            {pendingPublication > 0 && order.status !== "accepted" && order.status !== "closed" && (
              <PublishSummaryControl
                id={id}
                kind={kind}
                pendingCount={pendingPublication}
                alreadyPublished={order.summaryPublishedAt !== null}
              />
            )}
            {order.selectedQuoteId && !contactRevealedAt && order.status !== "accepted" && order.status !== "closed" && (
              <ConnectSelectionControl id={id} kind={kind} />
            )}
            {order.quotes.length === 0 ? (
              <div className="rounded-card border border-dashed border-brand-steel p-brand-4">
                <Text tone="muted">Nikt jeszcze nie złożył oferty. Pojawią się tutaj, gdy producenci odpowiedzą przed terminem.</Text>
              </div>
            ) : (
              order.quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} isSelected={order.selectedQuoteId === quote.id} />)
            )}
          </section>

          {producerMatches && <ProducerOverridesAdminSection projectRequestId={order.id} producers={producerMatches} />}

          <InquiryAttachmentsPanel
            kind={kind}
            inquiryId={order.id}
            items={attachments}
            viewer="admin"
            labels={attachmentLabels}
            locale="pl"
            surface="v3"
            canChange
          />

          <section aria-labelledby="order-scope-heading" className="flex flex-col gap-brand-2">
            <h2 id="order-scope-heading" className="text-h3 font-semibold">
              Czego chce klient
            </h2>
            <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-2 sm:grid-cols-2">
              {order.projectType && <Row label="Rodzaj projektu" value={order.projectType} />}
              {order.families.length > 0 && <Row label="Rodziny" value={order.families.join(", ")} />}
            </dl>
            <div className="rounded-card bg-brand-steel/10 p-brand-3">
              <p className="text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">Uwagi klienta</p>
              {order.note ? (
                <p className="mt-brand-1 max-w-[68ch] whitespace-pre-line text-body">{order.note}</p>
              ) : (
                <p className="mt-brand-1 text-body text-brand-technical-graphite">Klient nie dodał uwag.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-brand-5">
          <section aria-labelledby="order-contact-heading" className="flex flex-col gap-brand-3 rounded-card border border-brand-steel p-brand-3">
            <div>
              <h2 id="order-contact-heading" className="text-body font-semibold">
                Klient
              </h2>
              <p className="text-label uppercase tracking-[0.08em] text-brand-technical-graphite">Dane tylko dla zespołu</p>
            </div>
            <p className="text-body-l font-semibold">{order.contactName}</p>
            <ul className="flex flex-col gap-brand-2 text-body">
              <li className="flex items-start gap-brand-2">
                <Mail className="mt-1 size-4 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
                <a href={`mailto:${order.contactEmail}`} className="focus-ring min-w-0 break-all rounded-data text-brand-passage-blue underline">
                  {order.contactEmail}
                </a>
              </li>
              <li className="flex items-start gap-brand-2">
                <Phone className="mt-1 size-4 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
                {order.contactPhone ? (
                  <a href={`tel:${order.contactPhone}`} className="focus-ring rounded-data text-brand-passage-blue underline">
                    {order.contactPhone}
                  </a>
                ) : (
                  <span className="text-brand-technical-graphite">brak telefonu</span>
                )}
              </li>
            </ul>
            <dl className="flex flex-col gap-brand-2 border-t border-brand-steel pt-brand-3 text-data">
              <Row label="Język maili" value={order.contactLocale} stacked />
              <Row label="Konto klienta" value={order.clientId ? "Powiązane" : "Niepowiązane, klient się nie zalogował"} stacked />
              {order.createdByStaffUserId && <Row label="Złożone przez doradcę" value="Tak" stacked />}
            </dl>
          </section>
        </aside>
      </div>
    </Stack>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-brand-1 bg-brand-warm-white p-brand-3">
      <dt className="text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">{label}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  );
}

function Row({ label, value, stacked = false }: { label: string; value: string | null; stacked?: boolean }) {
  const empty = value === null || value === "";
  return (
    <div className={stacked ? "flex flex-col" : "flex flex-col gap-0.5"}>
      <dt className="text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">{label}</dt>
      <dd className={empty ? "text-brand-technical-graphite" : undefined}>{empty ? "brak" : value}</dd>
    </div>
  );
}

function QuoteCard({ quote, isSelected }: { quote: LargeOrderQuoteForAdmin; isSelected: boolean }) {
  const isPublished = Boolean(quote.publishedToClientAt);
  const hasLogistics = Object.keys(quote.logistics).length > 0;
  const delivery =
    quote.deliveryWindowFrom || quote.deliveryWindowTo ? `${quote.deliveryWindowFrom ?? "?"} do ${quote.deliveryWindowTo ?? "?"}` : null;
  const details: { label: string; value: string | null }[] = [
    { label: "Zakres w cenie", value: quote.scopeIncluded },
    { label: "Zakres poza ceną", value: quote.scopeExcluded },
    { label: "Plan płatności", value: quote.paymentPlan },
    { label: "Gwarancja", value: quote.warrantyNote },
    { label: "Okno dostawy", value: delivery },
    { label: "Uwagi producenta", value: quote.notes },
    { label: "Wynik producenta", value: quote.producerOutcome },
  ];
  const filledDetails = details.filter((item) => item.value);

  return (
    <article
      className={`flex flex-col gap-brand-3 rounded-card border p-brand-3 ${
        isSelected ? "border-emerald-500/50 bg-emerald-500/5" : "border-brand-steel"
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-brand-2">
        <div className="min-w-0">
          <h3 className="text-body-l font-semibold">{quote.producerName}</h3>
          <p className="text-data text-brand-technical-graphite">Złożona {dateTimeFormatter.format(quote.submittedAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-brand-2">
          {isSelected && (
            <LargeOrderTonePill tone="emerald" icon={Check}>
              Wybrana przez klienta
            </LargeOrderTonePill>
          )}
          <LargeOrderQuoteStatusPill status={quote.status} />
          {isPublished ? (
            <LargeOrderTonePill tone="teal" icon={Megaphone}>
              {`U klienta od ${dateFormatter.format(quote.publishedToClientAt as Date)}`}
            </LargeOrderTonePill>
          ) : (
            quote.status === "active" && (
              <LargeOrderTonePill tone="amber" icon={Megaphone}>
                Do publikacji
              </LargeOrderTonePill>
            )
          )}
        </div>
      </header>

      <div className="grid gap-brand-3 border-y border-brand-steel py-brand-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">Cena łączna</p>
          <p className="text-h3 font-semibold tabular-nums">{formatMoney(quote.totalPriceCents, quote.currency)}</p>
          <p className="text-data text-brand-technical-graphite">
            {quote.priceTaxMode === "gross" ? "brutto" : "netto"}
            {quote.vatRatePercent ? `, VAT ${quote.vatRatePercent}%` : ""}
          </p>
        </div>
        <KeyTerm label="Cena za sztukę" value={quote.unitPriceCents ? formatMoney(quote.unitPriceCents, quote.currency) : null} />
        <KeyTerm label="Produkcja" value={quote.proposedLeadTimeWeeks ? `${quote.proposedLeadTimeWeeks} tyg.` : null} />
        <KeyTerm label="Ważna do" value={quote.validUntil} />
      </div>

      {filledDetails.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-3 sm:grid-cols-2">
          {filledDetails.map((item) => (
            <Row key={item.label} label={item.label} value={item.value} />
          ))}
        </dl>
      )}

      {quote.advisorNote && (
        <div className="rounded-data bg-brand-steel/15 p-brand-3">
          <p className="text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">Komentarz ModularHub</p>
          <p className="mt-brand-1 text-body">{quote.advisorNote}</p>
        </div>
      )}

      {hasLogistics && <Text tone="muted">Logistyka: {JSON.stringify(quote.logistics)}</Text>}

      <footer className="flex flex-col gap-brand-3">
        {quote.hasPdf ? <DownloadQuotePdfButton quoteId={quote.id} /> : <Text tone="muted">Brak pliku PDF.</Text>}
        {quote.status === "active" && (
          <QuotePublicationControls
            quoteId={quote.id}
            advisorNote={quote.advisorNote}
            isPublished={isPublished}
            isSelected={isSelected}
          />
        )}
      </footer>
    </article>
  );
}

function KeyTerm({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">{label}</p>
      <p className={`text-body font-semibold tabular-nums ${value ? "" : "font-normal text-brand-technical-graphite"}`}>{value ?? "brak"}</p>
    </div>
  );
}
