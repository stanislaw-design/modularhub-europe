import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { InternalSidebar } from "@/components/internal/InternalSidebar";
import { SkipLink } from "@/components/SkipLink";
import { Container, Stack, ThemeProvider } from "@/components/ui";
import { isTheme, THEME_COOKIE_NAME } from "@/lib/theme";

// Wspólna powłoka dla /internal/* (spec 0055 Build plan zadanie 1): boczna
// nawigacja spinająca dziś rozłączone ekrany panelu, wzorem
// app/[locale]/producer/panel/layout.tsx. Bramka sesji (brak sesji/zła rola)
// żyje w każdej podstronie osobno (patrz internal/products/AGENTS.md), ten
// layout tylko dokłada nawigację i motyw, dokładnie jak u producenta.
export default async function InternalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Trzeci, niezależny zakres trybu ciemnego (spec 0055 AC-3), obok
  // theme-klient (0043) i theme-producer (0046): ten sam mechanizm (cookie,
  // ThemeProvider, klasa CSS), sparametryzowany przez scopeClassName zamiast
  // osobnego providera.
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialTheme = isTheme(themeCookie) ? themeCookie : null;

  return (
    <ThemeProvider initialTheme={initialTheme} scopeClassName="theme-internal">
      <SkipLink />
      <div className="flex min-h-screen flex-col md:flex-row">
        <InternalSidebar locale={locale} />
        <main id="main-content" className="min-w-0 flex-1">
          <Container className="py-brand-6">
            <Stack gap={4}>{children}</Stack>
          </Container>
        </main>
      </div>
    </ThemeProvider>
  );
}
