import Link from "next/link";
import type { CountryCode, ProductFamily } from "@/lib/data/types";
import type { SizeThreshold } from "@/lib/size-thresholds";

interface FamilyTabsProps {
  locale: string;
  family: ProductFamily;
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
}

const FAMILY_TABS: { value: ProductFamily; label: string }[] = [
  { value: "dom", label: "Domy" },
  { value: "spa-modulowe", label: "Spa modułowe" },
  { value: "pergola", label: "Pergole" },
];

// Przełącznik rodziny produktu na /wyniki (spec 0023 AC-4): parametr URL
// `family`, domyślnie "dom". Zachowuje kraj/metraż przy przełączeniu, żeby nie
// gubić reszty filtra.
export function FamilyTabs({ locale, family, countryCode, sizeMin, sizeMax }: FamilyTabsProps) {
  function hrefFor(value: ProductFamily): string {
    const params = new URLSearchParams();
    if (value !== "dom") params.set("family", value);
    if (countryCode) params.set("country", countryCode);
    if (sizeMin !== undefined) params.set("sizeMin", String(sizeMin));
    if (sizeMax !== undefined) params.set("sizeMax", String(sizeMax));
    const query = params.toString();
    return `/${locale}/klient/wyniki${query ? `?${query}` : ""}`;
  }

  return (
    <nav aria-label="Rodzina produktu" className="flex gap-brand-2 border-b border-brand-v5-line">
      {FAMILY_TABS.map((tab) => {
        const isCurrent = tab.value === family;
        return (
          <Link
            key={tab.value}
            href={hrefFor(tab.value)}
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
