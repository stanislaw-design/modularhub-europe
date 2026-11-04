"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { fieldClass, labelTextClass } from "./shared";

export interface PartnerPickerOption {
  id: string;
  name: string;
}

interface PartnerPickerProps {
  /** Identyfikator wybranej firmy albo pusty tekst, gdy nic nie wybrano. */
  value: string;
  onChange: (value: string) => void;
  partners: PartnerPickerOption[];
  disabled?: boolean;
}

// Jedno pole "Firma" w oknie szybkiego wpisu (AC-17). Po kliknięciu rozwija się panel: u góry pasek
// wyszukiwania, pod nim lista firm pasujących do wpisanego tekstu. Strzałki przesuwają zaznaczenie,
// Enter wybiera pierwszą (albo zaznaczoną) firmę, Escape zamyka. Tworzenie nowej firmy to osobny
// tryb w oknie szybkiego wpisu, nie pozycja tej listy.
export function PartnerPicker({ value, onChange, partners, disabled }: PartnerPickerProps) {
  const labelId = useId();
  const buttonId = useId();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<number | null>(null);
  const activeRef = useRef<HTMLLIElement | null>(null);

  const needle = query.trim().toLowerCase();
  const matches = needle ? partners.filter((partner) => partner.name.toLowerCase().includes(needle)) : partners;
  const items = matches;
  const active = Math.max(0, Math.min(cursor ?? 0, items.length - 1));
  const selectedName = partners.find((partner) => partner.id === value)?.name ?? null;

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [active, query]);

  return (
    <Popover className="relative flex flex-col gap-brand-1 text-data">
      {({ open, close }) => {
        function choose(id: string) {
          onChange(id);
          setQuery("");
          setCursor(null);
          close();
        }

        return (
          <>
            <span id={labelId} className={labelTextClass}>
              Firma
            </span>
            <PopoverButton
              id={buttonId}
              disabled={disabled}
              aria-labelledby={`${labelId} ${buttonId}`}
              className={`${fieldClass} flex items-center justify-between text-left disabled:opacity-50`}
            >
              <span className={`truncate ${selectedName ? "" : "text-brand-technical-graphite"}`}>{selectedName ?? "Wybierz firmę"}</span>
              <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </PopoverButton>
            <PopoverPanel
              focus
              className="absolute left-0 right-0 top-full z-10 mt-1 flex flex-col overflow-hidden rounded-data border border-brand-steel bg-brand-warm-white shadow-lg"
            >
              <div className="flex items-center gap-brand-2 border-b border-brand-steel/60 px-brand-2">
                <Search className="size-4 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCursor(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setCursor(Math.min(active + 1, items.length - 1));
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setCursor(Math.max(active - 1, 0));
                    } else if (event.key === "Enter") {
                      // Enter w polu wyszukiwania nie może wysłać całego formularza.
                      event.preventDefault();
                      if (items[active]) choose(items[active].id);
                    }
                  }}
                  aria-label="Szukaj firmy"
                  placeholder="Szukaj firmy"
                  className="h-11 w-full bg-transparent text-body text-brand-foundation-navy outline-none"
                />
              </div>
              <ul role="listbox" aria-label="Firmy" className="max-h-64 overflow-y-auto py-brand-1">
                {items.map((item, index) => {
                  const selected = item.id === value;
                  return (
                    <li
                      key={item.id}
                      ref={index === active ? activeRef : undefined}
                      role="option"
                      aria-selected={selected}
                      onClick={() => choose(item.id)}
                      onMouseMove={() => cursor !== index && setCursor(index)}
                      className={`flex cursor-pointer items-center justify-between gap-brand-2 px-brand-3 py-brand-2 text-body text-brand-foundation-navy ${
                        index === active ? "bg-brand-steel/30" : ""
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      {selected && <Check className="size-4 shrink-0" aria-hidden="true" />}
                    </li>
                  );
                })}
                {matches.length === 0 && (
                  <li role="presentation" className="px-brand-3 py-brand-2 text-data text-brand-technical-graphite">
                    Brak firm o takiej nazwie. Przełącz na „Nowa firma”, żeby ją utworzyć.
                  </li>
                )}
              </ul>
            </PopoverPanel>
          </>
        );
      }}
    </Popover>
  );
}
