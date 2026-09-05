import { Building2, Home, Thermometer, Wind, Zap } from "lucide-react";
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
const CHIPS: {
  icon: typeof Home;
  label: string;
  key: "storeys" | "heatSource" | "ventilation" | "energyClass";
  value: NonNullable<ResultsFilter["storeys" | "heatSource" | "ventilation" | "energyClass"]>;
}[] = [
  { icon: Home, label: "Parterowy", key: "storeys", value: "parterowy" },
  { icon: Building2, label: "Piętrowy", key: "storeys", value: "pietrowy" },
  { icon: Thermometer, label: "Pompa ciepła", key: "heatSource", value: "pompa-ciepla" },
  { icon: Wind, label: "Rekuperacja", key: "ventilation", value: "rekuperacja" },
  { icon: Zap, label: "Klasa A+", key: "energyClass", value: "A+" },
];

export function CategoryFilterBar({ locale, filter }: CategoryFilterBarProps) {
  return (
    <nav aria-label="Filtry atrybutów domu" className="flex items-center gap-brand-4 overflow-x-auto border-b border-brand-v5-line py-brand-2">
      {CHIPS.map(({ icon: Icon, label, key, value }) => {
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
