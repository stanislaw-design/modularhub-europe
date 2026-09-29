"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockProducer, unblockProducer } from "@/lib/producer-block-actions";

interface ProducerBlockControlProps {
  producerId: string;
  isBlocked: boolean;
}

// AC-11: blokuj/odblokuj wprost na liście producentów, bez osobnego ekranu.
// router.refresh() po sukcesie zamiast lokalnego stanu optymistycznego, ten
// sam wzorzec co ProductPhotoManager (internal/products/AGENTS.md) — niski
// ruch, zgodność z bazą ważniejsza niż optymistyczne UI. blockProducer/
// unblockProducer operują na producerId (spec 0057 AC-5): odcinają wszystkich
// dzisiejszych członków tego producenta naraz, nie jedno konto.
export function ProducerBlockControl({ producerId, isBlocked }: ProducerBlockControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBlocking, setIsBlocking] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleUnblock() {
    setError(null);
    startTransition(async () => {
      const result = await unblockProducer(producerId);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się odblokować producenta.");
        return;
      }
      router.refresh();
    });
  }

  function handleConfirmBlock() {
    setError(null);
    startTransition(async () => {
      const result = await blockProducer(producerId, reason);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zablokować producenta.");
        return;
      }
      setIsBlocking(false);
      setReason("");
      router.refresh();
    });
  }

  if (isBlocked) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleUnblock}
          disabled={isPending}
          className="focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50"
        >
          Odblokuj
        </button>
        {error && <span className="text-body text-status-blocked">{error}</span>}
      </div>
    );
  }

  if (isBlocking) {
    return (
      <div className="flex flex-col items-end gap-brand-1">
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Powód (opcjonalnie)"
          rows={2}
          className="w-56 rounded-data border border-brand-steel p-brand-1 text-body"
        />
        <div className="flex gap-brand-2">
          <button
            type="button"
            onClick={() => {
              setIsBlocking(false);
              setReason("");
              setError(null);
            }}
            className="focus-ring rounded-data text-brand-technical-graphite underline"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleConfirmBlock}
            disabled={isPending}
            className="focus-ring rounded-data font-medium text-status-blocked underline disabled:opacity-50"
          >
            Potwierdź blokadę
          </button>
        </div>
        {error && <span className="text-body text-status-blocked">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsBlocking(true)}
      className="focus-ring rounded-data text-status-blocked underline"
    >
      Zablokuj
    </button>
  );
}
