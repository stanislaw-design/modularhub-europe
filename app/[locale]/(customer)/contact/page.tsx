import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container, Heading, Stack, Text } from "@/components/ui";
import { routing } from "@/lib/i18n/routing";

type PageParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactPage" });
  const canonicalPath = `/${locale}/contact`;

  // Ten sam wzorzec co project-request (spec 0036 AC-8).
  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/contact`]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/contact` },
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: canonicalPath,
    },
  };
}

// Statyczna strona kontaktu bez formularza (spec 0072 AC-9): nic nie jest
// zapisywane. Bez SUPPORT_REPLY_TO_EMAIL znika tylko blok z adresem.
export default async function ContactPage({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactPage" });
  const contactEmail = process.env.SUPPORT_REPLY_TO_EMAIL;
  const linkClass = "focus-ring rounded-data underline";

  return (
    <Container className="py-brand-6">
      <Stack gap={4} className="mx-auto max-w-2xl">
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text surface="v5">{t("intro")}</Text>
        {contactEmail && (
          <Stack gap={1}>
            <Text surface="v5" tone="muted">
              {t("emailLabel")}
            </Text>
            <Text surface="v5">
              <a href={`mailto:${contactEmail}`} className={`${linkClass} break-all font-medium`}>
                {contactEmail}
              </a>
            </Text>
          </Stack>
        )}
        <Heading level="h2" surface="v5">
          {t("whoHeading")}
        </Heading>
        <Stack gap={1}>
          <Heading level="h3" surface="v5">
            {t("clientHeading")}
          </Heading>
          <Text surface="v5">{t("clientText")}</Text>
        </Stack>
        <Stack gap={1}>
          <Heading level="h3" surface="v5">
            {t("producerHeading")}
          </Heading>
          <Text surface="v5">{t("producerText")}</Text>
          <Link href={`/${locale}/producer/registration`} className={linkClass}>
            {t("producerLink")}
          </Link>
        </Stack>
        <Stack gap={1}>
          <Heading level="h3" surface="v5">
            {t("largeOrderHeading")}
          </Heading>
          <Text surface="v5">{t("largeOrderText")}</Text>
          <Link href={`/${locale}/project-request`} className={linkClass}>
            {t("largeOrderLink")}
          </Link>
        </Stack>
      </Stack>
    </Container>
  );
}
