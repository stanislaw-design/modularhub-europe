import { ShieldCheck, Truck, Workflow } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegistrationForm } from "@/components/producent/RegistrationForm";
import { Button, Card, Grid, Heading, Stack, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";

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
  const [countries, t] = await Promise.all([getCountries(), getTranslations("ProducentPage")]);

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
        <Stack gap={3} className="col-span-12 lg:col-span-5">
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
          <Button as="a" href={`/${locale}/producent/zapytania`} variant="ghost" className="w-fit">
            {t("existingAccountInquiries")}
          </Button>
          <Button as="a" href={`/${locale}/producent/realizacje`} variant="ghost" className="w-fit">
            {t("existingAccountOrders")}
          </Button>
        </Stack>
        <Card padding="lg" className="col-span-12 lg:col-span-7">
          <Stack gap={4}>
            <Heading level="h2">{t("companyDataHeading")}</Heading>
            <RegistrationForm locale={locale} countries={countries} />
          </Stack>
        </Card>
      </Grid>
    </Stack>
  );
}
