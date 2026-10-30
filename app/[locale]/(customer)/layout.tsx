import type { ReactNode } from "react";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { RouteShell } from "@/components/RouteShell";
import { SkipLink } from "@/components/SkipLink";
import { AccountProvider } from "@/components/klient/AccountProvider";
import { SiteFooter } from "@/components/klient/SiteFooter";
import { SiteHeader } from "@/components/klient/SiteHeader";
import { ThemeProvider } from "@/components/ui";

export default async function KlientLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Spec 0078 AC-5/AC-6: the shell never reads the session or cookies, so it
  // prerenders and ships from the CDN. The account state and the saved theme
  // are settled in the browser (HeaderAccount hook, inline theme script).
  return (
    <ThemeProvider initialTheme={null} themeFromCookieScript scopeClassName="theme-klient">
      <AccountProvider>
        <SkipLink />
        {/* usePathname inside SiteHeader suspends on routes with dynamic params. */}
        <Suspense fallback={<div className="h-[73px]" aria-hidden="true" />}>
          <SiteHeader locale={locale} />
        </Suspense>
        <RouteShell>{children}</RouteShell>
        <SiteFooter locale={locale} contactEmail={process.env.SUPPORT_REPLY_TO_EMAIL || undefined} />
      </AccountProvider>
    </ThemeProvider>
  );
}
