"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ChevronsLeft, ChevronsRight, Heart, House, Inbox, LogOut, Menu, User, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LanguageSwitcher, ThemeToggle } from "@/components/ui";
import { signOutAction } from "@/lib/auth-session-actions";

interface ClientPanelSidebarProps {
  locale: string;
  // Zbiorczy sygnał nieprzeczytane przy "Zapytania" (nowe oferty).
  hasUnreadZapytania?: boolean;
}

const LABEL_FADE = "transition-opacity duration-200 ease-out motion-reduce:transition-none";

interface PanelNavItem {
  key: string;
  path: string;
  label: string;
  icon: LucideIcon;
}

// Lewa kolumna nawigacji dla /panel/* klienta — zastępuje dawny górny nagłówek
// (SiteHeader) i pasek zakładek (PanelTabs) jednym spójnym panelem bocznym,
// analogicznie do ProducerPanelSidebar. Poniżej `md` nawigacja chowa się
// do wysuwanej szuflady.
export function ClientPanelSidebar({ locale, hasUnreadZapytania }: ClientPanelSidebarProps) {
  const t = useTranslations("ClientPanelSidebar");
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Zwijanie dotyczy tylko stałego panelu na desktopie; szuflada mobilna zawsze
  // renderuje pełną wersję. Stan przeżywa nawigację w obrębie panelu.
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: PanelNavItem[] = [
    { key: "zapytania", path: "inquiries", label: t("zapytania"), icon: Inbox },
    { key: "ulubione", path: "favorites", label: t("ulubione"), icon: Heart },
    { key: "profil", path: "profile", label: t("profil"), icon: User },
  ];

  const renderNav = (onNavigate?: () => void, collapsed = false) => (
    <nav aria-label={t("navAriaLabel")} className="flex flex-col gap-1">
      {navItems.map((item) => {
        const href = `/${locale}/panel${item.path ? `/${item.path}` : ""}`;
        const isCurrent = pathname === href || (item.path !== "" && pathname.startsWith(`${href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={href}
            onClick={onNavigate}
            aria-current={isCurrent ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={`focus-ring relative flex items-center gap-2 rounded-data px-brand-2 py-brand-2 text-body font-medium transition-colors ${
              isCurrent
                ? "bg-brand-v5-amber-strong/10 text-brand-v5-ink font-semibold"
                : "text-brand-v5-muted hover:bg-brand-v5-line/30 hover:text-brand-v5-ink"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className={`overflow-hidden whitespace-nowrap ${LABEL_FADE} ${collapsed ? "opacity-0" : "opacity-100"}`}>
              {item.label}
            </span>
            {item.key === "zapytania" && hasUnreadZapytania && (
              <span
                className={`inline-block size-2 shrink-0 rounded-full bg-brand-v5-amber-strong transition-all duration-300 ${
                  collapsed ? "absolute right-1 top-1" : "ml-auto"
                }`}
                role="img"
                aria-label={t("unreadBadgeLabel")}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = (onNavigate?: () => void, collapsed = false) => (
    <div className="flex flex-col gap-brand-3 border-t border-brand-v5-line pt-brand-3">
      <div className={`flex gap-brand-2 ${collapsed ? "flex-col items-center" : "items-center justify-between"}`}>
        <Link
          href={`/${locale}`}
          onClick={onNavigate}
          aria-label={collapsed ? t("home") : undefined}
          title={collapsed ? t("home") : undefined}
          className="focus-ring flex items-center gap-2 rounded-data text-body font-medium text-brand-v5-muted hover:text-brand-v5-ink"
        >
          {collapsed && <House className="size-4 shrink-0" aria-hidden="true" />}
          <span className={collapsed ? "sr-only" : undefined}>{t("home")}</span>
        </Link>
        <div className={`flex items-center gap-brand-1 ${collapsed ? "flex-col" : ""}`}>
          <ThemeToggle className="text-brand-v5-muted hover:text-brand-v5-ink" />
          <LanguageSwitcher locale={locale} surface="v5" triggerClassName="text-brand-v5-muted hover:text-brand-v5-ink" />
        </div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          title={collapsed ? t("signOut") : undefined}
          className={`focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-v5-muted transition-colors hover:text-brand-v5-ink ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          <span className={collapsed ? "sr-only" : undefined}>{t("signOut")}</span>
        </button>
      </form>
    </div>
  );

  return (
    <>
      <aside
        data-collapsed={isCollapsed}
        className={`hidden shrink-0 flex-col justify-between gap-brand-4 overflow-x-hidden overflow-y-auto border-r border-brand-v5-line p-brand-3 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:sticky md:top-0 md:flex md:h-screen md:self-start ${
          isCollapsed ? "md:w-[calc(2*(var(--spacing-brand-3)+var(--spacing-brand-2)+0.5rem)+1px)]" : "md:w-64"
        }`}
      >
        <div className="flex flex-col gap-brand-4">
          <div className="flex h-8 items-center justify-between">
            <Link
              href={`/${locale}`}
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
              aria-label={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
              aria-expanded={!isCollapsed}
              className={`focus-ring flex size-8 shrink-0 items-center justify-center rounded-data text-brand-v5-muted transition-colors hover:bg-brand-v5-line/30 hover:text-brand-v5-ink ${
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

      <div className="flex items-center justify-between border-b border-brand-v5-line p-brand-2 md:hidden">
        <Link href={`/${locale}`} aria-label="ModularHub Europe" className="focus-ring rounded-data">
          <BrandLogo className="text-[0.68rem]" />
        </Link>
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          aria-label={t("openMenu")}
          aria-haspopup="dialog"
          aria-expanded={isMenuOpen}
          className="focus-ring flex size-11 items-center justify-center rounded-data text-brand-v5-ink hover:opacity-70"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={isMenuOpen} onClose={setIsMenuOpen} className="relative z-50 md:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-brand-v5-night/40 transition-opacity duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="flex h-full w-full max-w-xs flex-col gap-brand-4 overflow-y-auto bg-brand-v5-surface p-brand-4 shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[closed]:-translate-x-full"
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
            {renderNav(() => setIsMenuOpen(false))}
            {renderFooter(() => setIsMenuOpen(false))}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
