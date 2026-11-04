"use client";

import Link from "next/link";
import { useState } from "react";
import { BarList } from "./BarList";

export interface ProducerRankingRow {
  producerId: string;
  name: string;
  href: string;
  productViews: number;
  producerPageViews: number;
  visitors: number;
}

const COLLAPSED_ROWS = 10;

// Ranking producentów: słupek skumulowany (produkty + strona producenta),
// wyszukiwarka po nazwie i skracanie do 10 pozycji. Kliknięcie nazwy otwiera szczegół.
export function ProducerRanking({ rows }: { rows: ProducerRankingRow[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const needle = query.trim().toLowerCase();
  const filtered = needle ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : rows;
  const visible = showAll || needle ? filtered : filtered.slice(0, COLLAPSED_ROWS);

  return (
    <div className="flex flex-col gap-brand-2">
      {rows.length > COLLAPSED_ROWS && (
        <label className="flex flex-col gap-1 text-data text-brand-technical-graphite">
          Szukaj producenta
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Wpisz nazwę"
            className="focus-ring w-full max-w-xs rounded-data border border-brand-steel bg-brand-warm-white px-brand-1 py-1 text-body text-brand-foundation-navy"
          />
        </label>
      )}
      <p className="flex flex-wrap items-center gap-brand-2 text-data text-brand-technical-graphite">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-data bg-brand-passage-blue" aria-hidden="true" /> strony produktów
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-data bg-brand-technical-graphite" aria-hidden="true" /> strona producenta
        </span>
      </p>
      <BarList
        emptyText={needle ? "Żaden producent nie pasuje do wpisanej nazwy." : "Brak danych w tym okresie."}
        rows={visible.map((row) => ({
          key: row.producerId,
          label: (
            <Link href={row.href} className="underline">
              {row.name}
            </Link>
          ),
          value: row.productViews + row.producerPageViews,
          segments: [row.productViews, row.producerPageViews],
          detail: `${row.productViews} wyśw. produktów · ${row.producerPageViews} wyśw. strony producenta · ${row.visitors} gości`,
        }))}
      />
      {!needle && filtered.length > COLLAPSED_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="focus-ring w-fit rounded-data text-body underline"
        >
          {showAll ? "Pokaż mniej" : `Pokaż wszystkich (${filtered.length})`}
        </button>
      )}
    </div>
  );
}
