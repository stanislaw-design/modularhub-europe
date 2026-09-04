"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ChevronDown, Heart, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/ui";

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
  href?: string;
}

// "Domy" mirrors the logo (both point at the home page); "Jak to działa" is
// the only other real destination, an anchor into the closing CTA's
// explainer (spec 0014 AC-1, AC-9) — an absolute path (not a bare "#…"
// fragment) because SiteHeader renders on every klient/ page, not just the
// home page it's targeting. The rest are disabled placeholders — no
// catalog/blog/about page exists yet, same pattern as the icon buttons
// below and CategoryFilterBar's placeholder chips on /wyniki.
function mainNavItems(locale: string): NavItem[] {
  return [
    { label: "Domy", href: `/${locale}/klient` },
    { label: "Producenci" },
    { label: "Projekty" },
    { label: "Inspiracje" },
    { label: "Jak to działa", href: `/${locale}/klient#jak-to-dziala` },
    { label: "O nas" },
  ];
}

// How far (px) the visitor scrolls past the top of the home hero before its
// transparent overlay header (see isHomeRoute below) switches to the same
// solid header every other klient/ route always uses.
const HOME_HERO_SCROLL_THRESHOLD = 96;

export function SiteHeader({ locale, session }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = mainNavItems(locale);
  const pathname = usePathname();
  // Only the home route renders Hero's full-bleed photo directly under the
  // header (see Hero.tsx) — every other klient/ route keeps the always-solid
  // sticky header unchanged.
  const isHomeRoute = pathname === `/${locale}/klient`;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHomeRoute) return;
    const onScroll = () => setIsScrolled(window.scrollY > HOME_HERO_SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomeRoute]);

  const isOverlay = isHomeRoute && !isScrolled;
  const navTextClass = isOverlay
    ? "text-brand-v4-surface hover:text-brand-v4-surface/80"
    : "text-brand-v5-ink hover:text-brand-v5-amber-strong";
  // No hover shift (unlike navTextClass) — the logo never changed color on
  // hover, only across the overlay/solid transition.
  const logoTextClass = isOverlay ? "text-brand-v4-surface" : "text-brand-v5-ink";

  return (
    <header
      className={`${isHomeRoute ? "fixed" : "sticky"} inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
        isOverlay
          ? "border-transparent bg-transparent"
          : "border-brand-v5-line bg-brand-v5-surface"
      }`}
    >
      <Container className="flex items-center justify-between gap-brand-4 py-brand-2">
        <Link href={`/${locale}/klient`} className="focus-ring shrink-0 rounded-data">
          {/* Inlined (not a static Image import) so the wordmark/symbol's
              dark shapes can pick up currentColor and cross-fade between
              white (overlay) and ink (solid) with the rest of the nav —
              amber shapes/text stay the fixed brand amber in both states.
              Source: assets/brand/logo/v2/horizontal/logo-horizontal-compact-v2.svg */}
          <svg
            viewBox="0 0 700 116"
            role="img"
            aria-label="ModularHub Europe"
            className={`h-7 w-auto transition-colors duration-300 ${logoTextClass}`}
          >
            <g transform="translate(10 10) scale(.92)">
              <path fill="currentColor" d="M8 30h13l14 15 14-15h13v52H49V49L35 63 21 49v33H8V30Z" />
              <path fill="#FCA311" d="M62 30h13v19h16V30h13v52H91V62H75v20H62V30Z" />
              <path fill="currentColor" d="M14 8h43v12H26v13H14V8Z" />
              <path fill="#FCA311" d="M57 8h17l30 16v14L71 20H57V8Z" />
            </g>
            <text
              x="133"
              y="71"
              fontFamily="Manrope, Avenir Next, Arial, sans-serif"
              fontSize="49"
              fontWeight="700"
              letterSpacing="-1.5"
            >
              <tspan fill="currentColor">Modular</tspan>
              <tspan fill="#FCA311">Hub</tspan>
            </text>
            <text
              x="526"
              y="70"
              fill="currentColor"
              fontFamily="Manrope, Avenir Next, Arial, sans-serif"
              fontSize="16"
              fontWeight="600"
              letterSpacing="5"
            >
              EUROPE
            </text>
          </svg>
        </Link>
        <div className="flex items-center gap-brand-3">
          <button
            type="button"
            disabled
            aria-label="Zmień język"
            className={`hidden items-center gap-1 text-body font-medium disabled:cursor-default disabled:opacity-50 sm:flex ${navTextClass}`}
          >
            PL
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
          <Link
            href={`/${locale}/klient/panel/ulubione`}
            className={`focus-ring hidden items-center gap-1 rounded-data text-body font-medium sm:flex ${navTextClass}`}
          >
            <Heart className="size-4" aria-hidden="true" />
            Ulubione
          </Link>
          {session ? (
            <div className="hidden items-center gap-brand-2 md:flex">
              {session.user.role === "admin" && (
                <Link
                  href={`/${locale}/internal/zapytania`}
                  className={`focus-ring rounded-data text-body font-medium ${navTextClass}`}
                >
                  Panel administratora
                </Link>
              )}
              {session.user.role === "client" && (
                <Link
                  href={`/${locale}/klient/panel/zapytania`}
                  className={`focus-ring flex items-center gap-1 rounded-data text-body font-medium ${navTextClass}`}
                >
                  <User className="size-4" aria-hidden="true" />
                  Mój profil
                </Link>
              )}
            </div>
          ) : (
            <Link
              href={`/${locale}/logowanie`}
              className={`focus-ring hidden items-center gap-1 rounded-data text-body font-medium md:flex ${navTextClass}`}
            >
              <User className="size-4" aria-hidden="true" />
              Zaloguj się
            </Link>
          )}
          <Link
            href={`/${locale}/producent`}
            className="focus-ring rounded-v5-pill bg-brand-v5-amber px-brand-3 py-brand-1 text-body font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong"
          >
            Zacznij
          </Link>
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Otwórz menu"
            aria-haspopup="dialog"
            aria-expanded={isMenuOpen}
            className={`focus-ring flex items-center justify-center rounded-data p-1 hover:opacity-70 ${navTextClass}`}
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
              <span className="text-body font-medium text-brand-v5-ink">Menu</span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Zamknij menu"
                className="focus-ring flex items-center justify-center rounded-data p-1 text-brand-v5-ink hover:opacity-70"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Główna">
              <ul className="flex flex-col gap-brand-3">
                {navItems.map((item) =>
                  item.href ? (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="focus-ring block rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <button
                        type="button"
                        disabled
                        className="text-body font-medium text-brand-v5-muted disabled:cursor-default disabled:opacity-50"
                      >
                        {item.label}
                      </button>
                    </li>
                  )
                )}
              </ul>
            </nav>
          </DialogPanel>
        </div>
      </Dialog>
    </header>
  );
}
