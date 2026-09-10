import { ShieldCheck, Truck, Workflow } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Button, Card, Grid, Heading, Stack, Text } from "@/components/ui";

// Strona główna /producent (spec 0032 AC-10): treść marketingowa z CTA do
// rejestracji/logowania, zastępuje dzisiejszy mockowy formularz NIP. Sesja z
// rolą producer trafiająca tu jest przekierowana prosto do panelu — root
// zostaje wyłącznie dla gości.
export default async function ProducentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Bez tego strona przechodzi na dynamiczne renderowanie mimo istniejącego
  // generateStaticParams w layoucie (next-intl wymaga setRequestLocale w
  // samej stronie, nie tylko w layoucie, żeby wrócić do statycznego
  // renderowania po dodaniu getTranslations, spec 0028, zadanie 4).
  setRequestLocale(locale);
  const [session, t] = await Promise.all([auth(), getTranslations("ProducentPage")]);

  if (session?.user.role === "producer") {
    redirect(`/${locale}/producent/panel`);
  }

  const benefits = [
    { icon: Workflow, title: t("benefitRegistrationTitle"), description: t("benefitRegistrationDescription") },
    { icon: Truck, title: t("benefitInquiriesTitle"), description: t("benefitInquiriesDescription") },
    { icon: ShieldCheck, title: t("benefitStatusTitle"), description: t("benefitStatusDescription") },
  ];

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text variant="bodyL" tone="muted" measure>
          {t("subheading")}
        </Text>
      </Stack>
      <Grid gap={4}>
        <Stack gap={3} className="col-span-12 lg:col-span-7">
          <Heading level="h2">{t("whyHeading")}</Heading>
          {benefits.map((benefit) => (
            <Card key={benefit.title} padding="md">
              <Stack direction="row" gap={3} align="start">
                <benefit.icon
                  className="size-6 shrink-0 text-brand-passage-blue"
                  aria-hidden="true"
                />
                <Stack gap={1}>
                  <Heading level="h3">{benefit.title}</Heading>
                  <Text tone="muted">{benefit.description}</Text>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
        <Card padding="lg" className="col-span-12 lg:col-span-5">
          <Stack gap={4} align="start">
            <Heading level="h2">{t("ctaHeading")}</Heading>
            <Text tone="muted">{t("ctaBody")}</Text>
            <Button as="a" href={`/${locale}/producent/rejestracja`} className="w-fit">
              {t("ctaRegister")}
            </Button>
            <Button
              as="a"
              href={`/${locale}/logowanie?callbackUrl=${encodeURIComponent(`/${locale}/producent/panel`)}`}
              variant="secondary"
              className="w-fit"
            >
              {t("ctaLogin")}
            </Button>
          </Stack>
        </Card>
      </Grid>
    </Stack>
  );
}
