import { ArrowRight, Factory, Home, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, Heading, Stack, Text } from "@/components/ui";

interface RegistrationRoleStepProps {
  locale: string;
  callbackUrl?: string;
}

// Krok 1 wspólnego wizarda rejestracji (spec 0040 AC-4): zawsze pokazuje oba
// wybory, niezależnie od callbackUrl, bez żadnego kontekstowego ukrywania.
// Karty i odznaka ikony powtarzają idiom już użyty w HowItWorksExplainer
// (spec 0015), żeby ten sam wybór wizualny obowiązywał w całej witrynie.
export async function RegistrationRoleStep({ locale, callbackUrl }: RegistrationRoleStepProps) {
  const t = await getTranslations("RegistrationRoleStep");
  const callbackQuery = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : "";

  const roles: { role: "client" | "producer"; icon: LucideIcon; heading: string; description: string }[] = [
    { role: "client", icon: Home, heading: t("clientHeading"), description: t("clientDescription") },
    { role: "producer", icon: Factory, heading: t("producerHeading"), description: t("producerDescription") },
  ];

  const loginHref = `/${locale}/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <span className="text-label font-semibold text-brand-v5-amber-strong">{t("eyebrow")}</span>
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text tone="muted" surface="v5" className="text-body-l">
          {t("intro")}
        </Text>
      </Stack>
      <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
        {roles.map(({ role, icon: Icon, heading, description }) => (
          <Link
            key={role}
            href={`/${locale}/registration?role=${role}${callbackQuery}`}
            className="focus-ring group block rounded-v5-card"
          >
            <Card
              surface="v5"
              padding="lg"
              className="flex h-full flex-col gap-brand-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand-v5-amber hover:shadow-lg"
            >
              <span className="flex size-12 items-center justify-center self-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground transition-transform duration-300 group-hover:scale-110">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <Stack gap={1} className="flex-1">
                <Heading level="h2" surface="v5">
                  {heading}
                </Heading>
                <Text tone="muted" surface="v5">
                  {description}
                </Text>
              </Stack>
              <span className="flex items-center gap-1 text-data font-semibold text-brand-v5-ink">
                {t("selectCta")}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
      <Text tone="muted" surface="v5">
        {t("alreadyHaveAccount")}{" "}
        <Link href={loginHref} className="focus-ring rounded-data font-medium text-brand-v5-ink underline">
          {t("loginLink")}
        </Link>
      </Text>
    </Stack>
  );
}
