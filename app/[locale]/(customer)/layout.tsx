import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { RouteShell } from "@/components/RouteShell";
import { SkipLink } from "@/components/SkipLink";
import { SiteHeader } from "@/components/klient/SiteHeader";
import { ThemeProvider } from "@/components/ui";
import { isTheme, THEME_COOKIE_NAME } from "@/lib/theme";

export default async function KlientLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialTheme = isTheme(themeCookie) ? themeCookie : null;

  return (
    <ThemeProvider initialTheme={initialTheme} scopeClassName="theme-klient">
      <SkipLink />
      <SiteHeader locale={locale} session={session} />
      <RouteShell>{children}</RouteShell>
    </ThemeProvider>
  );
}
