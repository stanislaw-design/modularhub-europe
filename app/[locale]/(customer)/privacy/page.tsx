import { getTranslations } from "next-intl/server";
import { Container, Heading, Stack, Text } from "@/components/ui";

// Tymczasowa strona prywatności (spec 0066 AC-17) na czas wersji testowej.
// Przed publicznym startem treść trzeba zastąpić prawdziwą polityką.
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  const contactEmail = process.env.SUPPORT_REPLY_TO_EMAIL;

  return (
    <Container className="py-brand-6">
      <Stack gap={4} className="mx-auto max-w-2xl">
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text surface="v5" tone="muted">
          {t("testNotice")}
        </Text>
        <Text surface="v5">{t("purpose")}</Text>
        <Text surface="v5">{t("noMarketing")}</Text>
        <Text surface="v5">{t("deletion")}</Text>
        {contactEmail && (
          <Text surface="v5">
            {t("contact")}{" "}
            <a href={`mailto:${contactEmail}`} className="focus-ring underline">
              {contactEmail}
            </a>
          </Text>
        )}
      </Stack>
    </Container>
  );
}
