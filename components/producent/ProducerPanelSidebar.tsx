"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ChevronsLeft, ChevronsRight, ClipboardList, Factory, House, Inbox, LayoutDashboard, LogOut, Menu, Package, Settings, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LanguageSwitcher, ThemeToggle } from "@/components/ui";
import { signOutAction } from "@/lib/auth-session-actions";

export interface ProducerPanelNavCounts {
  // Zapytania czekające na ofertę plus decyzje klienta jeszcze nieobejrzane (spec 0074 AC-2).
  inquiries: number;
  // Otwarte dopasowane ogłoszenia bez własnej wyceny; 0 dla producenta bez zatwierdzonej weryfikacji wolumenowej.
  board: number;
}

interface ProducerPanelSidebarProps {
  locale: string;
  counts?: ProducerPanelNavCounts;
}

const LABEL_FADE = "transition-opacity duration-200 ease-out motion-reduce:transition-none";

interface PanelNavItem {
  key: string;
  // Segment ścieżki pod /producer/panel (pusty = pulpit).
  path: string;
  // Dodatkowe segmenty, na których pozycja też jest aktywna (np. /board-quotes pod "Tablica ogłoszeń").
  alsoActiveOn?: string[];
  label: string;
  icon: LucideIcon;
  badge?: { count: number; ariaLabel: string };
}

interface PanelNavGroup {
  key: string;
  heading?: string;
  items: PanelNavItem[];
}

