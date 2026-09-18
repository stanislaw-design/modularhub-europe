"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { Inbox, LogOut, Menu, Package, User, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LanguageSwitcher, ThemeToggle } from "@/components/ui";
import { signOutAction } from "@/lib/auth-session-actions";

interface ProducerPanelSidebarProps {
  locale: string;
  // Zbiorczy sygnał nieprzeczytane przy "Zapytania" (spec 0033 AC-12).
  hasUnreadZapytania?: boolean;
}

interface PanelNavItem {
  key: string;
  path: string;
  label: string;
  icon: LucideIcon;
}

// Lewa kolumna nawigacji dla /producer/panel/* — zastępuje dawny górny pasek
// (ProducerHeader) i pasek zakładek (ProducerPanelTabs) jednym spójnym
// panelem bocznym, typowym dla ekranów zarządzania (redesign 2026-09-18).
// Poniżej `md` nawigacja chowa się do wysuwanej szuflady (ten sam wzorzec co
// SiteHeader), bo panel bez żadnej nawigacji na telefonie nie działa —
// "bez paska u góry" dotyczyło dawnego pełnego nagłówka + zakładek, nie
// jedynego przełącznika szuflady na najwęższych ekranach.
export function ProducerPanelSidebar({ locale, hasUnreadZapytania }: ProducerPanelSidebarProps) {
  const t = useTranslations("ProducerPanelSidebar");
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems: PanelNavItem[] = [
    { key: "konto", path: "", label: t("konto"), icon: User },
    { key: "produkty", path: "products", label: t("produkty"), icon: Package },
    { key: "zapytania", path: "inquiries", label: t("zapytania"), icon: Inbox },
  ];

  const renderNav = (onNavigate?: () => void) => (
    <nav aria-label={t("navAriaLabel")} className="flex flex-col gap-1">
      {navItems.map((item) => {
        const href = `/${locale}/producer/panel${item.path ? `/${item.path}` : ""}`;
        // /inquiries/[id] jest zagnieżdżoną, dynamiczną podstroną "zapytania"
        // (spec 0033) — startsWith podświetla link też tam.
        const isCurrent = pathname === href || (item.path !== "" && pathname.startsWith(`${href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={href}
            onClick={onNavigate}
            aria-current={isCurrent ? "page" : undefined}
            className={`focus-ring flex items-center gap-2 rounded-data px-brand-2 py-brand-2 text-body font-medium transition-colors ${
              isCurrent
                ? "bg-brand-passage-blue/10 text-brand-foundation-navy"
                : "text-brand-technical-graphite hover:bg-brand-steel/30 hover:text-brand-foundation-navy"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
            {item.key === "zapytania" && hasUnreadZapytania && (
              <span
                className="ml-auto inline-block size-2 shrink-0 rounded-full bg-brand-passage-blue"
                role="img"
                aria-label={t("unreadBadgeLabel")}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = (onNavigate?: () => void) => (
    <div className="flex flex-col gap-brand-3 border-t border-brand-steel pt-brand-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}`}
          onClick={onNavigate}
          className="focus-ring rounded-data text-body font-medium text-brand-technical-graphite hover:text-brand-foundation-navy"
        >
          {t("home")}
        </Link>
        <div className="flex items-center gap-brand-1">
          <ThemeToggle className="text-brand-technical-graphite" />
          <LanguageSwitcher locale={locale} triggerClassName="text-brand-technical-graphite" />
        </div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-technical-graphite transition-colors hover:text-brand-foundation-navy"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t("signOut")}
        </button>
      </form>
    </div>
  );

  return (
    <>
      <aside className="hidden shrink-0 flex-col justify-between gap-brand-4 border-r border-brand-steel p-brand-3 md:flex md:w-64">
        <div className="flex flex-col gap-brand-4">
          <Link href={`/${locale}/producer`} aria-label="ModularHub Europe" className="focus-ring w-fit rounded-data">
            <BrandLogo className="text-[0.72rem]" />
          </Link>
          {renderNav()}
        </div>
        {renderFooter()}
      </aside>

      <div className="flex items-center justify-between border-b border-brand-steel p-brand-2 md:hidden">
        <Link href={`/${locale}/producer`} aria-label="ModularHub Europe" className="focus-ring rounded-data">
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
            className="flex h-full w-full max-w-xs flex-col gap-brand-4 overflow-y-auto bg-brand-warm-white p-brand-4 shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[closed]:-translate-x-full"
          >
            <div className="flex items-center justify-between">
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
