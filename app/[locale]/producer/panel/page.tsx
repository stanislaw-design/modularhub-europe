import { getTranslations } from "next-intl/server";
import { Button, Card, Heading, Stack, Text } from "@/components/ui";
import { getProducerIdForUser, getProducerProfile } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";
import { PRODUCER_TECHNOLOGIES } from "@/lib/producer-technologies";

const verificationStatusKey = {
  not_submitted: "verificationNotSubmitted",
  pending: "verificationPending",
  approved: "verificationApproved",
  rejected: "verificationRejected",
} as const;

// Strona główna panelu producenta (spec 0032 AC-1, AC-2): wyłącznie podgląd
// danych firmy z bazy, żaden formularz edycji w tej funkcji (Follow-up).
export default async function ProducerPanelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/producer/panel`;
  const [session, t] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerPanelPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const profile = producerId ? await getProducerProfile(producerId) : null;

  if (!profile) {
    return (
      <Stack gap={4}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">{t("noProfile")}</Text>
      </Stack>
    );
  }

  const technologyLabel =
    PRODUCER_TECHNOLOGIES.find((technology) => technology.value === profile.technology)?.label ?? profile.technology;

  return (
    <Stack gap={4}>
      <Heading level="h1">{t("heading")}</Heading>
      <Card padding="lg">
        <Stack gap={3}>
          <Stack gap={1}>
            <Text as="span" variant="label" tone="muted">
              {t("companyNameLabel")}
            </Text>
            <Text>{profile.name}</Text>
          </Stack>
          <Stack gap={1}>
            <Text as="span" variant="label" tone="muted">
              NIP
            </Text>
            <Text>{profile.nip}</Text>
          </Stack>
          <Stack gap={1}>
            <Text as="span" variant="label" tone="muted">
              {t("deliveryCountriesLabel")}
            </Text>
            <Text>
              {profile.deliveryCountries.length > 0
                ? profile.deliveryCountries.map((country) => country.name).join(", ")
                : "—"}
            </Text>
          </Stack>
          <Stack gap={1}>
            <Text as="span" variant="label" tone="muted">
              {t("technologyLabel")}
            </Text>
            <Text>{technologyLabel}</Text>
          </Stack>
          <Stack gap={1}>
            <Text as="span" variant="label" tone="muted">
              {t("verificationStatusLabel")}
            </Text>
            <Text>{t(verificationStatusKey[profile.verificationStatus])}</Text>
          </Stack>
        </Stack>
      </Card>
      <Stack gap={2}>
        <Button as="a" href={`/${locale}/producer/panel/inquiries`} size="sm" className="w-fit">
          {t("inquiriesOffers")}
        </Button>
      </Stack>

      <Stack gap={2}>
        <Heading level="h2">{t("demoScreensHeading")}</Heading>
        <Text tone="muted">{t("demoScreensDescription")}</Text>
        <Stack direction="row" gap={2} className="flex-wrap">
          <Button as="a" href={`/${locale}/producer/export-readiness`} variant="secondary" size="sm">
            {t("demoExportReadiness")}
          </Button>
          <Button as="a" href={`/${locale}/producer/company-verification`} variant="secondary" size="sm">
            {t("demoCompanyVerification")}
          </Button>
          <Button as="a" href={`/${locale}/producer/fulfillments`} variant="secondary" size="sm">
            {t("demoFulfillment")}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
