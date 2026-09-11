"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProducerPanelTabsProps {
  locale: string;
  // Zbiorczy sygnał nieprzeczytane przy "Zapytania" (spec 0033 AC-12).
  hasUnreadZapytania?: boolean;
}

// Pasek zakładek wspólny dla /producent/panel/* (spec 0032 Feature design),
// mirror components/klient/PanelTabs.tsx: komponent kliencki, żeby podświetlić
// aktywną zakładkę przez usePathname() — layout nadrzędny nie zna dokładnej
// podstrony, bo żaden z segmentów nie jest dynamiczny na tym poziomie.
export function ProducerPanelTabs({ locale, hasUnreadZapytania }: ProducerPanelTabsProps) {
  const t = useTranslations("ProducerPanelTabs");
  const pathname = usePathname();
  const panelTabs: { segment: string; label: string }[] = [
    { segment: "", label: t("konto") },
    { segment: "produkty", label: t("produkty") },
    { segment: "zapytania", label: t("zapytania") },
  ];

  return (
    <nav aria-label={t("navAriaLabel")} className="flex gap-brand-2 border-b border-brand-steel">
      {panelTabs.map((tab) => {
        const href = `/${locale}/producent/panel${tab.segment ? `/${tab.segment}` : ""}`;
        // /zapytania/[id] jest zagnieżdżoną, dynamiczną podstroną
        // "zapytania" (spec 0033) — startsWith podświetla zakładkę też tam.
        const isCurrent = pathname === href || (tab.segment !== "" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={tab.segment || "konto"}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`focus-ring -mb-px flex items-center gap-1 border-b-2 px-brand-1 py-brand-2 text-body font-medium transition-colors ${
              isCurrent
                ? "border-brand-passage-blue text-brand-foundation-navy"
                : "border-transparent text-brand-technical-graphite hover:text-brand-foundation-navy"
            }`}
          >
            {tab.label}
            {tab.segment === "zapytania" && hasUnreadZapytania && (
              <span
                className="inline-block size-2 rounded-full bg-brand-passage-blue"
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
