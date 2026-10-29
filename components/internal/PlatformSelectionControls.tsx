"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { finishPlatformSelection, selectPlatformQuote } from "@/lib/platform-project-actions";

const buttonClass =
  "focus-ring inline-flex h-9 items-center rounded-data border border-brand-steel px-brand-3 text-data font-medium hover:bg-brand-steel/30 disabled:opacity-50";

// Spec 0077 AC-16: oznaczenie oferty jako wybranej. Zapisuje tylko oznaczenie (bez maila i zmiany
// statusów), można je zmienić dowolną liczbę razy do zakończenia wyboru.
export function MarkPlatformQuoteButton({
  requestId,
  quoteId,
  isMarked,
}: {
  requestId: string;
  quoteId: string;
  isMarked: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mark() {
    setError(null);
    startTransition(async () => {
      const result = await selectPlatformQuote(requestId, quoteId);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się oznaczyć oferty.");
        return;
      }
      router.refresh();
    });
  }

  if (isMarked) {
    return <span className="text-data font-medium text-emerald-700 dark:text-emerald-300">Oznaczona jako wybrana</span>;
  }
  return (
    <div className="flex flex-col gap-brand-1">
      <button type="button" onClick={mark} disabled={isPending} className={buttonClass}>
        {isPending ? "Zapisywanie…" : "Oznacz jako wybraną"}
      </button>
      {error && (
        <p role="alert" className="text-data text-status-blocked">
          {error}
        </p>
      )}
    </div>
  );
}

// Spec 0077 AC-17: "Zakończ wybór i powiadom". Wymaga oznaczonej oferty i potwierdzenia z liczbą
// producentów, którzy dostaną mail. Po zakończeniu pokazuje listę producentów, którym zakolejkowano mail.
export function FinishPlatformSelectionControl({
  requestId,
  hasMarkedQuote,
  producerCount,
}: {
  requestId: string;
  hasMarkedQuote: boolean;
  producerCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState<string[] | null>(null);

  function finish() {
    setError(null);
    startTransition(async () => {
      const result = await finishPlatformSelection(requestId, true);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zakończyć wyboru.");
        setConfirming(false);
        router.refresh();
        return;
      }
      setQueued(result.queuedProducers ?? []);
      setConfirming(false);
      router.refresh();
    });
  }

  if (queued) {
    return (
      <p role="status" className="text-body font-medium">
        Wybór zakończony.{" "}
        {queued.length > 0 ? `Mail zakolejkowano dla: ${queued.join(", ")}.` : "Maile zostały już wcześniej zakolejkowane."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-brand-2">
      {!confirming ? (
        <div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!hasMarkedQuote || isPending}
            className="focus-ring inline-flex h-10 items-center rounded-data bg-brand-foundation-navy px-brand-4 text-body font-medium text-brand-warm-white disabled:opacity-50"
          >
            Zakończ wybór i powiadom
          </button>
          {!hasMarkedQuote && <p className="mt-brand-1 text-data text-brand-technical-graphite">Najpierw oznacz wybraną ofertę.</p>}
        </div>
      ) : (
        <div role="alertdialog" aria-label="Potwierdzenie zakończenia wyboru" className="flex flex-col gap-brand-2 rounded-card border border-brand-steel p-brand-3">
          <p className="text-body">
            Wybór zostanie zamknięty i nie będzie można go zmienić. Mail z neutralną informacją dostanie {producerCount}{" "}
            {producerCount === 1 ? "producent" : "producentów"} (bez nazwy zwycięzcy i cen).
          </p>
          <div className="flex gap-brand-2">
            <button
              type="button"
              onClick={finish}
              disabled={isPending}
              className="focus-ring inline-flex h-10 items-center rounded-data bg-brand-foundation-navy px-brand-4 text-body font-medium text-brand-warm-white disabled:opacity-50"
            >
              {isPending ? "Kończenie…" : "Tak, zakończ wybór"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={isPending} className={buttonClass}>
              Anuluj
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
    </div>
  );
}
