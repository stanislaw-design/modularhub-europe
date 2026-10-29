"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminProductEnvelopeRow } from "@/lib/db/queries";
import {
  deleteProductEnvelopeParameter,
  setProductFoundationStatus,
  upsertProductEnvelopeParameter,
} from "@/lib/product-envelope-actions";
import {
  ENVELOPE_ELEMENTS,
  ENVELOPE_METHODS,
  ENVELOPE_UNIT,
  envelopeSymbol,
  isQuantityAllowedForElement,
  type EnvelopeElement,
  type EnvelopeMethod,
  type EnvelopeQuantity,
  type FoundationStatus,
} from "@/lib/product-envelope-parameters";

const elementLabel: Record<EnvelopeElement, string> = {
  wall: "Ściany zewnętrzne",
  roof: "Dach",
  floor_ground: "Podłoga na gruncie",
  floor_air: "Podłoga nad powietrzem",
  window: "Okna (Uw)",
  glazing: "Szyby (Ug)",
  door: "Drzwi (Ud)",
};

const methodLabel: Record<EnvelopeMethod, string> = {
  calculation: "Obliczenia",
  lab_test: "Badanie laboratoryjne",
  manufacturer_declaration: "Deklaracja producenta",
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "UTC" });
const inputClass = "focus-ring h-10 rounded-data border border-brand-steel px-brand-2";
const linkButtonClass = "focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50";

interface Draft {
  element: EnvelopeElement;
  quantity: EnvelopeQuantity;
  value: string;
  method: EnvelopeMethod;
  methodNote: string;
  asOfDate: string;
}

const EMPTY_DRAFT: Draft = {
  element: "wall",
  quantity: "u_value",
  value: "",
  method: "manufacturer_declaration",
  methodNote: "",
  asOfDate: "",
};

interface ProductEnvelopeSectionProps {
  productId: string;
  foundationStatus: FoundationStatus | null;
  rows: AdminProductEnvelopeRow[];
}

