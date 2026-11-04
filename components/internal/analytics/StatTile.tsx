import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, DataText, Text } from "@/components/ui";

export type DeltaDirection = "up" | "down" | "flat" | "none";

export interface Delta {
  direction: DeltaDirection;
  /** Zaokrąglona zmiana w procentach; null, gdy poprzedni okres miał zero (nie da się policzyć). */
  percent: number | null;
}

// Zmiana względem poprzedniego okresu. Poprzedni okres równy zero daje "none",
// a nie "+∞%": uczciwie mówimy, że nie ma do czego porównać.
export function computeDelta(current: number, previous: number): Delta {
  if (previous <= 0) return { direction: "none", percent: null };
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return { direction: "flat", percent: 0 };
  return { direction: percent > 0 ? "up" : "down", percent };
}

const DELTA_STYLE: Record<DeltaDirection, { className: string; label: string }> = {
  up: { className: "text-emerald-700 dark:text-emerald-300", label: "wzrost" },
  down: { className: "text-red-700 dark:text-red-300", label: "spadek" },
  flat: { className: "text-brand-technical-graphite", label: "bez zmian" },
  none: { className: "text-brand-technical-graphite", label: "brak porównania" },
};

interface StatTileProps {
  /** Jednoznaczna nazwa miary, np. "Unikalni odwiedzający". */
  label: string;
  value: string;
  /** Bez delty (brak okresu porównawczego) kafelek nie rysuje wiersza zmiany. */
  delta?: Delta;
  /** Okres, do którego odwołuje się delta, np. "poprzednie 30 dni". */
  comparedTo?: string;
  /** "danger" koloruje samą liczbę na czerwono, gdy jej istnienie to zła wiadomość. */
  emphasis?: "danger";
  /** Jedno zdanie po ludzku: co ta liczba oznacza. */
  hint: string;
}

// Kafelek miary: nazwa, duża liczba, zmiana (kolor + ikona + znak, nigdy sam
// kolor) z okresem odniesienia i opis po ludzku.
export function StatTile({ label, value, delta, comparedTo, emphasis, hint }: StatTileProps) {
  const style = DELTA_STYLE[delta?.direction ?? "none"];
  const Icon = delta?.direction === "up" ? TrendingUp : delta?.direction === "down" ? TrendingDown : Minus;
  const sign = delta?.direction === "up" ? "+" : "";

  return (
    <Card padding="sm">
      <Text as="span" variant="label" tone="muted">
        {label}
      </Text>
      <DataText as="p" className={`text-h2 ${emphasis === "danger" ? "text-red-700 dark:text-red-300" : ""}`}>
        {value}
      </DataText>
      {delta && (
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-data">
        {delta.percent !== null ? (
          <span className={`inline-flex items-center gap-1 font-semibold ${style.className}`}>
            <Icon className="size-4" aria-hidden="true" />
            <span>
              {sign}
              {delta.percent}%<span className="sr-only"> ({style.label})</span>
            </span>
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 ${style.className}`}>
            <Icon className="size-4" aria-hidden="true" />
            brak danych do porównania
          </span>
        )}
        {delta.percent !== null && comparedTo && <span className="text-brand-technical-graphite">vs {comparedTo}</span>}
      </p>
      )}
      <p className="mt-1 text-data text-brand-technical-graphite">{hint}</p>
    </Card>
  );
}
