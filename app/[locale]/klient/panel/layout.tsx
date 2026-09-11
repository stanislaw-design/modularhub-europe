import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { PanelTabs } from "@/components/klient/PanelTabs";
import { Container, Stack } from "@/components/ui";
import { signOutAction } from "@/lib/auth-session-actions";
import { getClientIdForUser, getUnreadOfferInquiryIds } from "@/lib/db/queries";

// Layout wspólny dla /klient/panel/zapytania, /ulubione, /profil (spec 0024
// Decision): pasek zakładek. Bramka sesji (brak sesji/zła rola) żyje w każdej
// z trzech stron przez requirePanelClientSession (lib/panel-session.ts), nie
// tutaj — patrz komentarz w PanelTabs.tsx.
//
// Wylogowanie żyje tutaj, nie w nagłówku wyszukiwarki: właściciel produktu
// uznał "imię — wyloguj" w pasku /wyniki za rozpraszające, panel klienta
// (konto) jest właściwym miejscem na tę akcję (2026-09-03).
export default async function PanelLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Zbiorczy sygnał nieprzeczytane przy "Zapytania" (spec 0033 AC-11):
  // odczyt bez własnego przekierowania (redirect żyje w każdej podstronie
  // osobno, patrz komentarz wyżej) — brak sesji/złej roli po prostu nie
  // pokazuje sygnału, dokładna bramka i tak nastąpi w podstronie.
  const session = await auth();
  const clientId = session?.user.role === "client" ? await getClientIdForUser(session.user.id) : null;
  const hasUnreadOffers = clientId ? (await getUnreadOfferInquiryIds(clientId)).size > 0 : false;

  return (
    <Container className="py-brand-6">
      <Stack gap={4}>
        <div className="flex items-end justify-between gap-brand-2">
          <PanelTabs locale={locale} hasUnreadZapytania={hasUnreadOffers} />
          <form action={signOutAction} className="pb-brand-2">
            <button
              type="submit"
              className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-v5-muted transition-colors hover:text-brand-v5-ink"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Wyloguj
            </button>
          </form>
        </div>
        {children}
      </Stack>
    </Container>
  );
}
