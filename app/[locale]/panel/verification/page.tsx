import { getTranslations } from "next-intl/server";
import { ClientB2bDetailsForm } from "@/components/klient/ClientB2bDetailsForm";
import { Heading, Stack } from "@/components/ui";
import { getClientB2bDetails } from "@/lib/db/queries";
import { requirePanelClientSession } from "@/lib/panel-session";

// Weryfikacja konta (spec 0070 część A, AC-6): NIP lub numer VAT UE i nazwa
// firmy, wcześniej sekcja w /panel/profile. Osobna pozycja w menu, bo bez
// zatwierdzonej weryfikacji B2B klient nie dostanie połączenia z producentem.
export default async function PanelVerificationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const selfHref = `/${locale}/panel/verification`;
  const [session, t] = await Promise.all([
    requirePanelClientSession(locale, selfHref),
    getTranslations("KlientPanelWeryfikacjaPage"),
  ]);

  const b2b = await getClientB2bDetails(session.user.id);

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading")}
      </Heading>
      <ClientB2bDetailsForm
        initialNip={b2b?.nip ?? ""}
        initialCompanyName={b2b?.companyName ?? ""}
        status={b2b?.status ?? "not_submitted"}
      />
    </Stack>
  );
}
