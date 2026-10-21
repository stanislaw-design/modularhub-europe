import Link from "next/link";

export interface BoardTab {
  key: string;
  label: string;
  href: string;
  active: boolean;
  // Brak liczby (np. tablica bez zatwierdzonej weryfikacji) = bez znacznika.
  count?: number;
}

interface BoardTabsProps {
  ariaLabel: string;
  tabs: BoardTab[];
}

// Wspólny pasek dwóch ekranów tablicy ogłoszeń (spec 0074 AC-9): "Dostępne ogłoszenia"
// i "Moje wyceny". To zwykłe linki do osobnych tras, nie zakładki w miejscu.
export function BoardTabs({ ariaLabel, tabs }: BoardTabsProps) {
  return (
    <nav aria-label={ariaLabel} className="border-b border-brand-steel">
      <ul className="flex flex-wrap gap-brand-1">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`focus-ring inline-flex min-h-11 items-center gap-brand-2 border-b-2 px-brand-3 text-body font-medium ${
                tab.active
                  ? "border-brand-passage-blue text-brand-passage-blue"
                  : "border-transparent text-brand-technical-graphite hover:text-brand-foundation-navy"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="rounded-full bg-brand-steel/40 px-brand-2 text-label tabular-nums">{tab.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
