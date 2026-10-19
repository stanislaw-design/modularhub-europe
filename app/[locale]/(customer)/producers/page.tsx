import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProducerShowcaseCard } from "@/components/klient/ProducerShowcaseCard";
import { Heading, Text } from "@/components/ui";
import { getProducers } from "@/lib/data/producers";
import { routing, type Locale } from "@/lib/i18n/routing";
import { sortVerifiedProducers } from "@/lib/verified-producers";

type PageParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProducersPage" });
  const canonicalPath = `/${locale}/producers`;
  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/producers`]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/producers` },
    },
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), url: canonicalPath },
  };
}

// Pełna lista zweryfikowanych producentów, cel przycisku "Zobacz wszystkich
// producentów" ze strony głównej (ta sama selekcja i kolejność, bez limitu).
export default async function ProducersPage({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  const [producers, t] = await Promise.all([
    getProducers(locale as Locale),
    getTranslations({ locale, namespace: "ProducersPage" }),
  ]);
  const verified = sortVerifiedProducers(producers);

  return (
    <div className="full-bleed px-[3%] py-brand-6">
      <div className="mx-auto flex max-w-[2000px] flex-col gap-brand-5">
        <div className="flex flex-col gap-1">
          <Heading level="h1" surface="v5">
            {t("heading")}
          </Heading>
          <Text tone="muted" surface="v5">
            {t("subheading", { count: verified.length })}
          </Text>
        </div>
        {verified.length === 0 ? (
          <Text surface="v5">{t("empty")}</Text>
        ) : (
          <ul className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {verified.map((producer) => (
              <li key={producer.id}>
                <ProducerShowcaseCard producer={producer} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
