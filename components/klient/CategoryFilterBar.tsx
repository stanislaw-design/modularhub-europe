import { Building2, Home, Thermometer, Wind, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ResultsFilter } from "@/lib/results-filters";
import { buildResultsHref, toggleFilterValue } from "@/lib/results-filters";

interface CategoryFilterBarProps {
  locale: string;
  filter: ResultsFilter;
}

// Cztery chipy oparte na realnych danych (spec 0026 AC-7): pozostałe sześć z
// dawnej dekoracyjnej listy (Fotowoltaika, Tereny górskie, Nad wodą, Ogród,
// Garaż, Bez barier, Konstrukcja CLT) i przycisk "Filtry" znikają, bo katalog
// nie niesie tych atrybutów (patrz spec Follow-up). Prawdziwe linki, nie
// wyłączone przyciski: klawiaturowo obsługiwane, aktualizują URL od razu po
// kliknięciu, ponowne kliknięcie tego samego chipa czyści filtr (toggle).
export async function CategoryFilterBar({ locale, filter }: CategoryFilterBarProps) {
  const t = await getTranslations("CategoryFilterBar");
  const chips: {
    icon: typeof Home;
    label: string;
    key: "storeys" | "heatSource" | "ventilation" | "energyClass";
    value: NonNullable<ResultsFilter["storeys" | "heatSource" | "ventilation" | "energyClass"]>;
  }[] = [
    { icon: Home, label: t("singleStorey"), key: "storeys", value: "parterowy" },
    { icon: Building2, label: t("twoStorey"), key: "storeys", value: "pietrowy" },
    { icon: Thermometer, label: t("heatPump"), key: "heatSource", value: "pompa-ciepla" },
    { icon: Wind, label: t("heatRecovery"), key: "ventilation", value: "rekuperacja" },
    { icon: Zap, label: t("energyClassA"), key: "energyClass", value: "A+" },
  ];

  return (
    <nav aria-label={t("navAriaLabel")} className="flex items-center gap-brand-4 overflow-x-auto border-b border-brand-v5-line py-brand-2">
      {chips.map(({ icon: Icon, label, key, value }) => {
        const active = filter[key] === value;
        return (
          <Link
            key={label}
            href={buildResultsHref(locale, toggleFilterValue(filter, key, value))}
            aria-current={active ? "true" : undefined}
            className={`focus-ring flex shrink-0 flex-col items-center gap-1 rounded-data border-b-2 px-1 transition-colors ${
              active
                ? "border-brand-v5-amber-strong font-semibold text-brand-v5-ink"
                : "border-transparent text-brand-v5-muted hover:text-brand-v5-ink"
            }`}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="whitespace-nowrap text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
