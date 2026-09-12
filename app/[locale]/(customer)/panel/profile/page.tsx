import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/klient/ProfileForm";
import { Heading, Stack } from "@/components/ui";
import { requirePanelClientSession } from "@/lib/panel-session";

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/panel/profile`;
  const [session, t] = await Promise.all([
    requirePanelClientSession(locale, selfHref),
    getTranslations("KlientPanelProfilPage"),
  ]);

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading")}
      </Heading>
      <ProfileForm
        email={session.user.email ?? ""}
        initialName={session.user.name ?? ""}
        initialPhone={session.user.phone}
      />
    </Stack>
  );
}
