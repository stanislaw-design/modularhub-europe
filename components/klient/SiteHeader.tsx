"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ChevronDown, Heart, Menu, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import logoHorizontalCompactV2 from "@/assets/brand/logo/v2/horizontal/logo-horizontal-compact-v2.svg";
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

export function SiteHeader({ locale, session }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = mainNavItems(locale);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-v5-line bg-brand-v5-surface">
      <Container className="flex items-center justify-between gap-brand-4 py-brand-2">
        <Link href={`/${locale}/klient`} className="focus-ring shrink-0 rounded-data">
          <Image
            src={logoHorizontalCompactV2}
            alt="ModularHub Europe"
            className="h-7 w-auto"
            preload
          />
        </Link>
        <div className="flex items-center gap-brand-3">
          <button
            type="button"
            disabled
            aria-label="Zmień język"
            className="hidden items-center gap-1 text-body font-medium text-brand-v5-ink disabled:cursor-default disabled:opacity-50 sm:flex"
          >
            PL
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
          <Link
            href={`/${locale}/klient/panel/ulubione`}
            className="focus-ring hidden items-center gap-1 rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong sm:flex"
          >
            <Heart className="size-4" aria-hidden="true" />
            Ulubione
          </Link>
          {session ? (
            <div className="hidden items-center gap-brand-2 md:flex">
              {session.user.role === "admin" && (
                <Link
                  href={`/${locale}/internal/zapytania`}
                  className="focus-ring rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong"
                >
                  Panel administratora
                </Link>
              )}
              {session.user.role === "client" && (
                <Link
                  href={`/${locale}/klient/panel/zapytania`}
                  className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong"
                >
                  <User className="size-4" aria-hidden="true" />
                  Mój profil
                </Link>
              )}
            </div>
          ) : (
            <Link
              href={`/${locale}/logowanie`}
              className="focus-ring hidden items-center gap-1 rounded-data text-body font-medium text-brand-v5-ink hover:text-brand-v5-amber-strong md:flex"
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
            className="focus-ring flex items-center justify-center rounded-data p-1 text-brand-v5-ink hover:opacity-70"
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
