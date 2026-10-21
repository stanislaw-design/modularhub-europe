import Link from "next/link";
import { Card, Text } from "@/components/ui";

export interface StatTile {
  key: string;
  label: string;
  value: number;
  detail?: string;
  href: string;
}

interface ProducerStatTilesProps {
  tiles: StatTile[];
}

// Trzy kafelki pod blokiem reakcji (spec 0074 AC-5): liczba, podpis, linijka
// szczegółu. Cały kafelek jest linkiem (min. 44 px wysokości z samego układu).
export function ProducerStatTiles({ tiles }: ProducerStatTilesProps) {
  return (
    <ul className="grid gap-brand-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <li key={tile.key}>
          <Link
            href={tile.href}
            className="focus-ring block h-full rounded-card transition-colors hover:bg-brand-steel/20"
          >
            <Card padding="md" className="h-full">
              <Text tone="muted" className="text-label">
                {tile.label}
              </Text>
              <p className="font-sans text-h2 font-medium text-brand-foundation-navy">{tile.value}</p>
              {tile.detail && (
                <Text tone="muted" className="text-label">
                  {tile.detail}
                </Text>
              )}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
