import { Activity, BarChart3, FolderKanban, LayoutDashboard, Factory, BadgeCheck, Mail, MessagesSquare, Package, type LucideIcon } from "lucide-react";

export interface InternalNavTab {
  key: string;
  label: string;
  // Pierwsza ścieżka to cel linku; kolejne to dodatkowe prefiksy, które też
  // podświetlają tę podzakładkę (np. szczegóły sprawy pod listą).
  paths: string[];
}

// Pozycja rozwijana pod sekcją w menu bocznym (zamiast podzakładek nad treścią).
// `view` to wartość parametru `?view=` ekranu, który ma jeden adres i wiele widoków.
// Zamiast `view` pozycja może mieć `path` (osobny ekran); aktywna jest wtedy, gdy jej
// `key` jest kluczem bieżącej podzakładki sekcji.
export interface InternalNavSidebarItem {
  key: string;
  label: string;
  view?: string;
  path?: string;
}

export interface InternalNavSection {
  key: string;
  label: string;
  icon: LucideIcon;
  tabs: InternalNavTab[];
  // Gdy podane: sekcja rozwija się w menu bocznym, gdy jest aktywna, a
  // InternalSectionTabs jej nie rysuje. Pierwsza pozycja to widok domyślny.
  sidebarItems?: InternalNavSidebarItem[];
}

// Jedno źródło prawdy dla menu bocznego i podzakładek panelu /internal/*:
// dziewięć pozycji w menu, reszta ekranów to podzakładki w swojej sekcji.
export const INTERNAL_NAV: InternalNavSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    tabs: [{ key: "dashboard", label: "Dashboard", paths: [""] }],
  },
  {
    key: "demand",
    label: "Zapytania i zamówienia",
    icon: FolderKanban,
    tabs: [
      { key: "cases-and-inquiries", label: "Projekty i zapytania", paths: ["cases-and-inquiries", "cases"] },
      { key: "large-orders", label: "Duże zamówienia", paths: ["large-orders"] },
    ],
  },
  {
    key: "conversations",
    label: "Rozmowy",
    icon: MessagesSquare,
    tabs: [
      { key: "today", label: "Najbliższe", paths: ["conversations"] },
      { key: "partners", label: "Firmy", paths: ["conversations/partners", "conversations/threads"] },
    ],
    sidebarItems: [
      { key: "today", label: "Najbliższe", path: "conversations" },
      { key: "partners", label: "Firmy", path: "conversations/partners" },
    ],
  },
  {
    key: "producers",
    label: "Producenci",
    icon: Factory,
    tabs: [
      { key: "producers", label: "Lista", paths: ["producers"] },
      { key: "producer-groups", label: "Grupy producentów", paths: ["producer-groups"] },
    ],
  },
  {
    key: "verifications",
    label: "Weryfikacje",
    icon: BadgeCheck,
    tabs: [
      { key: "volume-verification", label: "Wolumenowa (producenci)", paths: ["producers/volume-verification"] },
      { key: "b2b-verification", label: "B2B (klienci)", paths: ["clients/b2b-verification"] },
    ],
  },
  {
    key: "products",
    label: "Produkty",
    icon: Package,
    tabs: [{ key: "products", label: "Produkty", paths: ["products"] }],
  },
  {
    key: "analytics",
    label: "Analityka",
    icon: BarChart3,
    tabs: [{ key: "analytics", label: "Analityka", paths: ["analytics"] }],
    sidebarItems: [
      { key: "traffic", label: "Odwiedziny", view: "traffic" },
      { key: "pages", label: "Strony", view: "pages" },
      { key: "producers", label: "Producenci", view: "producers" },
      { key: "emails", label: "Maile", view: "emails" },
    ],
  },
  {
    key: "notifications",
    label: "Szablony maili",
    icon: Mail,
    tabs: [{ key: "notifications", label: "Szablony maili", paths: ["notifications"] }],
  },
  {
    key: "system",
    label: "System",
    icon: Activity,
    tabs: [
      { key: "monitoring", label: "Monitoring", paths: ["monitoring"] },
      { key: "admins", label: "Konta administratorów", paths: ["admins"] },
    ],
  },
];

export function internalHref(locale: string, path: string): string {
  return `/${locale}/internal${path ? `/${path}` : ""}`;
}

// Najdłuższy pasujący prefiks wygrywa, żeby "Lista producentów" nie świeciła
// razem z "Weryfikacją wolumenową" (jej ścieżka zaczyna się od producers/).
export function resolveCurrent(
  pathname: string,
  locale: string,
): { section: InternalNavSection; tab: InternalNavTab } | undefined {
  let best: { section: InternalNavSection; tab: InternalNavTab; length: number } | undefined;
  for (const section of INTERNAL_NAV) {
    for (const tab of section.tabs) {
      for (const path of tab.paths) {
        const href = internalHref(locale, path);
        const matches = pathname === href || (path !== "" && pathname.startsWith(`${href}/`));
        if (matches && (!best || path.length > best.length)) best = { section, tab, length: path.length };
      }
    }
  }
  return best && { section: best.section, tab: best.tab };
}
