"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { Heart, Menu, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container, LanguageSwitcher } from "@/components/ui";
import { usePathname as useLocalizedPathname, useRouter as useLocalizedRouter } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";

interface SiteHeaderSession {
  user: {
    name?: string | null;
    email?: string | null;
    role: "client" | "producer" | "admin";
  };
}

interface SiteHeaderProps {
  locale: string;
  session: SiteHeaderSession | null;
}

interface NavItem {
  label: string;
  href: string;
}

// How far (px) the visitor scrolls past the top of the home hero before its
// transparent overlay header (see isHomeRoute below) switches to the same
// solid header every other customer route always uses.
const HOME_HERO_SCROLL_THRESHOLD = 96;

// The inline language picker in the slide out menu needs `useSearchParams`,
// which opts a statically rendered page into client rendering unless the
// component calling it sits behind its own Suspense boundary (Next.js
// requirement). That is the same reason components/ui/LanguageSwitcher.tsx
// splits a trigger fallback from the live menu.
function MobileLanguagePickerFallback() {
  const t = useTranslations("LanguageSwitcher");
  return (
    <div className="flex flex-wrap gap-brand-4" aria-hidden="true">
      {routing.locales.map((code) => (
        <span key={code} className="border-b-2 border-transparent pb-0.5 text-body font-medium text-brand-v5-muted opacity-50">
          {t(code)}
        </span>
      ))}
    </div>
  );
}

