import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { InquiryAttachmentsPanel } from "@/components/inquiry-attachments/InquiryAttachmentsPanel";
import { getInquiryAttachmentLabels } from "@/components/inquiry-attachments/getInquiryAttachmentLabels";
import { QuoteForm } from "@/components/producent/QuoteForm";
import { Heading, Stack, StatusPill, Text } from "@/components/ui";
import {
  getProducerIdForUser,
  getProducerVolumeVerificationStatus,
  getProjectRequestForBoardDetail,
} from "@/lib/db/queries";
import { listInquiryAttachments } from "@/lib/inquiry-attachment-actions";
import { requirePanelProducerSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Szczegóły ogłoszenia z tablicy (spec 0062 AC-4): pełne dane do wyceny, bez
// kontaktu (maskowanie na poziomie zapytania SQL, getProjectRequestForBoardDetail),
// plus status własnej wyceny tego producenta, jeśli już ją złożył.
export default async function ProducerBoardDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const selfHref = `/${locale}/producer/panel/board/${id}`;
  const [session, t, tProjectRequest, tOptions] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerBoardDetailPage"),
    getTranslations("ProjectRequestFlow"),
    getTranslations("ProjectOptions"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const volumeStatus = producerId
    ? await getProducerVolumeVerificationStatus(producerId)
    : null;
  if (volumeStatus !== "approved") {
    redirect(`/${locale}/producer/panel/board`);
  }
  const detail = producerId
    ? await getProjectRequestForBoardDetail(id, producerId)
    : null;
  if (!detail) {
    notFound();
  }
  // Pliki inwestora (spec 0070 AC-31): lista liczona tą samą regułą dopasowania co zapytanie.
  const [attachments, attachmentLabels] = await Promise.all([
    listInquiryAttachments("request", id),
    getInquiryAttachmentLabels(locale),
  ]);

  const ownQuoteStatusLabel: Record<string, string> = {
    active: t("ownQuoteStatusActive"),
    accepted: t("ownQuoteStatusAccepted"),
    rejected: t("ownQuoteStatusRejected"),
    superseded: t("ownQuoteStatusSuperseded"),
  };
  const trustSignalLabel: Record<typeof detail.trustSignal, string> = {
    new: t("trustSignalNew"),
    complete: t("trustSignalComplete"),
  };

  const isLocked = detail.ownQuoteStatus === "accepted";
  const showQuoteForm =
    !isLocked && detail.acceptingQuotes && !detail.ownQuotePublished;
  const ownQuoteStatusTone: Record<
    string,
    "approved" | "conditional" | "blocked"
  > = {
    active: "conditional",
    accepted: "approved",
    rejected: "blocked",
    superseded: "conditional",
  };

  const unitCount = String(detail.unitCount);
  const floorArea =
    detail.floorAreaM2Min || detail.floorAreaM2Max
      ? `${detail.floorAreaM2Min ?? "—"}${detail.floorAreaM2Max ? `–${detail.floorAreaM2Max}` : ""} m²`
      : null;
  const formatDay = (value: string | null) =>
    value ? dateFormatter.format(new Date(`${value}T00:00:00`)) : "—";
  const hasStart = detail.startWindowFrom || detail.startWindowTo;
  const hasDelivery = detail.deliveryWindowFrom || detail.deliveryWindowTo;
  const hasSchedule = hasStart || hasDelivery || detail.locationDetail;

  return (
    <Stack gap={5}>
      <Link
        href={`/${locale}/producer/panel/board`}
        className="focus-ring inline-flex w-fit items-center gap-brand-1 rounded-data text-body text-brand-technical-graphite hover:text-brand-foundation-navy"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("backToBoard")}
      </Link>

      <div className="grid grid-cols-1 items-start gap-brand-5 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <Stack gap={5}>
          <Stack gap={2}>
            <Heading level="h1">{t("heading")}</Heading>
            <div className="flex flex-wrap items-center gap-x-brand-3 gap-y-brand-1">
              <StatusPill
                status={
                  detail.trustSignal === "complete" ? "approved" : "conditional"
                }
              >
                {`${t("trustSignalLabel")}: ${trustSignalLabel[detail.trustSignal]}`}
              </StatusPill>
              <Text as="span" tone="muted">
                {dateFormatter.format(detail.createdAt)}
              </Text>
            </div>
          </Stack>

          <section className="flex flex-col gap-brand-3">
            <Heading level="h3">{t("scopeHeading")}</Heading>
            <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-3 sm:grid-cols-2">
              <Fact label={t("countryLabel")} value={detail.countryName} />
              {!detail.deliversToCountry && (
                <Text as="p" className="text-status-conditional sm:col-span-2">
                  {t("notDeliveringNote")}{" "}
                  <Link
                    href={`/${locale}/producer/panel/capacity`}
                    className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline"
                  >
                    {t("notDeliveringLink")}
                  </Link>
                </Text>
              )}
              <Fact
                label={t("projectTypeLabel")}
                value={tProjectRequest(`projectType.${detail.projectType}`)}
              />
              <Fact label={t("unitCountLabel")} value={unitCount} emphasis />
              {floorArea && (
                <Fact label={t("floorAreaLabel")} value={floorArea} emphasis />
              )}
              <Fact
                label={t("familiesLabel")}
                value={detail.families
                  .map((family) => tOptions(`family.${family}`))
                  .join(", ")}
              />
              {detail.completionStandard && (
                <Fact
                  label={t("completionStandardLabel")}
                  value={tProjectRequest(
                    `completionStandard.${detail.completionStandard}`,
                  )}
                />
              )}
            </dl>
          </section>

          {hasSchedule && (
            <section className="flex flex-col gap-brand-3 border-t border-brand-steel pt-brand-4">
              <Heading level="h3">{t("scheduleHeading")}</Heading>
              <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-3 sm:grid-cols-2">
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
                {detail.locationDetail && (
                  <Fact
                    label={t("locationDetailLabel")}
                    value={detail.locationDetail}
                  />
                )}
              </dl>
            </section>
          )}

          {detail.extrasNote && (
            <section className="flex flex-col gap-brand-2 border-t border-brand-steel pt-brand-4">
              <Heading level="h3">{t("extrasNoteLabel")}</Heading>
              <Text measure>{detail.extrasNote}</Text>
            </section>
          )}

          {(attachments.length > 0 || detail.filesChangedAfterOwnQuote) && (
            <div className="border-t border-brand-steel pt-brand-4">
              <InquiryAttachmentsPanel
                kind="request"
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

        <aside className="flex flex-col gap-brand-3 lg:sticky lg:top-brand-3">
          {detail.ownQuoteStatus && (
            <div className="flex flex-wrap items-center gap-brand-2">
              <Text as="span" tone="muted">
                {t("ownQuoteStatusLabel")}
              </Text>
              <StatusPill
                status={
                  ownQuoteStatusTone[detail.ownQuoteStatus] ?? "conditional"
                }
              >
                {ownQuoteStatusLabel[detail.ownQuoteStatus] ??
                  detail.ownQuoteStatus}
              </StatusPill>
            </div>
          )}
          {detail.ownQuotePublished && detail.acceptingQuotes && !isLocked && (
            <Text tone="muted">{t("ownQuotePublishedNote")}</Text>
          )}
          {!showQuoteForm && !isLocked && !detail.ownQuotePublished && (
            <Text tone="muted">
              {t("quotesClosedNote")}
            </Text>
          )}
          {showQuoteForm && (
            <QuoteForm
              projectRequestId={detail.id}
              isRevision={detail.ownQuoteStatus !== null}
            />
          )}
        </aside>
      </div>
    </Stack>
  );
}

function Fact({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
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