// Lewa kolumna nawigacji dla /producer/panel/* — zastępuje dawny górny pasek
// (ProducerHeader) i pasek zakładek (ProducerPanelTabs) jednym spójnym
// panelem bocznym, typowym dla ekranów zarządzania (redesign 2026-09-18).
// Spec 0074: pięć pozycji w trzech grupach (Pulpit bez grupy), liczby przy
// "Zapytania" i "Tablica ogłoszeń" zamiast dawnej kropki.
// Poniżej `md` nawigacja chowa się do wysuwanej szuflady (ten sam wzorzec co
// SiteHeader), bo panel bez żadnej nawigacji na telefonie nie działa.
export function ProducerPanelSidebar({ locale, counts }: ProducerPanelSidebarProps) {
  const t = useTranslations("ProducerPanelSidebar");
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Zwijanie dotyczy tylko stałego panelu na desktopie; szuflada mobilna zawsze
  // renderuje pełną wersję. Layout nie remontuje się między podstronami panelu,
  // więc stan przeżywa nawigację.
  const [isCollapsed, setIsCollapsed] = useState(false);

  const inquiriesCount = counts?.inquiries ?? 0;
  const boardCount = counts?.board ?? 0;

  const navGroups: PanelNavGroup[] = [
    { key: "dashboard", items: [{ key: "dashboard", path: "", label: t("dashboard"), icon: LayoutDashboard }] },
    {
      key: "orders",
      heading: t("groupOrders"),
      items: [
        {
          key: "inquiries",
          path: "inquiries",
          alsoActiveOn: ["product-inquiries"],
          label: t("inquiries"),
          icon: Inbox,
          badge: inquiriesCount > 0 ? { count: inquiriesCount, ariaLabel: t("inquiriesBadgeLabel", { count: inquiriesCount }) } : undefined,
        },
        {
          key: "board",
          path: "board",
          alsoActiveOn: ["board-quotes"],
          label: t("board"),
          icon: ClipboardList,
          badge: boardCount > 0 ? { count: boardCount, ariaLabel: t("boardBadgeLabel", { count: boardCount }) } : undefined,
        },
      ],
    },
    {
      key: "offer",
      heading: t("groupOffer"),
      items: [
        { key: "products", path: "products", label: t("products"), icon: Package },
        { key: "capacity", path: "capacity", label: t("capacity"), icon: Factory },
      ],
    },
    {
      key: "company",
      heading: t("groupCompany"),
      items: [{ key: "settings", path: "settings", label: t("settings"), icon: Settings }],
    },
  ];

  const isItemCurrent = (item: PanelNavItem) => {
    const base = `/${locale}/producer/panel`;
    if (item.path === "") return pathname === base;
    return [item.path, ...(item.alsoActiveOn ?? [])].some((segment) => {
      const href = `${base}/${segment}`;
      // /inquiries/[id] i /board/[id] to zagnieżdżone podstrony pozycji — startsWith podświetla link też tam.
      return pathname === href || pathname.startsWith(`${href}/`);
    });
  };

  const renderNav = (onNavigate?: () => void, collapsed = false) => (
    <nav aria-label={t("navAriaLabel")} className="flex flex-col gap-brand-2">
      {navGroups.map((group) => (
        <div key={group.key} className="flex flex-col">
          {group.heading && (
            <p
              className={`px-brand-3 pb-1 pt-brand-2 text-label font-medium uppercase tracking-wide text-brand-technical-graphite ${LABEL_FADE} ${
                collapsed ? "hidden" : "opacity-100"
              }`}
            >
              {group.heading}
            </p>
          )}
          {group.items.map((item) => {
            const href = `/${locale}/producer/panel${item.path ? `/${item.path}` : ""}`;
            const isCurrent = isItemCurrent(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={href}
                onClick={onNavigate}
                aria-current={isCurrent ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`focus-ring relative flex min-h-11 items-center gap-2 px-brand-3 py-brand-2 text-body font-medium transition-colors ${
                  isCurrent
                    ? "bg-brand-passage-blue/10 text-brand-foundation-navy"
                    : "text-brand-technical-graphite hover:bg-brand-steel/30 hover:text-brand-foundation-navy"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className={`overflow-hidden whitespace-nowrap ${LABEL_FADE} ${collapsed ? "opacity-0" : "opacity-100"}`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    role="img"
                    aria-label={item.badge.ariaLabel}
                    className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-passage-blue px-1.5 text-label font-medium leading-5 text-brand-warm-white transition-all duration-300 ${
                      collapsed ? "absolute right-1 top-1" : "ml-auto"
                    }`}
                  >
                    <span aria-hidden="true">{item.badge.count}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const renderFooter = (onNavigate?: () => void, collapsed = false) => (
    <div className="flex flex-col gap-brand-3 border-t border-brand-steel px-brand-3 pt-brand-3">
      <div className={`flex gap-brand-2 ${collapsed ? "flex-col items-center" : "items-center justify-between"}`}>
        <Link
          href={`/${locale}`}
          onClick={onNavigate}
          aria-label={collapsed ? t("home") : undefined}
          title={collapsed ? t("home") : undefined}
          className="focus-ring flex min-h-11 items-center gap-2 rounded-data text-body font-medium text-brand-technical-graphite hover:text-brand-foundation-navy"
        >
          {collapsed && <House className="size-4 shrink-0" aria-hidden="true" />}
          <span className={collapsed ? "sr-only" : undefined}>{t("home")}</span>
        </Link>
        <div className={`flex items-center gap-brand-1 ${collapsed ? "flex-col" : ""}`}>
          <ThemeToggle className="text-brand-technical-graphite" />
          <LanguageSwitcher locale={locale} triggerClassName="min-h-11 text-brand-technical-graphite" />
        </div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          title={collapsed ? t("signOut") : undefined}
          className={`focus-ring flex min-h-11 items-center gap-1 rounded-data text-body font-medium text-brand-technical-graphite transition-colors hover:text-brand-foundation-navy ${
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
        className={`hidden shrink-0 flex-col justify-between gap-brand-4 overflow-x-hidden overflow-y-auto border-r border-brand-steel py-brand-3 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:sticky md:top-0 md:flex md:h-screen md:self-start ${
          isCollapsed ? "md:w-[calc(2*var(--spacing-brand-3)+1rem+1px)]" : "md:w-[17rem]"
        }`}
      >
        <div className="flex flex-col gap-brand-4">
          <div className={`flex min-h-11 items-center justify-between ${isCollapsed ? "px-0" : "px-brand-3"}`}>
            <Link
              href={`/${locale}/producer`}
              aria-label="ModularHub Europe"
              tabIndex={isCollapsed ? -1 : undefined}
              aria-hidden={isCollapsed || undefined}
              className={`focus-ring flex min-h-11 w-fit shrink-0 items-center rounded-data transition-opacity duration-200 ${
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
              className={`focus-ring flex size-11 shrink-0 items-center justify-center rounded-data text-brand-technical-graphite transition-colors hover:bg-brand-steel/30 hover:text-brand-foundation-navy ${
                isCollapsed ? "mx-auto" : "-mr-1.5"
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
        <Link href={`/${locale}/producer`} aria-label="ModularHub Europe" className="focus-ring inline-flex min-h-11 items-center rounded-data">
          <BrandLogo className="text-[0.68rem]" />
        </Link>
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          aria-label={t("openMenu")}
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
              <span className="text-body font-medium text-brand-foundation-navy">{t("menu")}</span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label={t("closeMenu")}
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