function MobileLanguagePicker({ locale }: { locale: string }) {
  const t = useTranslations("LanguageSwitcher");
  const pathname = useLocalizedPathname();
  const searchParams = useSearchParams();
  const router = useLocalizedRouter();
  const [isPending, startTransition] = useTransition();

  const query = searchParams.toString();
  const target = query ? `${pathname}?${query}` : pathname;

  function switchTo(nextLocale: Locale) {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(target, { locale: nextLocale });
    });
  }

  return (
    <div className="flex flex-wrap gap-brand-4" role="group" aria-label={t("changeLanguage")}>
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(code)}
          aria-pressed={code === locale}
          className={`focus-ring border-b-2 pb-0.5 text-body font-medium transition-colors disabled:cursor-default disabled:opacity-50 ${
            code === locale
              ? "border-brand-v5-amber-strong text-brand-v5-ink"
              : "border-transparent text-brand-v5-muted hover:text-brand-v5-ink"
          }`}
        >
          {t(code)}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader({ locale, session }: SiteHeaderProps) {
  const t = useTranslations("SiteHeader");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // "Domy" mirrors the logo (both point at the home page). "Projekty" and
  // "Jak to działa" (an anchor into the closing CTA's explainer, spec 0014
  // AC-1, AC-9) are the other two real destinations, each using an absolute
  // path rather than a bare "#…" fragment, because SiteHeader renders on
  // every customer route, not just the home page it's targeting.
  // "Producenci"/"Inspiracje"/"O nas" were dropped (spec 0030 AC-3): no page
  // exists behind them yet.
  const navItems: NavItem[] = [
    { label: t("nav.homes"), href: `/${locale}` },
    { label: t("nav.projects"), href: `/${locale}/results` },
    { label: t("nav.howItWorks"), href: `/${locale}#jak-to-dziala` },
  ];
  const pathname = usePathname();
  // Only the home route renders Hero's full-bleed photo directly under the
  // header (see Hero.tsx) — every other customer route keeps the always-solid
  // sticky header unchanged.
  const isHomeRoute = pathname === `/${locale}`;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHomeRoute) return;
    const onScroll = () => setIsScrolled(window.scrollY > HOME_HERO_SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomeRoute]);

  // The pill's default job is inviting an anonymous visitor to become a
  // producer, which stops making sense once that visitor is already signed
  // in as a client or admin: it takes over their own account link instead,
  // so the row never shows both "Zacznij" and "Mój profil" at once. A
  // producer session falls through to the anonymous default (no dedicated
  // spot for it here yet, same known gap as everywhere else in this file).
  const cta =
    session?.user.role === "admin"
      ? { label: t("adminPanel"), href: `/${locale}/internal/inquiries`, icon: false }
      : session?.user.role === "client"
        ? { label: t("myProfile"), href: `/${locale}/panel/inquiries`, icon: true }
        : { label: t("start"), href: `/${locale}/producer`, icon: false };

  const isOverlay = isHomeRoute && !isScrolled;
  const navTextClass = isOverlay
    ? "text-brand-v4-surface hover:text-brand-v4-surface/80"
    : "text-brand-v5-ink hover:text-brand-v5-amber-strong";
  return (
    <header
      className={`${isHomeRoute ? "fixed" : "sticky"} inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
        isOverlay
          ? "border-transparent bg-transparent"
          : "border-brand-v5-line bg-brand-v5-surface"
      }`}
    >
      <Container className="flex items-center justify-between gap-brand-1 py-brand-2 sm:gap-brand-4">
        <Link
          href={`/${locale}`}
          aria-label="ModularHub Europe"
          className="focus-ring shrink-0 rounded-data"
        >
          <BrandLogo
            tone={isOverlay ? "light" : "dark"}
            className="text-[0.55rem] transition-colors duration-300 sm:text-[0.72rem]"
          />
        </Link>
        <div className="flex items-center gap-brand-1 sm:gap-brand-3">
          <LanguageSwitcher
            locale={locale}
            surface="v5"
            triggerClassName={`hidden disabled:cursor-default disabled:opacity-50 sm:flex ${navTextClass}`}
          />
          <Link
            href={`/${locale}/panel/favorites`}
            className={`focus-ring hidden items-center gap-1 rounded-data text-body font-medium sm:flex ${navTextClass}`}
          >
            <Heart className="size-4" aria-hidden="true" />
            {t("favorites")}
          </Link>
          {!session && (
            <Link
              href={`/${locale}/login`}
              className={`focus-ring hidden items-center gap-1 rounded-data text-body font-medium md:flex ${navTextClass}`}
            >
              <User className="size-4" aria-hidden="true" />
              {t("signIn")}
            </Link>
          )}
          {/* Hidden below `sm`: on the narrowest phones this pill is the
              part that moves into the slide out menu instead (see below),
              which is also what keeps the logo/hamburger fitting at 320px
              without needing this pill's width too (spec 0030 AC-1). */}
          <Link
            href={cta.href}
            className="focus-ring hidden shrink-0 items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-3 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong sm:inline-flex"
          >
            {cta.icon && <User className="size-4" aria-hidden="true" />}
            {cta.label}
          </Link>
          {/* Fixed 44×44 touch target (spec 0030 AC-1) plus `shrink-0` so the
              hamburger is never the first thing to give up space when the
              row runs tight. The fix is shrinking the logo, the gaps, and
              the "Zacznij" padding around it, not this button. */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label={t("openMenu")}
            aria-haspopup="dialog"
            aria-expanded={isMenuOpen}
            className={`focus-ring flex size-11 shrink-0 items-center justify-center rounded-data hover:opacity-70 ${navTextClass}`}
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>
      </Container>

      <Dialog open={isMenuOpen} onClose={setIsMenuOpen} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-brand-v5-ink/40 transition duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex justify-end">
          <DialogPanel
            transition
            className="flex h-full w-full max-w-xs flex-col gap-brand-4 overflow-y-auto bg-brand-v5-surface p-brand-4 shadow-xl transition duration-200 ease-out data-[closed]:translate-x-full"
          >
            <div className="flex items-center justify-between">
              <span className="text-body font-medium text-brand-v5-ink">{t("menu")}</span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label={t("closeMenu")}
                className="focus-ring flex items-center justify-center rounded-data p-1 text-brand-v5-ink hover:opacity-70"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>

            {/* The mobile twin of the header row's CTA pill, hidden from
                `sm` up since the row shows it there instead (see above);
                same `cta` (label plus href, swapping to "Mój profil"/"Panel
                administratora" for a signed in session) so it never drifts
                out of sync with the row. */}
            <Link
              href={cta.href}
              onClick={() => setIsMenuOpen(false)}
              className="focus-ring flex items-center justify-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-3 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong sm:hidden"
            >
              {cta.icon && <User className="size-4" aria-hidden="true" />}
              {cta.label}
            </Link>

            <nav aria-label={t("mainNav")}>
              <h2 className="mb-brand-2 text-body font-semibold text-brand-v5-muted">{t("mainNav")}</h2>
              <ul className="flex flex-col gap-brand-3">
                {navItems.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="focus-ring block rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Account actions, dropped into the slide out menu (spec 0030
                AC-4/AC-5) so they're reachable below `sm`/`md`, where the
                header row hides them. Each item hides itself at the same
                breakpoint its header row twin appears at (Favorites and the
                language buttons from `sm`, sign in from `md`; profile and
                admin panel live only in the CTA pill above, never here), so
                nothing here duplicates what the row already shows; the
                whole group hides at `md` once every item inside it would
                otherwise be empty. */}
            <div
              className="border-t border-brand-v5-line pt-brand-4 md:hidden"
              role="group"
              aria-labelledby="site-header-account-heading"
            >
              <h2 id="site-header-account-heading" className="mb-brand-2 text-body font-semibold text-brand-v5-muted">
                {t("account")}
              </h2>
              <ul className="flex flex-col gap-brand-3">
                <li className="sm:hidden">
                  <Link
                    href={`/${locale}/panel/favorites`}
                    onClick={() => setIsMenuOpen(false)}
                    className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong"
                  >
                    <Heart className="size-4" aria-hidden="true" />
                    {t("favorites")}
                  </Link>
                </li>
                {/* No client/admin link here: the header row's CTA pill
                    already becomes "Mój profil"/"Panel administratora" for
                    those sessions, at every width, so repeating it here
                    would always be a duplicate, not just on desktop. Sign in
                    still belongs here below `md`, since the pill only
                    replaces itself for an existing session; an anonymous
                    visitor's pill stays "Zacznij". */}
                {!session && (
                  <li>
                    <Link
                      href={`/${locale}/login`}
                      onClick={() => setIsMenuOpen(false)}
                      className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong"
                    >
                      <User className="size-4" aria-hidden="true" />
                      {t("signIn")}
                    </Link>
                  </li>
                )}
                <li className="sm:hidden">
                  <Suspense fallback={<MobileLanguagePickerFallback />}>
                    <MobileLanguagePicker locale={locale} />
                  </Suspense>
                </li>
              </ul>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </header>
  );
}
