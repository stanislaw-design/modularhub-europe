import { getTranslations } from "next-intl/server";
import { CapacityProfileForm } from "@/components/producent/CapacityProfileForm";
import { Heading, Stack, Text } from "@/components/ui";
import { getAllCountries, getProducerCapacityProfileForPanel, getProducerIdForUser } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

// Profil zdolności produkcyjnej producenta (spec 0070 część A, AC-5, AC-7):
// formularz z krajami dostawy i wysyłką do weryfikacji wolumenowej. Do tej
// pory profil można było zmienić tylko skryptem, więc to jedyna droga
// producenta do tablicy dużych zamówień.
export default async function ProducerPanelCapacityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const selfHref = `/${locale}/producer/panel/capacity`;
  const [session, t] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerPanelCapacityPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) {
    return (
      <Stack gap={4}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">{t("noProducer")}</Text>
      </Stack>
    );
  }

  const [profile, countries] = await Promise.all([getProducerCapacityProfileForPanel(producerId), getAllCountries()]);

  return (
    <Stack gap={5}>
      <Heading level="h1">{t("heading")}</Heading>
      <Text tone="muted" measure>
        {t("intro")}
      </Text>
      <CapacityProfileForm profile={profile} countries={countries} />
    </Stack>
  );
}
