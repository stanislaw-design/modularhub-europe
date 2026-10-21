import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, Heading, Stack, Text } from "@/components/ui";
import { ProducerCertificationsSection } from "@/components/producent/ProducerCertificationsSection";
import { ProducerCompanyForm } from "@/components/producent/ProducerCompanyForm";
import { getProducerCertifications, getProducerIdForUser, getProducerProfile } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

// Ustawienia firmy (spec 0074 AC-11): nazwa i technologia do zmiany formularzem,
// NIP i kraje dostawy tylko do odczytu (kraje zmienia się w Profilu zdolności),
// certyfikaty bez zmian logiki. Status weryfikacji firmy nie jest już pokazywany.
export default async function ProducerSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/producer/panel/settings`;
  const [session, t] = await Promise.all([
    requirePanelProducerSession(locale, selfHref),
    getTranslations("ProducerSettingsPage"),
  ]);

  const producerId = await getProducerIdForUser(session.user.id);
  const profile = producerId ? await getProducerProfile(producerId) : null;
  const certifications = producerId ? await getProducerCertifications(producerId) : [];

  if (!profile) {
    return (
      <Stack gap={4}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text tone="muted">{t("noProfile")}</Text>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level="h1">{t("heading")}</Heading>
      {/* Nullable od spec 0040: konto bez ustawionej technologii zaczyna z pustym wyborem. */}
      <ProducerCompanyForm initialName={profile.name} initialTechnology={profile.technology} />
      <Card padding="lg">
        <Stack gap={3}>
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
            <div className="flex flex-wrap items-center gap-brand-3">
              <Text>
                {profile.deliveryCountries.length > 0
                  ? profile.deliveryCountries.map((country) => country.name).join(", ")
                  : "—"}
              </Text>
              <Link
                href={`/${locale}/producer/panel/capacity`}
                className="focus-ring inline-flex min-h-11 items-center rounded-data font-medium text-brand-passage-blue hover:underline"
              >
                {t("changeCountries")}
              </Link>
            </div>
          </Stack>
        </Stack>
      </Card>
      <ProducerCertificationsSection certifications={certifications} />
    </Stack>
  );
}
