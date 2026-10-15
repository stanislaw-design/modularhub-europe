"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { publishSummary } from "@/lib/large-order-admin-actions";

interface PublishSummaryControlProps {
  id: string;
  kind: "request" | "product";
  // Aktywne oferty, których klient jeszcze nie widzi.
  pendingCount: number;
  // Czy podsumowanie było już publikowane (ponowna publikacja po nowych ofertach).
  alreadyPublished: boolean;
}

// Spec 0070 AC-14: publikacja podsumowania jedną akcją, po potwierdzeniu
// przeglądu PDF i tekstów ofert. Bez zaznaczonego pola przycisk jest wyłączony.
export function PublishSummaryControl({ id, kind, pendingCount, alreadyPublished }: PublishSummaryControlProps) {
  const router = useRouter();
  const checkboxId = useId();
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function publish() {
    setError(null);
    startTransition(async () => {
      const result = await publishSummary(id, kind, confirmed);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się opublikować podsumowania.");
        return;
      }
      setConfirmed(false);
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby={`${checkboxId}-heading`}
      className="flex flex-col gap-brand-3 rounded-card border border-status-conditional/40 bg-status-conditional/5 p-brand-3"
    >
      <div>
        <h3 id={`${checkboxId}-heading`} className="text-body font-semibold">
          {alreadyPublished ? "Opublikuj ponownie" : "Opublikuj podsumowanie klientowi"}
        </h3>
        <p className="text-data text-brand-technical-graphite">
          {`Do publikacji: ${pendingCount}. Klient zobaczy te oferty i ich pliki PDF od razu po publikacji.`}
        </p>
      </div>
      <div className="flex items-start gap-brand-2">
        <input
          id={checkboxId}
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={isPending}
          className="focus-ring mt-1 size-4"
        />
        <label htmlFor={checkboxId} className="text-body">
          Przejrzałem pliki PDF i teksty ofert pod kątem danych kontaktowych producenta (e mail, telefon, strona www).
        </label>
      </div>
      <div>
        <button
          type="button"
          onClick={publish}
          disabled={isPending || !confirmed}
          className="focus-ring rounded-data bg-brand-foundation-navy px-brand-3 py-brand-2 text-data font-medium text-brand-warm-white disabled:opacity-50"
        >
          Opublikuj podsumowanie
        </button>
      </div>
      {error && (
        <p role="alert" className="text-data text-status-blocked">
          {error}
        </p>
      )}
    </section>
  );
}
