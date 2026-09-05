"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PanelTabsProps {
  locale: string;
}

const PANEL_TABS: { segment: "zapytania" | "ulubione" | "profil"; label: string }[] = [
  { segment: "zapytania", label: "Zapytania" },
  { segment: "ulubione", label: "Ulubione" },
  { segment: "profil", label: "Profil" },
];

// Pasek zakładek wspólny dla /klient/panel/* (spec 0024 Decision). Klient
// komponent, żeby móc podświetlić aktywną zakładkę przez usePathname() — layout
// serwerowy nadrzędny nie zna dokładnej podstrony, którą renderuje, bo żadna z
// trzech tras nie ma dynamicznego segmentu.
export function PanelTabs({ locale }: PanelTabsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Panel klienta" className="flex gap-brand-2 border-b border-brand-v5-line">
      {PANEL_TABS.map((tab) => {
        const href = `/${locale}/klient/panel/${tab.segment}`;
        const isCurrent = pathname === href;
        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`focus-ring -mb-px border-b-2 px-brand-1 py-brand-2 text-body font-medium transition-colors ${
              isCurrent
                ? "border-brand-v5-amber-strong text-brand-v5-ink"
                : "border-transparent text-brand-v5-muted hover:text-brand-v5-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
