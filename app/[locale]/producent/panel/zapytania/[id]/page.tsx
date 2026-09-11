import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MarkOfferDecisionViewed } from "@/components/producent/MarkOfferDecisionViewed";
import { OfferForm } from "@/components/producent/OfferForm";
import { Button, Card, DataText, Heading, Stack, Text } from "@/components/ui";
import { getInquiryDetailForProducer, getProducerIdForUser } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Szczegóły jednego zapytania dla producenta (spec 0033 AC-1, AC-13):
// wyłącznie własne pozycje tego producenta w tym zapytaniu, dane kontaktowe
// klienta, formularz oferty. getInquiryDetailForProducer zwraca null zarówno
// gdy zapytania nie ma, jak i gdy producent nie ma w nim żadnego produktu —
// obie sytuacje kończą się tym samym 404.
export default async function ProducerInquiryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const selfHref = `/${locale}/producent/panel/zapytania/${id}`;
  const [session, t] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerInquiryDetailPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const detail = producerId ? await getInquiryDetailForProducer(id, producerId) : null;
  if (!detail) {
    notFound();
  }

  const statusLabel: Record<typeof detail.status, string> = {
    open: t("statusOpen"),
    offered: t("statusOffered"),
    closed: t("statusClosed"),
  };

  const offerStatusLabel: Record<string, string> = {
    active: t("offerStatusActive"),
    accepted: t("offerStatusAccepted"),
    rejected: t("offerStatusRejected"),
    superseded: t("offerStatusSuperseded"),
  };

  const activeOffer = detail.offers.find((offer) => offer.status === "active" || offer.status === "accepted");
  const decidedOffers = detail.offers.filter((offer) => offer.status === "accepted" || offer.status === "rejected");
  const isLocked = detail.offers.some((offer) => offer.status === "accepted");

  return (
    <Stack gap={4}>
      {decidedOffers.length > 0 && <MarkOfferDecisionViewed inquiryId={detail.id} />}
      <Stack gap={1}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">
          {detail.name} · {detail.email} · {detail.phone}
        </Text>
        <Text tone="muted">
          {t("deliveryCountryLabel")}: {detail.deliveryCountryCode} · {statusLabel[detail.status]} ·{" "}
          {dateFormatter.format(detail.receivedAt)}
        </Text>
      </Stack>

      <Stack gap={2}>
        <Heading level="h2">{t("productsHeading")}</Heading>
        <ul className="flex flex-col gap-1">
          {detail.items.map((item) => (
            <li key={item.productId}>
              <Text>
                {item.productName}
                {!item.available && (
                  <Text as="span" tone="muted" className="ml-2 text-status-conditional">
                    {t("productUnavailable")}
                  </Text>
                )}
              </Text>
            </li>
          ))}
        </ul>
      </Stack>

      {detail.offers.length > 0 && (
        <Stack gap={2}>
          <Heading level="h2">{t("historyHeading")}</Heading>
          <div className="overflow-x-auto rounded-data border border-brand-steel">
            <table className="w-full min-w-[36rem] border-collapse text-body">
              <thead>
                <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
                  <Text as="th" className="p-brand-2 font-medium">
                    {t("columnStatus")}
                  </Text>
                  <Text as="th" className="p-brand-2 font-medium">
                    {t("columnTotal")}
                  </Text>
                  <Text as="th" className="p-brand-2 font-medium">
                    {t("columnDate")}
                  </Text>
                </tr>
              </thead>
              <tbody>
                {detail.offers.map((offer) => {
                  const total =
                    offer.items.reduce((sum, item) => sum + item.housePriceCents, 0) +
                    offer.transportPriceCents +
                    offer.installationPriceCents;
                  return (
                    <tr key={offer.id} className="border-b border-brand-steel/50 align-top last:border-b-0">
                      <Text as="td" className="p-brand-2">
                        {offerStatusLabel[offer.status]}
                      </Text>
                      <Text as="td" className="p-brand-2">
                        <DataText>{priceFormatter.format(total / 100)} €</DataText>
                      </Text>
                      <Text as="td" className="p-brand-2">
                        {dateFormatter.format(offer.submittedAt)}
                      </Text>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Stack>
      )}

      {isLocked ? (
        <Card as="div" padding="md">
          <Text className="font-medium text-status-approved">{t("lockedMessage")}</Text>
        </Card>
      ) : (
        <OfferForm
          inquiryId={detail.id}
          products={detail.items.map((item) => {
            const activeItem = activeOffer?.items.find((offerItem) => offerItem.productId === item.productId);
            return {
              productId: item.productId,
              productName: item.productName,
              available: item.available,
              defaultHousePriceEur: activeItem ? activeItem.housePriceCents / 100 : 0,
            };
          })}
          initialTransportPriceEur={activeOffer ? activeOffer.transportPriceCents / 100 : 0}
          initialInstallationPriceEur={activeOffer ? activeOffer.installationPriceCents / 100 : 0}
          isRevision={activeOffer !== undefined}
        />
      )}

      <Button as="a" href={`/${locale}/producent/panel/zapytania`} variant="secondary" className="w-fit">
        {t("backToInquiries")}
      </Button>
    </Stack>
  );
}
