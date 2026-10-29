import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminInviteControls, RestoreAdminControl, RevokeAdminControl } from "@/components/internal/AdminAccountControls";
import { AdminInviteForm } from "@/components/internal/AdminInviteForm";
import { Heading, Stack, Text } from "@/components/ui";
import { getAdminAccounts, getOpenAdminInvites } from "@/lib/admin-accounts";
import { ADMIN_INVITE_MAX_OPEN, ADMIN_INVITE_TTL_DAYS } from "@/lib/admin-invite";

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "Europe/Warsaw" });

// Spec 0077 część D AC-34: konta administratora. Ten sam inline wzorzec sesji co pozostałe ekrany
// /internal (internal/AGENTS.md).
export default async function InternalAdminsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/admins`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const [{ active, blocked }, invites] = await Promise.all([getAdminAccounts(), getOpenAdminInvites()]);
  const openInvites = invites.filter((invite) => !invite.expired).length;

  return (
    <Stack gap={5}>
      <Heading level="h1">Konta administratorów</Heading>
      <Text tone="muted">
        Zaproszona osoba dostaje link logowania na podany adres i po pierwszym logowaniu ma pełny dostęp do panelu. Zaproszenie jest
        ważne {ADMIN_INVITE_TTL_DAYS} dni (sam link z maila wygasa po 24 godzinach, wtedy wystarczy zwykłe logowanie tym adresem albo
        „Wyślij ponownie”). Zapraszaj tylko zaufane osoby: panel nie ma jeszcze dwuskładnikowego logowania. Rola jest jedna na konto,
        więc adres klienta lub producenta nie może zostać adminem.
      </Text>

      <section aria-label="Aktywni administratorzy" className="flex flex-col gap-brand-2">
        <Heading level="h2">Aktywni administratorzy ({active.length})</Heading>
        <ul className="flex flex-col divide-y divide-brand-steel rounded-data border border-brand-steel">
          {active.map((admin) => (
            <li key={admin.id} className="flex flex-wrap items-center justify-between gap-brand-3 px-brand-3 py-brand-2 text-body">
              <span>
                <span className="font-medium">{admin.name || "Bez imienia"}</span>
                {admin.id === session.user.id && <span className="ml-brand-1 text-label text-brand-technical-graphite">(to Ty)</span>}
                <span className="block text-data text-brand-technical-graphite">
                  {admin.email}, od {dateFormat.format(admin.since)}
                </span>
              </span>
              <RevokeAdminControl userId={admin.id} isSelf={admin.id === session.user.id} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Otwarte zaproszenia" className="flex flex-col gap-brand-2">
        <Heading level="h2">
          Otwarte zaproszenia ({openInvites} z {ADMIN_INVITE_MAX_OPEN})
        </Heading>
        {invites.length === 0 ? (
          <Text tone="muted">Nie ma otwartych zaproszeń.</Text>
        ) : (
          <ul className="flex flex-col divide-y divide-brand-steel rounded-data border border-brand-steel">
            {invites.map((invite) => (
              <li key={invite.email} className="flex flex-wrap items-center justify-between gap-brand-3 px-brand-3 py-brand-2 text-body">
                <span>
                  <span className="font-medium">{invite.name}</span>
                  {invite.expired && <span className="ml-brand-1 text-label text-status-blocked">wygasło</span>}
                  <span className="block text-data text-brand-technical-graphite">
                    {invite.email}, wysłano {dateFormat.format(invite.sentAt)}, ważne do {dateFormat.format(invite.validUntil)}
                  </span>
                </span>
                <AdminInviteControls email={invite.email} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Zaproś administratora" className="flex flex-col gap-brand-2">
        <Heading level="h2">Zaproś administratora</Heading>
        <AdminInviteForm />
      </section>

      {blocked.length > 0 && (
        <section aria-label="Administratorzy z odebranym dostępem" className="flex flex-col gap-brand-2">
          <Heading level="h2">Odebrany dostęp ({blocked.length})</Heading>
          <ul className="flex flex-col divide-y divide-brand-steel rounded-data border border-brand-steel">
            {blocked.map((admin) => (
              <li key={admin.id} className="flex flex-wrap items-center justify-between gap-brand-3 px-brand-3 py-brand-2 text-body">
                <span>
                  <span className="font-medium">{admin.name || "Bez imienia"}</span>
                  <span className="block text-data text-brand-technical-graphite">
                    {admin.email}
                    {admin.blockedAt && `, od ${dateFormat.format(admin.blockedAt)}`}
                    {admin.blockedReason && `, powód: ${admin.blockedReason}`}
                  </span>
                </span>
                <RestoreAdminControl userId={admin.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Stack>
  );
}
