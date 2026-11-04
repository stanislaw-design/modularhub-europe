"use client";

import { useState } from "react";
import { BarList } from "./BarList";

interface PageCount {
  path: string;
  count: number;
}

interface PageRankingsProps {
  top: PageCount[];
  entry: PageCount[];
  exit: PageCount[];
}

const TABS = [
  { key: "top", label: "Najczęściej odwiedzane", question: "Które strony ludzie otwierają najczęściej?" },
  { key: "entry", label: "Wejście", question: "Od której strony zaczyna się wizyta?" },
  { key: "exit", label: "Wyjście", question: "Na której stronie wizyta się kończy?" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const COLLAPSED_ROWS = 10;

// Ścieżka po ludzku: sama "/" to strona główna, reszta zostaje adresem, bo to on
// pozwala znaleźć stronę.
function pathLabel(path: string): string {
  if (path === "" || path === "/") return "Strona główna";
  return path;
}

// Jeden panel zamiast trzech kolumn: te same dane (ścieżka i liczba), trzy pytania.
export function PageRankings({ top, entry, exit }: PageRankingsProps) {
  const [tab, setTab] = useState<TabKey>("top");
  const [showAll, setShowAll] = useState(false);
  const data = { top, entry, exit }[tab];
  const meta = TABS.find((item) => item.key === tab) ?? TABS[0];
  const visible = showAll ? data : data.slice(0, COLLAPSED_ROWS);
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="flex flex-col gap-brand-2">
      <div className="flex flex-wrap items-center gap-brand-1" role="group" aria-label="Rodzaj rankingu stron">
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setTab(item.key);
                setShowAll(false);
              }}
              className={`focus-ring rounded-marketing border px-brand-2 py-1 text-body ${active ? "border-brand-passage-blue bg-brand-passage-blue/10 font-semibold" : "border-brand-steel"}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="text-data text-brand-technical-graphite">{meta.question}</p>
      <BarList
        rows={visible.map((row) => ({
          key: row.path || "(brak)",
          label: pathLabel(row.path),
          value: row.count,
          detail: total > 0 ? `${Math.round((row.count / total) * 100)}% z pokazanych` : undefined,
        }))}
      />
      {data.length > COLLAPSED_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="focus-ring w-fit rounded-data text-body underline"
        >
          {showAll ? "Pokaż mniej" : `Pokaż wszystkie (${data.length})`}
        </button>
      )}
    </div>
  );
}
