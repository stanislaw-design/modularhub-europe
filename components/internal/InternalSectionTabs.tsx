"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { internalHref, resolveCurrent } from "./internal-nav";

interface InternalSectionTabsProps {
  locale: string;
}

// Podzakładki sekcji panelu /internal/*, renderowane raz w layoucie nad
// treścią strony. Sekcje z jednym ekranem (Dashboard, Produkty) ich nie mają.
export function InternalSectionTabs({ locale }: InternalSectionTabsProps) {
  const pathname = usePathname();
  const current = resolveCurrent(pathname, locale);
  if (!current || current.section.sidebarItems || current.section.tabs.length < 2) return null;

  return (
    <nav aria-label={current.section.label} className="flex flex-wrap gap-x-brand-1 border-b border-brand-steel">
      {current.section.tabs.map((tab) => {
        const isCurrent = tab.key === current.tab.key;
        return (
          <Link
            key={tab.key}
            href={internalHref(locale, tab.paths[0])}
            aria-current={isCurrent ? "page" : undefined}
            className={`focus-ring -mb-px border-b-2 px-brand-3 py-brand-2 text-body font-medium transition-colors ${
              isCurrent
                ? "border-brand-passage-blue text-brand-foundation-navy"
                : "border-transparent text-brand-technical-graphite hover:text-brand-foundation-navy"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
