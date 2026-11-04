"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlatformRecordsAction } from "@/app/[locale]/internal/conversations/actions";
import { LINK_KIND_LABELS, LINK_KINDS, type LinkKind } from "@/lib/conversations/constants";
import { ErrorLine, fieldClass, labelClass, labelTextClass, secondaryButtonClass } from "./shared";

export interface PickedPlatformRecord {
  kind: LinkKind;
  id: string;
  label: string;
}

interface Option {
  id: string;
  label: string;
  detail: string;
}

interface PlatformLinkPickerProps {
  value: PickedPlatformRecord | null;
  onChange: (value: PickedPlatformRecord | null) => void;
  disabled?: boolean;
}

// Wybór rekordu platformy do podlinkowania (spec 0080 AC-18). Producent i produkt wyszukuje się po
// nazwie, duże zamówienia i case pokazują listę ostatnich i dają się zawęzić wpisanym identyfikatorem.
// Wybór zapisuje tylko rodzaj i identyfikator; nazwa służy wyłącznie do pokazania wyboru.
export function PlatformLinkPicker({ value, onChange, disabled = false }: PlatformLinkPickerProps) {
  const [kind, setKind] = useState<LinkKind | "">(value?.kind ?? "");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const needsName = kind === "producer" || kind === "product";

  useEffect(() => {
    if (!kind || value) return;
    const request = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const result = await searchPlatformRecordsAction(kind, query);
      // Odpowiedź na starsze zapytanie nie nadpisuje nowszej.
      if (request !== requestRef.current) return;
      setLoading(false);
      if (!result.ok) {
        setOptions([]);
        setError(result.error);
        return;
      }
      setOptions(result.options);
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [kind, query, value]);

  function chooseKind(next: LinkKind | "") {
    setKind(next);
    setQuery("");
    setOptions([]);
    setError(null);
    if (value) onChange(null);
  }

  if (value) {
    return (
      <div className={labelClass}>
        <span className={labelTextClass}>Powiązany rekord platformy</span>
        <div className="flex flex-wrap items-center gap-brand-2 rounded-data border border-brand-steel p-brand-2 text-body">
          <span>
            <span className="text-brand-technical-graphite">{LINK_KIND_LABELS[value.kind]}: </span>
            {value.label}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              setKind("");
            }}
            className={secondaryButtonClass}
          >
            Usuń powiązanie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <label className={labelClass}>
        <span className={labelTextClass}>Powiązany rekord platformy (opcjonalnie)</span>
        <select value={kind} disabled={disabled} onChange={(event) => chooseKind(event.target.value as LinkKind | "")} className={fieldClass}>
          <option value="">Bez powiązania</option>
          {LINK_KINDS.map((item) => (
            <option key={item} value={item}>
              {LINK_KIND_LABELS[item]}
            </option>
          ))}
        </select>
      </label>
      {kind && (
        <>
          <label className={labelClass}>
            <span className={labelTextClass}>
              {needsName ? "Szukaj po nazwie (od 2 znaków)" : "Wklej identyfikator albo wybierz z ostatnich"}
            </span>
            <input
              type="search"
              value={query}
              disabled={disabled}
              onChange={(event) => setQuery(event.target.value)}
              className={fieldClass}
            />
          </label>
          <ErrorLine error={error} />
          <div aria-live="polite" className="text-data text-brand-technical-graphite">
            {loading ? "Szukam…" : options.length === 0 && !error ? (needsName && query.trim().length < 2 ? "Wpisz nazwę, żeby wyszukać." : "Brak wyników.") : null}
          </div>
          {options.length > 0 && (
            <ul className="flex max-h-64 flex-col divide-y divide-brand-steel/50 overflow-y-auto rounded-data border border-brand-steel/60">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ kind, id: option.id, label: option.label })}
                    className="focus-ring flex w-full flex-col items-start p-brand-2 text-left hover:bg-brand-steel/30"
                  >
                    <span className="text-body font-medium">{option.label}</span>
                    <span className="text-data text-brand-technical-graphite">{option.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
