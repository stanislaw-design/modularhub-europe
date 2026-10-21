import { getTranslations } from "next-intl/server";
import { ProducerProfileChecklist, type ChecklistTask } from "@/components/producent/ProducerProfileChecklist";
import { ProducerReactionList, type ReactionRow } from "@/components/producent/ProducerReactionList";
import { ProducerStatTiles } from "@/components/producent/ProducerStatTiles";
import { Button, Heading, Stack, Text } from "@/components/ui";
import {
  getProducerCertifications,
  getProducerIdForUser,
  getProducerProfile,
  getProducerVolumeVerificationStatus,
  getUnreadDecisionInquiryIds,
} from "@/lib/db/queries";
import { ageInDays } from "@/lib/age-in-days";
import { requirePanelProducerSession } from "@/lib/panel-session";
import {
  getActiveQuotesCount,
  getBoardWithoutQuoteCount,
  getNeedsOfferSummary,
  getProductCompleteness,
  getSentOffersCount,
  summarizeProducts,
} from "@/lib/producer-panel-summary";


// Pulpit producenta (spec 0074 AC-3 do AC-6): to, co wymaga reakcji, trzy
// kafelki i karta "Dokończ profil". Dane firmy przeniosły się do /settings.
// Wszystkie zapytania dostają producerId z sesji (AC-15).
export default async function ProducerPanelPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const selfHref = `/${locale}/producer/panel`;
  const [session, t] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerPanelPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const profile = producerId ? await getProducerProfile(producerId) : null;

  if (!producerId || !profile) {
    return (
      <Stack gap={4}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">{t("noProfile")}</Text>
      </Stack>
    );
  }

  const verification = (await getProducerVolumeVerificationStatus(producerId)) ?? "not_submitted";
  const approved = verification === "approved";

  const [needsOffer, unreadDecisionIds, boardCount, activeQuotes, sentOffers, completeness, certifications] =
    await Promise.all([
      getNeedsOfferSummary(producerId),
      getUnreadDecisionInquiryIds(producerId),
      approved ? getBoardWithoutQuoteCount(producerId) : Promise.resolve(0),
      getActiveQuotesCount(producerId),
      getSentOffersCount(producerId),
      getProductCompleteness(producerId),
      getProducerCertifications(producerId),
    ]);

  const base = `/${locale}/producer/panel`;
  const products = summarizeProducts(completeness);
  const cta = t("reactionCta");

  const rows: ReactionRow[] = [];
  if (needsOffer.count > 0) {
    let detail: string | undefined;
    if (needsOffer.oldestAt) {
      const days = ageInDays(needsOffer.oldestAt);
      detail = days <= 0 ? t("oldestToday") : t("oldestDays", { days });
    }
    rows.push({
      key: "needs-offer",
      tone: "action",
      title: t("needsOfferTitle", { count: needsOffer.count }),
      detail,
      href: `${base}/inquiries?status=needs-offer`,
      cta,
    });
  }
  if (unreadDecisionIds.size > 0) {
    rows.push({
      key: "decision",
      tone: "decision",
      title: t("decisionTitle"),
      detail: t("decisionDetail"),
      href: `${base}/inquiries?status=decision`,
      cta,
    });
  }
  if (approved) {
    if (boardCount > 0) {
      rows.push({
        key: "board",
        tone: "action",
        title: t("boardTitle", { count: boardCount }),
        detail: t("boardDetail"),
        href: `${base}/board`,
        cta,
      });
    }
  } else {
    const capacityTitle = {
      not_submitted: t("capacityNotSubmitted"),
      pending: t("capacityPending"),
      rejected: t("capacityRejected"),
      approved: "",
    }[verification];
    rows.push({ key: "capacity", tone: "warning", title: capacityTitle, href: `${base}/capacity`, cta });
  }

  const tasks: ChecklistTask[] = [
    { key: "company", label: t("taskCompany"), done: profile.technology !== null, href: `${base}/settings` },
    { key: "capacity", label: t("taskCapacity"), done: approved, href: `${base}/capacity` },
    { key: "certificate", label: t("taskCertificate"), done: certifications.length > 0, href: `${base}/settings` },
    { key: "products", label: t("taskProducts"), done: products.incompleteCount === 0, href: `${base}/products` },
  ];
  const doneCount = tasks.filter((task) => task.done).length;

  return (
    <Stack gap={4}>
      <div className="flex flex-wrap items-center justify-between gap-brand-3">
        <Stack gap={1}>
          <Heading level="h1">{t("heading")}</Heading>
          <Text tone="muted">{t("greeting", { company: profile.name })}</Text>
        </Stack>
        <Button as="a" href={`${base}/project`} size="md">
          {t("addProduct")}
        </Button>
      </div>

      <div className="grid items-start gap-brand-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Stack gap={4}>
          <ProducerReactionList heading={t("reactionHeading")} emptyMessage={t("reactionEmpty")} rows={rows} />
          <ProducerStatTiles
            tiles={[
              {
                key: "inquiries",
                label: t("tileInquiries"),
                value: needsOffer.count,
                detail: t("tileInquiriesDetail", { count: sentOffers }),
                href: `${base}/inquiries?status=needs-offer`,
              },
              {
                key: "quotes",
                label: t("tileQuotes"),
                value: activeQuotes,
                detail: t("tileQuotesDetail"),
                href: `${base}/board-quotes`,
              },
              {
                key: "products",
                label: t("tileProducts"),
                value: products.publishedCount,
                detail: products.incompleteCount > 0 ? t("tileProductsDetail", { count: products.incompleteCount }) : undefined,
                href: `${base}/products`,
              },
            ]}
          />
        </Stack>
        <ProducerProfileChecklist
          heading={t("checklistHeading")}
          progressLabel={t("checklistProgress", { done: doneCount, total: tasks.length })}
          tasks={tasks}
        />
      </div>
    </Stack>
  );
}
