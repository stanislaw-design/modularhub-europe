import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { CountryCode } from "@/lib/data/types";
import { resolveFamilyGroup, type FamilyFilterValue, type ProductFamilyGroup } from "@/lib/product-family-groups";
import type { SizeThreshold } from "@/lib/size-thresholds";

interface FamilyTabsProps {
  locale: string;
  family: FamilyFilterValue;
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
}

// Przełącznik rodziny produktu na /wyniki (spec 0035): dwa poziomy zamiast
// dawnych trzech płaskich zakładek. Górny poziom to grupa (Domy / Więcej niż
// dom, ten sam podział co CategoryShowcase na stronie głównej); w obrębie
// grupy "Więcej niż dom" drugi poziom pozwala doprecyzować do jednej
// konkretnej podkategorii (Spa modułowe/Pergole) albo wrócić do widoku
// łączonego ("Wszystko", AC-3). Zachowuje kraj/metraż przy przełączeniu, żeby
// nie gubić reszty filtra.
export async function FamilyTabs({ locale, family, countryCode, sizeMin, sizeMax }: FamilyTabsProps) {
  const t = await getTranslations("FamilyTabs");
  const activeGroup = resolveFamilyGroup(family);

  const groupTabs: { value: ProductFamilyGroup; label: string }[] = [
    { value: "dom", label: t("home") },
    { value: "wiecej-niz-dom", label: t("more") },
  ];
  const refineTabs: { value: FamilyFilterValue; label: string }[] = [
    { value: "wiecej-niz-dom", label: t("all") },
    { value: "spa-modulowe", label: t("spa") },
    { value: "pergola", label: t("pergola") },
  ];

  function hrefFor(value: FamilyFilterValue): string {
    const params = new URLSearchParams();
    if (value !== "dom") params.set("family", value);
    if (countryCode) params.set("country", countryCode);
    if (sizeMin !== undefined) params.set("sizeMin", String(sizeMin));
    if (sizeMax !== undefined) params.set("sizeMax", String(sizeMax));
    const query = params.toString();
    return `/${locale}/klient/wyniki${query ? `?${query}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-brand-1">
      <nav aria-label={t("navAriaLabel")} className="flex gap-brand-2 border-b border-brand-v5-line">
        {groupTabs.map((tab) => {
          const isCurrent = tab.value === activeGroup;
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
      {activeGroup === "wiecej-niz-dom" && (
        <nav
          aria-label={t("subNavAriaLabel")}
          className="flex items-center gap-brand-2 overflow-x-auto"
        >
          {refineTabs.map((tab) => {
            const isCurrent = tab.value === family;
            return (
              <Link
                key={tab.value}
                href={hrefFor(tab.value)}
                aria-current={isCurrent ? "true" : undefined}
                className={`focus-ring shrink-0 whitespace-nowrap rounded-full border px-brand-2 py-1 text-body transition-colors ${
                  isCurrent
                    ? "border-brand-v5-amber-strong bg-brand-v5-amber/10 text-brand-v5-ink"
                    : "border-brand-v5-line text-brand-v5-muted hover:text-brand-v5-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