// Spec 0075 AC-9: osobna sekcja poza kreatorem. Producent wpisuje własne liczby i
// posadowienie. Potwierdzenie ustawia wyłącznie administrator platformy, tu widać tylko
// jego stan. Zmiana potwierdzonej wartości cofa potwierdzenie (robi to serwer).
export function ProductEnvelopeSection({ productId, foundationStatus, rows }: ProductEnvelopeSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminProductEnvelopeRow | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać zmian.");
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  function startEdit(row: AdminProductEnvelopeRow) {
    setEditing(row);
    setDraft({
      element: row.element,
      quantity: row.quantity,
      value: String(row.value),
      method: row.method,
      methodNote: row.methodNote ?? "",
      asOfDate: row.asOfDate,
    });
    setError(null);
  }

  function changeElement(element: EnvelopeElement) {
    setDraft((current) => ({
      ...current,
      element,
      quantity: isQuantityAllowedForElement(element, current.quantity) ? current.quantity : "u_value",
    }));
  }

  return (
    <section aria-labelledby="producer-envelope-heading" className="flex flex-col gap-brand-3">
      <h2 id="producer-envelope-heading" className="text-h3 font-semibold">
        Izolacja i posadowienie
      </h2>
      <p className="text-body text-brand-technical-graphite">
        Wpisz liczby z dokumentów swojego produktu. Platforma pokazuje je klientom jako deklarację producenta, dopóki
        administrator ich nie potwierdzi. Zmiana wartości potwierdzonego parametru cofa potwierdzenie.
      </p>

      <label className="flex flex-col gap-1 text-body">
        Posadowienie
        <select
          value={foundationStatus ?? ""}
          disabled={isPending}
          onChange={(event) =>
            run(() => setProductFoundationStatus(productId, (event.target.value || null) as FoundationStatus | null))
          }
          className={`${inputClass} w-fit`}
        >
          <option value="">Nie podano</option>
          <option value="permanent">Stałe</option>
          <option value="temporary">Tymczasowe</option>
        </select>
      </label>

      {rows.length === 0 ? (
        <p className="text-body text-brand-technical-graphite">Nie dodano jeszcze żadnego parametru.</p>
      ) : (
        <ul className="flex flex-col gap-brand-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-1 border-b border-brand-steel/50 pb-brand-2">
              <span className="font-medium">
                {elementLabel[row.element]} · {envelopeSymbol(row.element, row.quantity)} {row.value}{" "}
                {ENVELOPE_UNIT[row.quantity]}
              </span>
              <span className="text-body text-brand-technical-graphite">
                {methodLabel[row.method]}
                {row.methodNote ? ` (${row.methodNote})` : ""} · stan na dzień{" "}
                {dateFormatter.format(new Date(`${row.asOfDate}T00:00:00Z`))}
              </span>
              <span className="text-body text-brand-technical-graphite">
                {row.confirmed ? "Potwierdzone przez platformę" : "Deklaracja producenta, niepotwierdzona"}
              </span>
              <div className="flex gap-brand-3">
                <button type="button" disabled={isPending} onClick={() => startEdit(row)} className={linkButtonClass}>
                  Edytuj
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (!window.confirm(`Usunąć parametr ${elementLabel[row.element]}?`)) return;
                    run(() => deleteProductEnvelopeParameter(row.id, row.version));
                  }}
                  className={linkButtonClass}
                >
                  Usuń
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-brand-2 border-t border-brand-steel pt-brand-3"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () =>
              upsertProductEnvelopeParameter({
                productId,
                id: editing?.id,
                expectedVersion: editing?.version,
                element: draft.element,
                quantity: draft.quantity,
                value: draft.value,
                method: draft.method,
                methodNote: draft.methodNote,
                asOfDate: draft.asOfDate,
              }),
            () => {
              setEditing(null);
              setDraft(EMPTY_DRAFT);
            },
          );
        }}
      >
        <span className="font-medium">{editing ? "Zmień parametr" : "Dodaj parametr"}</span>
        <div className="flex flex-wrap gap-brand-2">
          <label className="flex flex-col gap-1 text-body">
            Przegroda
            <select
              value={draft.element}
              onChange={(event) => changeElement(event.target.value as EnvelopeElement)}
              className={inputClass}
            >
              {ENVELOPE_ELEMENTS.map((element) => (
                <option key={element} value={element}>
                  {elementLabel[element]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-body">
            Wielkość
            <select
              value={draft.quantity}
              onChange={(event) => setDraft({ ...draft, quantity: event.target.value as EnvelopeQuantity })}
              className={inputClass}
            >
              <option value="u_value">U ({ENVELOPE_UNIT.u_value})</option>
              {isQuantityAllowedForElement(draft.element, "rc_value") ? (
                <option value="rc_value">Rc ({ENVELOPE_UNIT.rc_value})</option>
              ) : null}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-body">
            Wartość
            <input
              value={draft.value}
              inputMode="decimal"
              required
              onChange={(event) => setDraft({ ...draft, value: event.target.value })}
              className={`${inputClass} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-body">
            Metoda
            <select
              value={draft.method}
              onChange={(event) => setDraft({ ...draft, method: event.target.value as EnvelopeMethod })}
              className={inputClass}
            >
              {ENVELOPE_METHODS.map((method) => (
                <option key={method} value={method}>
                  {methodLabel[method]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-body">
            Stan na dzień
            <input
              type="date"
              value={draft.asOfDate}
              required
              onChange={(event) => setDraft({ ...draft, asOfDate: event.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-body">
          Notatka do metody (numer normy, najwyżej 300 znaków)
          <input
            value={draft.methodNote}
            maxLength={300}
            onChange={(event) => setDraft({ ...draft, methodNote: event.target.value })}
            className={inputClass}
          />
        </label>
        <div className="flex gap-brand-2">
          <button
            type="submit"
            disabled={isPending}
            className="focus-ring h-10 w-fit rounded-data bg-brand-passage-blue px-brand-3 text-body font-medium text-white disabled:opacity-50"
          >
            {editing ? "Zapisz zmianę" : "Dodaj parametr"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY_DRAFT);
              }}
              className={linkButtonClass}
            >
              Anuluj
            </button>
          ) : null}
        </div>
      </form>

      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
    </section>
  );
}
