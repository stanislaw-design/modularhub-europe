import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { QuoteForm } from "@/components/producent/QuoteForm";
import { Button, Heading, Stack, Text } from "@/components/ui";
import { getProducerIdForUser, getProducerVolumeVerificationStatus, getProjectRequestForBoardDetail } from "@/lib/db/queries";
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
  const volumeStatus = producerId ? await getProducerVolumeVerificationStatus(producerId) : null;
  if (volumeStatus !== "approved") {
    redirect(`/${locale}/producer/panel/board`);
  }
  const detail = producerId ? await getProjectRequestForBoardDetail(id, producerId) : null;
  if (!detail) {
    notFound();
  }

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

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">
          {t("trustSignalLabel")}: {trustSignalLabel[detail.trustSignal]}
        </Text>
      </Stack>

      <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
        <Stack gap={1}>
          <Text variant="label" tone="muted">
            {t("countryLabel")}
          </Text>
          <Text>{detail.countryName}</Text>
        </Stack>
        <Stack gap={1}>
          <Text variant="label" tone="muted">
            {t("projectTypeLabel")}
          </Text>
          <Text>{tProjectRequest(`projectType.${detail.projectType}`)}</Text>
        </Stack>
        <Stack gap={1}>
          <Text variant="label" tone="muted">
            {t("familiesLabel")}
          </Text>
          <Text>{detail.families.map((family) => tOptions(`family.${family}`)).join(", ")}</Text>
        </Stack>
        <Stack gap={1}>
          <Text variant="label" tone="muted">
            {t("unitCountLabel")}
          </Text>
          <Text>
            {detail.unitCountMin}
            {detail.unitCountMax ? `–${detail.unitCountMax}` : "+"}
          </Text>
        </Stack>
        {(detail.floorAreaM2Min || detail.floorAreaM2Max) && (
          <Stack gap={1}>
            <Text variant="label" tone="muted">
              {t("floorAreaLabel")}
            </Text>
            <Text>
              {detail.floorAreaM2Min ?? "—"}
              {detail.floorAreaM2Max ? `–${detail.floorAreaM2Max}` : ""}
            </Text>
          </Stack>
        )}
        {detail.completionStandard && (
          <Stack gap={1}>
            <Text variant="label" tone="muted">
              {t("completionStandardLabel")}
            </Text>
            <Text>{tProjectRequest(`completionStandard.${detail.completionStandard}`)}</Text>
          </Stack>
        )}
        {(detail.startWindowFrom || detail.startWindowTo) && (
          <Stack gap={1}>
            <Text variant="label" tone="muted">
              {t("startWindowLabel")}
            </Text>
            <Text>
              {detail.startWindowFrom ?? "—"} – {detail.startWindowTo ?? "—"}
            </Text>
          </Stack>
        )}
        {(detail.deliveryWindowFrom || detail.deliveryWindowTo) && (
          <Stack gap={1}>
            <Text variant="label" tone="muted">
              {t("deliveryWindowLabel")}
            </Text>
            <Text>
              {detail.deliveryWindowFrom ?? "—"} – {detail.deliveryWindowTo ?? "—"}
            </Text>
          </Stack>
        )}
        {detail.locationDetail && (
          <Stack gap={1}>
            <Text variant="label" tone="muted">
              {t("locationDetailLabel")}
            </Text>
            <Text>{detail.locationDetail}</Text>
          </Stack>
        )}
      </div>

      {detail.extrasNote && (
        <Stack gap={1}>
          <Text variant="label" tone="muted">
            {t("extrasNoteLabel")}
          </Text>
          <Text measure>{detail.extrasNote}</Text>
        </Stack>
      )}

      <Text tone="muted" variant="label">
        {dateFormatter.format(detail.createdAt)}
      </Text>

      {detail.ownQuoteStatus && (
        <Text className="font-medium">
          {t("ownQuoteStatusLabel")}: {ownQuoteStatusLabel[detail.ownQuoteStatus] ?? detail.ownQuoteStatus}
        </Text>
      )}

      {!isLocked && <QuoteForm projectRequestId={detail.id} isRevision={detail.ownQuoteStatus !== null} />}

      <Button as="a" href={`/${locale}/producer/panel/board`} variant="secondary" className="w-fit">
        {t("backToBoard")}
      </Button>
    </Stack>
  );
}
