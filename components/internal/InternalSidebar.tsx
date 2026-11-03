"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ChevronsLeft, ChevronsRight, House, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/ui";
import { signOutAction } from "@/lib/auth-session-actions";
import { INTERNAL_NAV, internalHref, resolveCurrent } from "./internal-nav";

interface InternalSidebarProps {
  locale: string;
}

const LABEL_FADE = "transition-opacity duration-200 ease-out motion-reduce:transition-none";

// Lewa kolumna nawigacji dla /internal/* (spec 0055 Build plan zadanie 2),
// wzorem components/producent/ProducerPanelSidebar.tsx (spec 0032/0046), bez
// LanguageSwitcher (panel admina jest dziś wyłącznie po polsku, tak jak
// każdy istniejący ekran /internal/*, patrz internal/products/page.tsx) i
// bez zbiorczego sygnału nieprzeczytane (nie ma go w tej spec). Pozycje i
// podzakładki sekcji definiuje internal-nav.ts, podzakładki rysuje
// InternalSectionTabs w layoucie.
export function InternalSidebar({ locale }: InternalSidebarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Zwijanie dotyczy tylko stałego panelu na desktopie; szuflada mobilna zawsze
  // renderuje pełną wersję. Layout nie remontuje się między podstronami panelu,
  // więc stan przeżywa nawigację.
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Siedem pozycji menu z internal-nav.ts; wejście w sekcję prowadzi do jej
  // pierwszej podzakładki, a podświetla ją każdy ekran należący do sekcji.
  const currentKey = resolveCurrent(pathname, locale)?.section.key;

  const renderNav = (onNavigate?: () => void, collapsed = false) => (
    <nav aria-label="Nawigacja panelu administracyjnego" className="flex flex-col">
      {INTERNAL_NAV.map((item) => {
        const href = internalHref(locale, item.tabs[0].paths[0]);
        const isCurrent = item.key === currentKey;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={href}
            onClick={onNavigate}
            aria-current={isCurrent ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={`focus-ring relative flex items-center gap-2 px-brand-3 py-brand-2 text-body font-medium transition-colors ${
              isCurrent
                ? "bg-brand-passage-blue/10 text-brand-foundation-navy"
                : "text-brand-technical-graphite hover:bg-brand-steel/30 hover:text-brand-foundation-navy"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className={`overflow-hidden whitespace-nowrap ${LABEL_FADE} ${collapsed ? "opacity-0" : "opacity-100"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = (onNavigate?: () => void, collapsed = false) => (
    <div className="flex flex-col gap-brand-3 border-t border-brand-steel px-brand-3 pt-brand-3">
      <div className={`flex gap-brand-2 ${collapsed ? "flex-col items-center" : "items-center justify-between"}`}>
        <Link
          href={`/${locale}`}
          onClick={onNavigate}
          aria-label={collapsed ? "Strona główna" : undefined}
          title={collapsed ? "Strona główna" : undefined}
          className="focus-ring flex items-center gap-2 rounded-data text-body font-medium text-brand-technical-graphite hover:text-brand-foundation-navy"
        >
          {collapsed && <House className="size-4 shrink-0" aria-hidden="true" />}
          <span className={collapsed ? "sr-only" : undefined}>Strona główna</span>
        </Link>
        <ThemeToggle className="text-brand-technical-graphite" />
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          title={collapsed ? "Wyloguj" : undefined}
          className={`focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-technical-graphite transition-colors hover:text-brand-foundation-navy ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          <span className={collapsed ? "sr-only" : undefined}>Wyloguj</span>
        </button>
      </form>
    </div>
  );

  return (
    <>
      <aside
        data-collapsed={isCollapsed}
        className={`hidden shrink-0 flex-col justify-between gap-brand-4 overflow-x-hidden overflow-y-auto border-r border-brand-steel py-brand-3 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:sticky md:top-0 md:flex md:h-screen md:self-start ${
          isCollapsed ? "md:w-[calc(2*var(--spacing-brand-3)+1rem+1px)]" : "md:w-[17rem]"
        }`}
      >
        <div className="flex flex-col gap-brand-4">
          <div className="flex h-8 items-center justify-between px-brand-3">
            <Link
              href={`/${locale}/internal`}
              aria-label="ModularHub Europe"
              tabIndex={isCollapsed ? -1 : undefined}
              aria-hidden={isCollapsed || undefined}
              className={`focus-ring w-fit shrink-0 rounded-data transition-opacity duration-200 ${
                isCollapsed ? "pointer-events-none w-0 overflow-hidden opacity-0" : "opacity-100"
              }`}
            >
              <BrandLogo className="text-[0.72rem]" />
            </Link>
            <button
              type="button"
              onClick={() => setIsCollapsed((v) => !v)}
              aria-label={isCollapsed ? "Rozwiń panel boczny" : "Zwiń panel boczny"}
              aria-expanded={!isCollapsed}
              className={`focus-ring flex size-8 shrink-0 items-center justify-center rounded-data text-brand-technical-graphite transition-colors hover:bg-brand-steel/30 hover:text-brand-foundation-navy ${
                isCollapsed ? "mx-auto" : ""
              }`}
            >
              {isCollapsed ? (
                <ChevronsRight className="size-4" aria-hidden="true" />
              ) : (
                <ChevronsLeft className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {renderNav(undefined, isCollapsed)}
        </div>
        {renderFooter(undefined, isCollapsed)}
      </aside>

      <div className="flex items-center justify-between border-b border-brand-steel p-brand-2 md:hidden">
        <Link href={`/${locale}/internal`} aria-label="ModularHub Europe" className="focus-ring rounded-data">
          <BrandLogo className="text-[0.68rem]" />
        </Link>
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Otwórz menu"
          aria-haspopup="dialog"
          aria-expanded={isMenuOpen}
          className="focus-ring flex size-11 items-center justify-center rounded-data text-brand-foundation-navy hover:opacity-70"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={isMenuOpen} onClose={setIsMenuOpen} className="relative z-50 md:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-brand-foundation-navy/40 transition-opacity duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="flex h-full w-full max-w-xs flex-col gap-brand-4 overflow-y-auto bg-brand-warm-white py-brand-4 shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[closed]:-translate-x-full"
          >
            <div className="flex items-center justify-between px-brand-3">
              <span className="text-body font-medium text-brand-foundation-navy">Menu</span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Zamknij menu"
                className="focus-ring flex items-center justify-center rounded-data p-1 text-brand-foundation-navy hover:opacity-70"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            {renderNav(() => setIsMenuOpen(false))}
            {renderFooter(() => setIsMenuOpen(false))}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
