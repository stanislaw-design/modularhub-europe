"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setAdvisorNote, unpublishQuote } from "@/lib/large-order-admin-actions";

interface QuotePublicationControlsProps {
  quoteId: string;
  advisorNote: string | null;
  // Oferta jest u klienta (published_to_client_at ustawione).
  isPublished: boolean;
  // Klient wybrał tę ofertę, więc publikacji nie cofamy.
  isSelected: boolean;
}

// Spec 0070 AC-14: komentarz ModularHub (tylko przed publikacją) i cofnięcie
// publikacji oferty, które odblokowuje producentowi nową wersję.
export function QuotePublicationControls({ quoteId, advisorNote, isPublished, isSelected }: QuotePublicationControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(advisorNote ?? "");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać zmiany.");
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <div className="flex flex-wrap items-center gap-brand-3 text-data">
        {!isPublished && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="focus-ring rounded-data font-medium text-brand-passage-blue underline">
            {advisorNote ? "Zmień komentarz ModularHub" : "Dodaj komentarz ModularHub"}
          </button>
        )}
        {isPublished && !isSelected && (
          <button
            type="button"
            onClick={() => run(() => unpublishQuote(quoteId))}
            disabled={isPending}
            className="focus-ring rounded-data font-medium text-brand-passage-blue underline disabled:opacity-50"
          >
            Cofnij publikację
          </button>
        )}
      </div>
      {editing && (
        <div className="flex flex-col gap-brand-2">
          <label className="flex flex-col gap-brand-1 text-data">
            <span className="text-brand-technical-graphite">
              Komentarz ModularHub (widoczny klientowi po publikacji, bez oceny i punktacji)
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isPending}
              rows={3}
              maxLength={2000}
              className="focus-ring rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 py-brand-1"
            />
          </label>
          <div className="flex gap-brand-3 text-data">
            <button
              type="button"
              onClick={() => run(() => setAdvisorNote(quoteId, note), () => setEditing(false))}
              disabled={isPending}
              className="focus-ring rounded-data font-medium text-brand-passage-blue underline disabled:opacity-50"
            >
              Zapisz komentarz
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setNote(advisorNote ?? "");
                setError(null);
              }}
              disabled={isPending}
              className="focus-ring rounded-data underline disabled:opacity-50"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-data text-status-blocked">
          {error}
        </p>
      )}
    </div>
  );
}
