import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MarkOfferViewed } from "@/components/klient/MarkOfferViewed";
import { OfferCard } from "@/components/klient/OfferCard";
import { Heading, Stack, Text } from "@/components/ui";
import { getClientIdForUser, getInquiryDetailForClient } from "@/lib/db/queries";
import { requirePanelClientSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Szczegóły jednego zapytania dla klienta (spec 0033 AC-6, AC-14): wszystkie
// oferty złożone na to zapytanie, od dowolnego producenta.
// getInquiryDetailForClient zwraca null zarówno gdy zapytania nie ma, jak i
// gdy nie należy do tego klienta — obie sytuacje kończą się 404.
export default async function ClientInquiryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const selfHref = `/${locale}/klient/panel/zapytania/${id}`;
  const [session, t] = await Promise.all([
    requirePanelClientSession(locale, selfHref),
    getTranslations("ClientInquiryDetailPage"),
  ]);

  const clientId = await getClientIdForUser(session.user.id);
  const detail = clientId ? await getInquiryDetailForClient(id, clientId) : null;
  if (!detail) {
    notFound();
  }

  const statusLabel: Record<typeof detail.status, string> = {
    open: t("statusOpen"),
    offered: t("statusOffered"),
    closed: t("statusClosed"),
  };

  const visibleOffers = detail.offers.filter((offer) => offer.status !== "superseded");
  const hasUnread = visibleOffers.some((offer) => offer.status === "active" && offer.clientViewedAt === null);

  return (
    <Stack gap={4}>
      {hasUnread && <MarkOfferViewed inquiryId={detail.id} />}
      <Stack gap={1}>
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text tone="muted" surface="v5">
          {detail.productNames.join(", ") || "—"}
        </Text>
        <Text tone="muted" surface="v5">
          {statusLabel[detail.status]} · {dateFormatter.format(detail.receivedAt)}
        </Text>
      </Stack>

      {visibleOffers.length === 0 ? (
        <Text tone="muted" surface="v5">
          {t("emptyMessage")}
        </Text>
      ) : (
        <Stack gap={3}>
          {visibleOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
