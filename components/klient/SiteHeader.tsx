"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { Heart, Menu, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button, Container, LanguageSwitcher, ThemeToggle } from "@/components/ui";

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

export function SiteHeader({ locale, session }: SiteHeaderProps) {
  const t = useTranslations("SiteHeader");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // "Domy" was dropped: it only mirrored the logo (both pointed at the home
  // page), so it added a redundant entry rather than a real destination.
  // "Projekty" and "Jak to działa" (an anchor into the closing CTA's
  // explainer, spec 0014 AC-1, AC-9) are the other two real destinations,
  // each using an absolute path rather than a bare "#…" fragment, because
  // SiteHeader renders on every customer route, not just the home page it's
  // targeting. "Producenci"/"Inspiracje"/"O nas" were dropped (spec 0030
  // AC-3): no page exists behind them yet. The last two mirror
  // BulkOrdersShowcase's two B2B tiles (spec 0038) so the same destinations
  // are reachable from every route, not just the home page section.
  const navItems: NavItem[] = [
    { label: t("nav.projects"), href: `/${locale}/results` },
    { label: t("nav.howItWorks"), href: `/${locale}#jak-to-dziala` },
    { label: t("nav.verifiedManufacturers"), href: `/${locale}/verified-manufacturers` },
    { label: t("nav.producerB2b"), href: `/${locale}/producer/registration` },
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

  // The pill's default job is inviting an anonymous visitor to create any
  // account (spec 0040 AC-1), which stops making sense once that visitor is
  // already signed in as a client, producer, or admin: it takes over their
  // own account link instead, so the row never shows both "Załóż konto" and
  // "Mój profil"/"Panel producenta" at once.
  const cta =
    session?.user.role === "admin"
      ? { label: t("adminPanel"), href: `/${locale}/internal/inquiries`, icon: false }
      : session?.user.role === "client"
        ? { label: t("myProfile"), href: `/${locale}/panel/inquiries`, icon: true }
        : session?.user.role === "producer"
          ? { label: t("producerPanel"), href: `/${locale}/producer/panel`, icon: true }
          : { label: t("start"), href: `/${locale}/registration`, icon: false };

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
          <ThemeToggle className={`hidden sm:flex ${navTextClass}`} />
          <LanguageSwitcher
            locale={locale}
            surface="v5"
            triggerClassName={`hidden disabled:cursor-default disabled:opacity-50 sm:flex ${navTextClass}`}
          />
          {/* Favorites requires a client session (requirePanelClientSession
              redirects anonymous visitors straight to login), so the link is
              pointless chrome for a signed-out visitor rather than a real
              destination. Producers have no favorites of their own either,
              so the link is dropped for that role too. */}
          {session && session.user.role !== "producer" && (
            <Link
              href={`/${locale}/panel/favorites`}
              className={`focus-ring hidden items-center gap-1 rounded-data text-body font-medium sm:flex ${navTextClass}`}
            >
              <Heart className="size-4" aria-hidden="true" />
              {t("favorites")}
            </Link>
          )}
          {!session && (
            <Link
              href={`/${locale}/login`}
              className={`focus-ring hidden items-center gap-1 rounded-data text-body font-medium md:flex ${navTextClass}`}
            >
              <User className="size-4" aria-hidden="true" />
              {t("signIn")}
            </Link>
          )}
          {/* The shared `Button` (not a one-off pill): this is chrome, not a
              marketing module, so it takes the design system's actual
              primary-action shape (`rounded-marketing`) rather than the
              stadium `rounded-v5-pill` reserved for hero/showcase CTAs.
              Hidden below `sm`: on the narrowest phones this button is the
              part that moves into the slide out menu instead (see below),
              which is also what keeps the logo/hamburger fitting at 320px
              without needing this button's width too (spec 0030 AC-1). */}
          <Button as="a" href={cta.href} surface="v5" className="hidden shrink-0 sm:inline-flex">
            {cta.icon && <User className="size-4" aria-hidden="true" />}
            {cta.label}
          </Button>
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
          className="fixed inset-0 bg-brand-v5-night/40 transition-opacity duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex justify-end">
          {/* `ease-[cubic-bezier(...)]` is easeOutQuint (easings.net): a
              weighted deceleration rather than Tailwind's linear-ish default
              `ease-out`, so the drawer settles instead of just stopping. */}
          <DialogPanel
            transition
            className="flex h-full w-full max-w-xs flex-col gap-brand-4 overflow-y-auto bg-brand-v5-surface p-brand-4 shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[closed]:translate-x-full"
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

            {/* The mobile twin of the header row's CTA button, hidden from
                `sm` up since the row shows it there instead (see above);
                same `cta` (label plus href, swapping to "Mój profil"/"Panel
                administratora" for a signed in session) so it never drifts
                out of sync with the row. "Zaloguj się" sits right beside it
                (not buried in the Account section below) since the two are
                the anonymous visitor's actual choice: create an account or
                sign into an existing one. It keeps its own `md:hidden` so
                it's still reachable through the slide-out between `sm` and
                `md`, the range where the header row shows the CTA button but
                not yet its own dedicated sign in link. */}
            <div className="flex flex-wrap items-center gap-brand-1">
              <Button
                as="a"
                href={cta.href}
                onClick={() => setIsMenuOpen(false)}
                surface="v5"
                className="sm:hidden"
              >
                {cta.icon && <User className="size-4" aria-hidden="true" />}
                {cta.label}
              </Button>
              {!session && (
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setIsMenuOpen(false)}
                  className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong md:hidden"
                >
                  <User className="size-4" aria-hidden="true" />
                  {t("signIn")}
                </Link>
              )}
            </div>

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
                AC-4/AC-5) so they're reachable below `sm`, where the header
                row hides them. Sign in moved up next to the CTA button above;
                everything left here (theme, language, and — session
                permitting — favorites) hides itself at `sm` the same as the
                row's own equivalents appear there, so the whole group can
                fold at `sm` too, once nothing inside it would still show. */}
            <div
              className="border-t border-brand-v5-line pt-brand-4 sm:hidden"
              role="group"
              aria-labelledby="site-header-account-heading"
            >
              <h2 id="site-header-account-heading" className="mb-brand-2 text-body font-semibold text-brand-v5-muted">
                {t("account")}
              </h2>
              <ul className="flex flex-col gap-brand-3">
                <li>
                  <div className="flex items-center gap-brand-3">
                    <ThemeToggle className="text-brand-v5-ink hover:text-brand-v5-amber-strong" />
                    <LanguageSwitcher
                      locale={locale}
                      surface="v5"
                      align="start"
                      triggerClassName="inline-flex text-brand-v5-ink hover:text-brand-v5-amber-strong"
                    />
                  </div>
                </li>
                {/* Favorites requires a client session (see the header row's
                    twin above), so it's dropped here too for a signed-out
                    visitor rather than linking to a page that just bounces
                    them to login, and for a producer session, which has no
                    favorites of its own either. No client/admin link here
                    either: the CTA button above already becomes "Mój
                    profil"/"Panel administratora" for those sessions, so
                    repeating it here would always be a duplicate, not just on
                    desktop. */}
                {session && session.user.role !== "producer" && (
                  <li>
                    <Link
                      href={`/${locale}/panel/favorites`}
                      onClick={() => setIsMenuOpen(false)}
                      className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong"
                    >
                      <Heart className="size-4" aria-hidden="true" />
                      {t("favorites")}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </header>
  );
}
