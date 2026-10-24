"use client";

import { Container, Flame, House, Tv, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Role = "client" | "producer" | "admin";

interface MenuItem {
  key: string;
  labelKey: string;
  path: string;
  icon?: LucideIcon;
  // Dla linków do /results: rodzina z parametru `family`. Brak parametru
  // w adresie liczy się jak domyślna rodzina filtra ("dom"), tak jak robi to
  // parseResultsSearchParams (lib/results-filters.ts).
  family?: string;
  // Kotwica (#…): taki link nigdy nie jest oznaczany jako aktywny.
  hash?: string;
  // Aktywny także na podstronach (np. karta produktu pod /sauna).
  prefix?: boolean;
}

interface MenuGroup {
  key: string;
  titleKey: string;
  items: MenuItem[];
  // Wyciszona grupa stoi na końcu listy i nie przyciąga wzroku (AC-5).
  muted?: boolean;
  roles?: Role[];
  // Brak sesji też się liczy jako "anonymous".
  audience?: Array<Role | "anonymous">;
}

const DEFAULT_FAMILY = "dom";

// Stała kolejność grup, role ją tylko filtrują (spec 0072 Key invariants).
const GROUPS: MenuGroup[] = [
  {
    key: "catalog",
    titleKey: "nav.groups.catalog",
    items: [
      { key: "houses", labelKey: "nav.catalog.houses", path: "/results", family: "dom", icon: House },
      { key: "saunas", labelKey: "nav.catalog.saunas", path: "/sauna", prefix: true, icon: Flame },
      { key: "outdoorTv", labelKey: "nav.catalog.outdoorTv", path: "/results", family: "outdoor-tv", icon: Tv },
      {
        key: "containers",
        labelKey: "nav.catalog.containers",
        path: "/results",
        family: "kontenery-modulowe",
        icon: Container,
      },
    ],
  },
  {
    key: "orders",
    titleKey: "nav.groups.orders",
    items: [
      { key: "largeOrder", labelKey: "nav.orders.largeOrder", path: "/project-request" },
      { key: "modularProjects", labelKey: "nav.orders.modularProjects", path: "/modularprojects" },
      { key: "verifiedManufacturers", labelKey: "nav.orders.verifiedManufacturers", path: "/verified-manufacturers" },
    ],
  },
  {
    key: "platform",
    titleKey: "nav.groups.platform",
    items: [
      { key: "howItWorks", labelKey: "nav.platform.howItWorks", path: "", hash: "jak-to-dziala" },
      { key: "faq", labelKey: "nav.platform.faq", path: "", hash: "faq" },
      { key: "contact", labelKey: "nav.platform.contact", path: "/contact" },
    ],
  },
  {
    key: "clientPanel",
    titleKey: "nav.groups.clientPanel",
    audience: ["client"],
    items: [
      { key: "inquiries", labelKey: "nav.clientPanel.inquiries", path: "/panel/inquiries", prefix: true },
      { key: "favorites", labelKey: "nav.clientPanel.favorites", path: "/panel/favorites", prefix: true },
      { key: "verification", labelKey: "nav.clientPanel.verification", path: "/panel/verification", prefix: true },
    ],
  },
  {
    key: "producers",
    titleKey: "nav.groups.producers",
    audience: ["anonymous", "client"],
    muted: true,
    items: [{ key: "join", labelKey: "nav.producers.join", path: "/producer/registration" }],
  },
  {
    key: "producerPanel",
    titleKey: "nav.groups.producerPanel",
    audience: ["producer"],
    items: [
      { key: "home", labelKey: "nav.producerPanel.home", path: "/producer/panel" },
      { key: "products", labelKey: "nav.producerPanel.products", path: "/producer/panel/products", prefix: true },
      { key: "inquiries", labelKey: "nav.producerPanel.inquiries", path: "/producer/panel/inquiries", prefix: true },
    ],
  },
];

interface SiteHeaderMenuNavProps {
  locale: string;
  role: Role | null;
  onNavigate: () => void;
}

export function SiteHeaderMenuNav({ locale, role, onNavigate }: SiteHeaderMenuNavProps) {
  const t = useTranslations("SiteHeader");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const audience = role ?? "anonymous";

  function isActive(item: MenuItem) {
    if (item.hash) return false;
    const target = `/${locale}${item.path}`;
    const onPath = item.prefix
      ? pathname === target || pathname.startsWith(`${target}/`)
      : pathname === target;
    if (!onPath) return false;
    if (item.family) return (searchParams.get("family") ?? DEFAULT_FAMILY) === item.family;
    return true;
  }

  function hrefFor(item: MenuItem) {
    const query = item.family ? `?family=${item.family}` : "";
    const hash = item.hash ? `#${item.hash}` : "";
    return `/${locale}${item.path}${query}${hash}`;
  }

  const groups = GROUPS.filter((group) => !group.audience || group.audience.includes(audience));

  return (
    <nav aria-label={t("mainNav")} className="flex flex-col gap-brand-4">
      {groups.map((group) => (
        <div key={group.key}>
          <h2 className="mb-brand-1 text-body font-semibold text-brand-v5-muted">{t(group.titleKey)}</h2>
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              const tone = active
                ? "text-brand-v5-amber-strong"
                : group.muted
                  ? "text-brand-v5-muted hover:text-brand-v5-amber-strong"
                  : "text-brand-v5-ink hover:text-brand-v5-amber-strong";
              return (
                <li key={item.key}>
                  <Link
                    href={hrefFor(item)}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`focus-ring flex min-h-11 items-center gap-brand-1 rounded-data text-body font-medium ${tone}`}
                  >
                    {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                    <span className="min-w-0 break-words">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
