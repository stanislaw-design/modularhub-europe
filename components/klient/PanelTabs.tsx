"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface PanelTabsProps {
  locale: string;
  // Zbiorczy sygnał nieprzeczytane przy "Zapytania" (spec 0033 AC-11).
  hasUnreadZapytania?: boolean;
}

// Pasek zakładek wspólny dla /klient/panel/* (spec 0024 Decision). Klient
// komponent, żeby móc podświetlić aktywną zakładkę przez usePathname() — layout
// serwerowy nadrzędny nie zna dokładnej podstrony, którą renderuje, bo żadna z
// trzech tras nie ma dynamicznego segmentu.
export function PanelTabs({ locale, hasUnreadZapytania }: PanelTabsProps) {
  const t = useTranslations("PanelTabs");
  const pathname = usePathname();
  const panelTabs: { segment: "zapytania" | "ulubione" | "profil"; label: string }[] = [
    { segment: "zapytania", label: t("zapytania") },
    { segment: "ulubione", label: t("ulubione") },
    { segment: "profil", label: t("profil") },
  ];

  return (
    <nav aria-label={t("navAriaLabel")} className="flex gap-brand-2 border-b border-brand-v5-line">
      {panelTabs.map((tab) => {
        const href = `/${locale}/klient/panel/${tab.segment}`;
        // /zapytania/[id] jest zagnieżdżoną, dynamiczną podstroną
        // "zapytania" (spec 0033) — startsWith podświetla zakładkę też tam.
        const isCurrent = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`focus-ring -mb-px flex items-center gap-1 border-b-2 px-brand-1 py-brand-2 text-body font-medium transition-colors ${
              isCurrent
                ? "border-brand-v5-amber-strong text-brand-v5-ink"
                : "border-transparent text-brand-v5-muted hover:text-brand-v5-ink"
            }`}
          >
            {tab.label}
            {tab.segment === "zapytania" && hasUnreadZapytania && (
              <span
                className="inline-block size-2 rounded-full bg-brand-v5-amber-strong"
                role="img"
                aria-label={t("unreadBadgeLabel")}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
