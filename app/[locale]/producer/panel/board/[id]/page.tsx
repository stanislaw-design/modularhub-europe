import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { InquiryAttachmentsPanel } from "@/components/inquiry-attachments/InquiryAttachmentsPanel";
import { getInquiryAttachmentLabels } from "@/components/inquiry-attachments/getInquiryAttachmentLabels";
import { PlatformVariantsPanel } from "@/components/producent/PlatformVariantsPanel";
import { QuoteFormModal } from "@/components/producent/QuoteFormModal";
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
  const [session, t, tProjectRequest, tOptions, tIntendedUse] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerBoardDetailPage"),
    getTranslations("ProjectRequestFlow"),
    getTranslations("ProjectOptions"),
    getTranslations("IntendedUse"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const volumeStatus = producerId
    ? await getProducerVolumeVerificationStatus(producerId)
    : null;
  const detail = producerId
    ? await getProjectRequestForBoardDetail(id, producerId)
    : null;
  // Spec 0077 AC-9: projekt własny ModularHub omija bramkę weryfikacji wolumenowej
  // (dopasowanie robi wiersz include), zapytania klientów działają jak dawniej.
  if (volumeStatus !== "approved" && !detail?.isPlatformOwned) {
    redirect(`/${locale}/producer/panel/board`);
  }
  if (!detail) {
    notFound();
  }
  const isPlatform = detail.isPlatformOwned;
  const intendedUseText = detail.intendedUse
    ? detail.intendedUse === "seasonal" && detail.intendedUseMonths
      ? tIntendedUse("monthsValue", { months: detail.intendedUseMonths })
      : tIntendedUse(detail.intendedUse === "seasonal" ? "seasonal" : "yearRound")
    : null;
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
    !isPlatform && !isLocked && detail.acceptingQuotes && !detail.ownQuotePublished;
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

      <div className="flex flex-col gap-brand-5">
        <Stack gap={5}>
          <div className="flex flex-col gap-brand-3 sm:flex-row sm:items-start sm:justify-between">
            <Stack gap={2}>
              <Heading level="h1">{isPlatform ? (detail.title ?? t("heading")) : t("heading")}</Heading>
              <div className="flex flex-wrap items-center gap-x-brand-3 gap-y-brand-1">
                {isPlatform ? (
                  <Text as="span" className="font-medium">
                    {`${t("platformBuyerLabel")}: ${t("platformBuyerValue")}`}
                  </Text>
                ) : (
                  <StatusPill
                    status={
                      detail.trustSignal === "complete" ? "approved" : "conditional"
                    }
                  >
                    {`${t("trustSignalLabel")}: ${trustSignalLabel[detail.trustSignal]}`}
                  </StatusPill>
                )}
                <Text as="span" tone="muted">
                  {dateFormatter.format(detail.createdAt)}
                </Text>
              </div>
            </Stack>
            <div className="flex flex-col gap-brand-2 sm:max-w-xs sm:items-end sm:text-right">
            {isPlatform && detail.selectionDone && (
              <StatusPill status={detail.ownQuoteSelected ? "approved" : "conditional"}>
                {detail.ownQuoteSelected ? t("platformSelected") : t("platformSelectionDone")}
              </StatusPill>
            )}
            {!isPlatform && detail.ownQuoteStatus && (
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
            {!isPlatform && !showQuoteForm && !isLocked && !detail.ownQuotePublished && (
              <Text tone="muted">
                {t("quotesClosedNote")}
              </Text>
            )}
            {showQuoteForm && (
              <QuoteFormModal
                projectRequestId={detail.id}
                isRevision={detail.ownQuoteStatus !== null}
              />
            )}
            </div>
          </div>

          {isPlatform && detail.platformContact && (
            <section className="flex flex-col gap-brand-3">
              <Text tone="muted">{t("platformIntro")}</Text>
              <Heading level="h3">{t("platformContactHeading")}</Heading>
              <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-3 sm:grid-cols-2 lg:grid-cols-3">
                <Fact label={t("platformContactName")} value={detail.platformContact.name} />
                <Fact label={t("platformContactEmail")} value={detail.platformContact.email} />
                {detail.platformContact.phone && <Fact label={t("platformContactPhone")} value={detail.platformContact.phone} />}
              </dl>
            </section>
          )}

          <section className="flex flex-col gap-brand-3">
            <Heading level="h3">{t("scopeHeading")}</Heading>
            <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Fact label={t("countryLabel")} value={detail.countryName} />
              {!detail.deliversToCountry && (
                <Text as="p" className="text-status-conditional sm:col-span-full">
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
              {intendedUseText && <Fact label={tIntendedUse("label")} value={intendedUseText} />}
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

          {isPlatform && (
            <PlatformVariantsPanel
              projectRequestId={detail.id}
              variants={detail.ownVariants}
              locale={locale}
              acceptingQuotes={detail.acceptingQuotes}
            />
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
