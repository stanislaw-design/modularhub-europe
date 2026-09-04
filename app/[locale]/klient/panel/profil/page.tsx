import { ProfileForm } from "@/components/klient/ProfileForm";
import { Heading, Stack } from "@/components/ui";
import { requirePanelClientSession } from "@/lib/panel-session";

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/klient/panel/profil`;
  const session = await requirePanelClientSession(locale, selfHref);

  return (
    <Stack gap={4}>
      <Heading level="h1">Profil</Heading>
      <ProfileForm
        email={session.user.email ?? ""}
        initialName={session.user.name ?? ""}
        initialPhone={session.user.phone}
      />
    </Stack>
  );
}
