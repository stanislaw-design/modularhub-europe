import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { SkipLink } from "@/components/SkipLink";
import { ProducerPanelSidebar } from "@/components/producent/ProducerPanelSidebar";
import { Container, Stack, ThemeProvider } from "@/components/ui";
import { getProducerIdForUser, getUnreadDecisionInquiryIds } from "@/lib/db/queries";
import { isTheme, THEME_COOKIE_NAME } from "@/lib/theme";

// Layout wspólny dla /producer/panel/* (spec 0032 Build plan zadanie 1):
// kolumna nawigacji po lewej zamiast dawnego górnego nagłówka + paska
// zakładek (redesign 2026-09-18) — typowy układ ekranu zarządzania. Ta gałąź
// nie jest już zagnieżdżona pod app/[locale]/producer/layout.tsx (usunięty),
// więc własny SkipLink + main landmark żyją tutaj, nie w rodzicu; publiczne
// trasy /producer/* mają odtąd własny nagłówek w
// app/[locale]/producer/(public)/layout.tsx. Bramka sesji (brak sesji/zła
// rola) żyje w każdej podstronie osobno przez requirePanelProducerSession
// (lib/panel-session.ts), nie tutaj.
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

  // Tryb ciemny panelu (spec 0046): drugi, niezależny zakres od flow klienta
  // (theme-producer obok theme-klient), reużywający ten sam cookie theme i
  // sparametryzowany ThemeProvider z 0043. Publiczne strony producenta i
  // panel wewnętrzny nigdy nie montują ThemeProvider, więc zostają jasne.
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialTheme = isTheme(themeCookie) ? themeCookie : null;

  return (
    <ThemeProvider initialTheme={initialTheme} scopeClassName="theme-producer">
      <SkipLink />
      <div className="flex min-h-screen flex-col md:flex-row">
        <ProducerPanelSidebar locale={locale} hasUnreadZapytania={hasUnreadDecisions} />
        <main id="main-content" className="min-w-0 flex-1">
          <Container className="py-brand-6">
            <Stack gap={4}>{children}</Stack>
          </Container>
        </main>
      </div>
    </ThemeProvider>
  );
}
