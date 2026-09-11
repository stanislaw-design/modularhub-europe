import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { ProducerPanelTabs } from "@/components/producent/ProducerPanelTabs";
import { Container, Stack } from "@/components/ui";
import { signOutAction } from "@/lib/auth-session-actions";
import { getProducerIdForUser, getUnreadDecisionInquiryIds } from "@/lib/db/queries";

// Layout wspólny dla /producent/panel/* (spec 0032 Build plan zadanie 1),
// mirror app/[locale]/klient/panel/layout.tsx: pasek zakładek. Bramka sesji
// (brak sesji/zła rola) żyje w każdej podstronie osobno przez
// requirePanelProducerSession (lib/panel-session.ts), nie tutaj — żaden z
// trzech segmentów nie jest dynamiczny, więc layout sam nie zna, dokąd
// przekierować po zalogowaniu.
export default async function ProducerPanelLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Zbiorczy sygnał nieprzeczytane przy "Zapytania" (spec 0033 AC-12): odczyt
  // bez własnego przekierowania, bramka sesji żyje w każdej podstronie osobno.
  const session = await auth();
  const producerId = session?.user.role === "producer" ? await getProducerIdForUser(session.user.id) : null;
  const hasUnreadDecisions = producerId ? (await getUnreadDecisionInquiryIds(producerId)).size > 0 : false;

  return (
    <Container className="py-brand-6">
      <Stack gap={4}>
        <div className="flex items-end justify-between gap-brand-2">
          <ProducerPanelTabs locale={locale} hasUnreadZapytania={hasUnreadDecisions} />
          <form action={signOutAction} className="pb-brand-2">
            <button
              type="submit"
              className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-technical-graphite transition-colors hover:text-brand-foundation-navy"
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
