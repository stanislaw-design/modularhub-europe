"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

interface MoreOptionGroupsProps {
  // Grupy opcji zrenderowane po stronie serwera, ukryte do kliknięcia przycisku.
  children: ReactNode;
  // Liczba ukrytych grup, podstawiana za `{count}` w etykiecie.
  count: number;
  // Któraś z ukrytych grup ma wybór klienta: lista otwiera się sama, żeby wybór nie był schowany.
  hasSelection: boolean;
  showMoreLabel: string;
  showLessLabel: string;
}

// Jeden przycisk "Pokaż więcej opcji" pod dwiema pierwszymi grupami: po kliknięciu pojawiają się wszystkie pozostałe
// grupy naraz, w normalnej postaci. Opcje to linki `?opcje=...` z scroll={false}, więc strona odświeża się po każdym
// kliknięciu, a stan tej wyspy zostaje. Własny wybór klienta (przycisk albo kliknięcie opcji) wygrywa z automatycznym
// otwarciem. Grupy zostają w DOM z atrybutem `hidden`, więc zdjęcia opcji nie ładują się, dopóki lista jest zamknięta.
export function MoreOptionGroups({ children, count, hasSelection, showMoreLabel, showLessLabel }: MoreOptionGroupsProps) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? hasSelection;

  return (
    <>
      <div hidden={!open} className="flex flex-col gap-brand-5" onClickCapture={() => setUserOpen(true)}>
        {children}
      </div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setUserOpen(!open)}
        className="focus-ring flex w-full items-center justify-center gap-brand-1 rounded-v5-card border border-brand-v5-line px-brand-3 py-brand-3 text-body-m font-semibold text-brand-v5-ink transition-colors hover:border-brand-v5-muted"
      >
        {(open ? showLessLabel : showMoreLabel).replace("{count}", String(count))}
        <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
    </>
  );
}
