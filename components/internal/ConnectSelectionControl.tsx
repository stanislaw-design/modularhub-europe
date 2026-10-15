"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { connectSelectionAsAdmin } from "@/lib/large-order-admin-actions";

interface ConnectSelectionControlProps {
  id: string;
  kind: "request" | "product";
}

// Spec 0070 AC-17: przycisk dla wyboru klienta, który czeka na połączenie stron. Normalnie
// połączenie dzieje się samo (po wyborze albo po zatwierdzeniu B2B), ten przycisk dokańcza
// je ręcznie, gdy automat się nie udał. Akcja jest idempotentna, więc ponowne kliknięcie nie szkodzi.
export function ConnectSelectionControl({ id, kind }: ConnectSelectionControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function connect() {
    setError(null);
    startTransition(async () => {
      const result = await connectSelectionAsAdmin(kind, id);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się połączyć stron.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-brand-2 rounded-card border border-status-conditional/40 bg-status-conditional/5 p-brand-3">
      <p className="text-body font-medium">Klient wybrał ofertę, ale strony nie są jeszcze połączone.</p>
      <p className="text-data text-brand-technical-graphite">
        Połączenie wymaga zatwierdzonych danych firmy klienta (B2B). Gdy są zatwierdzone, a połączenie nie doszło do skutku, połącz strony ręcznie.
      </p>
      <div>
        <button
          type="button"
          onClick={connect}
          disabled={isPending}
          className="focus-ring rounded-data bg-brand-foundation-navy px-brand-3 py-brand-1 text-data font-medium text-brand-warm-white disabled:opacity-50"
        >
          {isPending ? "Łączenie…" : "Połącz strony"}
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
