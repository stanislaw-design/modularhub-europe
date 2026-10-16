"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closeRequest } from "@/lib/large-order-admin-actions";

interface CloseRequestControlProps {
  id: string;
  kind: "request" | "product";
}

const REASONS = [
  { value: "no_offers", label: "Brak ofert" },
  { value: "expired", label: "Upłynął termin" },
  { value: "client_cancelled", label: "Rezygnacja klienta" },
  { value: "staff_closed", label: "Zamknięte przez ModularHub" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

// Spec 0070 AC-19: administrator zamyka zapytanie z powodem. Producenci z aktywną ofertą
// dostają neutralną informację (bez powodu i bez danych klienta), klient może wznowić
// zapytanie przez 30 dni, jeśli powód to rezygnacja, brak ofert lub upływ terminu.
export function CloseRequestControl({ id, kind }: CloseRequestControlProps) {
  const router = useRouter();
  const [reason, setReason] = useState<Reason>("staff_closed");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setError(null);
    startTransition(async () => {
      const result = await closeRequest(id, kind, reason);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zamknąć zapytania.");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="focus-ring w-fit rounded-data border border-brand-steel px-brand-3 py-brand-1 text-data font-medium"
      >
        Zamknij zapytanie
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-brand-2 rounded-card border border-brand-steel p-brand-3">
      <label className="flex flex-col gap-brand-1 text-data font-medium">
        Powód zamknięcia
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value as Reason)}
          className="focus-ring rounded-data border border-brand-steel bg-white px-brand-2 py-brand-1 font-normal"
        >
          {REASONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-data text-brand-technical-graphite">
        Producenci z aktywną ofertą dostaną neutralną informację o zamknięciu. Klient może wznowić zapytanie przez 30 dni, jeśli powód to rezygnacja, brak ofert lub upływ terminu.
      </p>
      <div className="flex flex-wrap gap-brand-2">
        <button
          type="button"
          onClick={close}
          disabled={isPending}
          className="focus-ring rounded-data bg-brand-foundation-navy px-brand-3 py-brand-1 text-data font-medium text-brand-warm-white disabled:opacity-50"
        >
          {isPending ? "Zamykanie…" : "Zamknij zapytanie"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="focus-ring rounded-data border border-brand-steel px-brand-3 py-brand-1 text-data font-medium"
        >
          Anuluj
        </button>
      </div>
      {error && (
        <p role="alert" className="text-data text-status-blocked">
          {error}
        </p>
      )}
    </div>
  );
}
