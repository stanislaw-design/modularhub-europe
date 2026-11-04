import type { ReactNode } from "react";
import { DataText } from "@/components/ui";

export type BarTone = "primary" | "danger" | "muted";

export interface BarRow {
  key: string;
  label: ReactNode;
  /** Liczba po prawej stronie; przy `segments` zwykle suma segmentów. */
  value: number;
  /** Mała linijka pod słupkiem, np. "34% wyświetleń". */
  detail?: string;
  tone?: BarTone;
  /** Słupek skumulowany: pierwszy segment w kolorze głównym, drugi w grafitowym. */
  segments?: [number, number];
}

interface BarListProps {
  rows: BarRow[];
  /** Pełna szerokość słupka; domyślnie największa wartość na liście. */
  max?: number;
  emptyText?: string;
}

const TONE_CLASS: Record<BarTone, string> = {
  primary: "bg-brand-passage-blue",
  danger: "bg-red-600 dark:bg-red-400",
  muted: "bg-brand-technical-graphite",
};

// Poziome słupki z etykietą i liczbą. Czysty HTML/CSS (bez Recharts): prosta lista
// jest dostępna dla czytników ekranu, czytelna na telefonie i odwraca się w trybie
// ciemnym razem z tokenami. Liczba jest zawsze wypisana, słupek tylko ją ilustruje.
export function BarList({ rows, max, emptyText = "Brak danych w tym okresie." }: BarListProps) {
  if (rows.length === 0) return <p className="text-body text-brand-technical-graphite">{emptyText}</p>;
  const scale = Math.max(1, max ?? Math.max(...rows.map((row) => row.value)));
  const width = (value: number) => `${Math.min(100, (value / scale) * 100)}%`;

  return (
    <ul className="flex flex-col gap-brand-2">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-brand-2 text-body">
            <span className="min-w-0 break-words">{row.label}</span>
            <DataText as="span">{row.value}</DataText>
          </div>
          <div className="mt-1 flex h-2 overflow-hidden rounded-data bg-brand-steel/40" aria-hidden="true">
            {row.segments ? (
              <>
                <div className={`h-full ${TONE_CLASS.primary}`} style={{ width: width(row.segments[0]) }} />
                <div className={`h-full ${TONE_CLASS.muted}`} style={{ width: width(row.segments[1]) }} />
              </>
            ) : (
              <div className={`h-full ${TONE_CLASS[row.tone ?? "primary"]}`} style={{ width: width(row.value) }} />
            )}
          </div>
          {row.detail && <p className="mt-0.5 text-data text-brand-technical-graphite">{row.detail}</p>}
        </li>
      ))}
    </ul>
  );
}
