import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { InquiryAttachmentsPanel } from "@/components/inquiry-attachments/InquiryAttachmentsPanel";
import { getInquiryAttachmentLabels } from "@/components/inquiry-attachments/getInquiryAttachmentLabels";
import { QuoteFormModal } from "@/components/producent/QuoteFormModal";
import { Heading, Stack, StatusPill, Text } from "@/components/ui";
import { getProducerIdForUser, getProductInquiryForProducerDetail } from "@/lib/db/queries";
import { listInquiryAttachments } from "@/lib/inquiry-attachment-actions";
import { requirePanelProducerSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Szczegóły zapytania o produkt producenta (spec 0070 AC-21): pełne dane do wyceny bez
// kontaktu inwestora (AC-22), termin ofert, stan własnej oferty i ten sam formularz
// oferty co na tablicy. Cudze i nieistniejące zapytanie dają 404.
export default async function ProducerProductInquiryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const selfHref = `/${locale}/producer/panel/product-inquiries/${id}`;
  const [session, t, tBoard, tIntendedUse] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerProductInquiryDetailPage"),
    getTranslations("ProducerBoardDetailPage"),
    getTranslations("IntendedUse"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const detail = producerId ? await getProductInquiryForProducerDetail(id, producerId) : null;
  if (!detail) notFound();
  const intendedUseText = detail.intendedUse
    ? detail.intendedUse === "seasonal" && detail.intendedUseMonths
      ? tIntendedUse("monthsValue", { months: detail.intendedUseMonths })
      : tIntendedUse(detail.intendedUse === "seasonal" ? "seasonal" : "yearRound")
    : null;
  // Pliki inwestora (spec 0070 AC-31): producent produktu widzi je od razu po wgraniu.
  const [attachments, attachmentLabels] = await Promise.all([
    listInquiryAttachments("product", id),
    getInquiryAttachmentLabels(locale),
  ]);

  const ownQuoteStatusLabel: Record<string, string> = {
    active: tBoard("ownQuoteStatusActive"),
    accepted: tBoard("ownQuoteStatusAccepted"),
    rejected: tBoard("ownQuoteStatusRejected"),
    superseded: tBoard("ownQuoteStatusSuperseded"),
  };
  const ownQuoteStatusTone: Record<string, "approved" | "conditional" | "blocked"> = {
    active: "conditional",
    accepted: "approved",
    rejected: "blocked",
    superseded: "conditional",
  };

  const isLocked = detail.ownQuoteStatus === "accepted";
  const showQuoteForm = !isLocked && detail.acceptingQuotes && !detail.ownQuotePublished;
  const formatDay = (value: string | null) => (value ? dateFormatter.format(new Date(`${value}T00:00:00`)) : "—");
  const hasStart = detail.startWindowFrom || detail.startWindowTo;
  const hasDelivery = detail.deliveryWindowFrom || detail.deliveryWindowTo;

  return (
    <Stack gap={5}>
      <Link
        href={`/${locale}/producer/panel/inquiries`}
        className="focus-ring inline-flex w-fit items-center gap-brand-1 rounded-data text-body text-brand-technical-graphite hover:text-brand-foundation-navy"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("backToList")}
      </Link>

      <div className="flex flex-col gap-brand-5">
        <Stack gap={5}>
          <div className="flex flex-col gap-brand-3 sm:flex-row sm:items-start sm:justify-between">
            <Stack gap={2}>
              <Heading level="h1">{detail.productName}</Heading>
              <Text as="span" tone="muted">
                {dateFormatter.format(detail.createdAt)}
              </Text>
            </Stack>
            <div className="flex flex-col gap-brand-2 sm:max-w-xs sm:items-end sm:text-right">
            {detail.ownQuoteStatus && (
              <div className="flex flex-wrap items-center gap-brand-2">
                <Text as="span" tone="muted">
                  {tBoard("ownQuoteStatusLabel")}
                </Text>
                <StatusPill status={ownQuoteStatusTone[detail.ownQuoteStatus] ?? "conditional"}>
                  {ownQuoteStatusLabel[detail.ownQuoteStatus] ?? detail.ownQuoteStatus}
                </StatusPill>
              </div>
            )}
            {detail.ownQuotePublished && detail.acceptingQuotes && !isLocked && (
              <Text tone="muted">{tBoard("ownQuotePublishedNote")}</Text>
            )}
            {!showQuoteForm && !isLocked && !detail.ownQuotePublished && (
              <Text tone="muted">{tBoard("quotesClosedNote")}</Text>
            )}
            {showQuoteForm && (
              <QuoteFormModal bulkProductInquiryId={detail.id} isRevision={detail.ownQuoteStatus !== null} />
            )}
            </div>
          </div>

          <section className="flex flex-col gap-brand-3">
            <Heading level="h3">{t("scopeHeading")}</Heading>
            <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Fact label={t("countryLabel")} value={detail.countryName} />
              <Fact label={t("unitCountLabel")} value={String(detail.unitCount)} emphasis />
              <Fact label={t("deadlineLabel")} value={dateFormatter.format(detail.deadlineAt)} />
              {intendedUseText && <Fact label={tIntendedUse("label")} value={intendedUseText} />}
            </dl>
          </section>

          {(hasStart || hasDelivery) && (
            <section className="flex flex-col gap-brand-3 border-t border-brand-steel pt-brand-4">
              <Heading level="h3">{t("scheduleHeading")}</Heading>
              <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {hasStart && (
                  <Fact
                    label={t("startWindowLabel")}
                    value={`${formatDay(detail.startWindowFrom)} – ${formatDay(detail.startWindowTo)}`}
                  />
                )}
                {hasDelivery && (
                  <Fact
                    label={t("deliveryWindowLabel")}
                    value={`${formatDay(detail.deliveryWindowFrom)} – ${formatDay(detail.deliveryWindowTo)}`}
                  />
                )}
              </dl>
            </section>
          )}

          {detail.note && (
            <section className="flex flex-col gap-brand-2 border-t border-brand-steel pt-brand-4">
              <Heading level="h3">{t("noteLabel")}</Heading>
              <Text measure>{detail.note}</Text>
            </section>
          )}

          {(attachments.length > 0 || detail.filesChangedAfterOwnQuote) && (
            <div className="border-t border-brand-steel pt-brand-4">
              <InquiryAttachmentsPanel
                kind="product"
                inquiryId={detail.id}
                items={attachments}
                viewer="producer"
                labels={attachmentLabels}
                locale={locale}
                surface="v3"
                changedAfterQuote={detail.filesChangedAfterOwnQuote}
              />
            </div>
          )}
        </Stack>
      </div>
    </Stack>
  );
}

function Fact({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex flex-col gap-brand-1">
      <Text as="dt" variant="label" tone="muted">
        {label}
      </Text>
      <Text as="dd" className={emphasis ? "text-h3 font-semibold" : undefined}>
        {value}
      </Text>
    </div>
  );
}
