import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { SkipLink } from "@/components/SkipLink";
import { ClientPanelSidebar } from "@/components/klient/ClientPanelSidebar";
import { Container, Stack, ThemeProvider } from "@/components/ui";
import { getClientIdForUser, getUnreadOfferInquiryIds } from "@/lib/db/queries";
import { isTheme, THEME_COOKIE_NAME } from "@/lib/theme";

// Layout panelu klienta /panel/* — boczna kolumna nawigacji zamiast dawnego
// górnego nagłówka (SiteHeader) + paska zakładek (PanelTabs), analogicznie do
// panelu producenta.
export default async function PanelLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Zbiorczy sygnał nieprzeczytane przy "Zapytania" (spec 0033 AC-11): odczyt
  // bez własnego przekierowania, bramka sesji żyje w każdej podstronie osobno.
  const session = await auth();
  const clientId = session?.user.role === "client" ? await getClientIdForUser(session.user.id) : null;
  const hasUnreadOffers = clientId ? (await getUnreadOfferInquiryIds(clientId)).size > 0 : false;

  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialTheme = isTheme(themeCookie) ? themeCookie : null;

  return (
    <ThemeProvider initialTheme={initialTheme} scopeClassName="theme-klient">
      <SkipLink />
      <div className="flex min-h-screen flex-col md:flex-row">
        <ClientPanelSidebar locale={locale} hasUnreadZapytania={hasUnreadOffers} />
        <main id="main-content" className="min-w-0 flex-1">
          <Container className="py-brand-6">
            <Stack gap={4}>{children}</Stack>
          </Container>
        </main>
      </div>
    </ThemeProvider>
  );
}
