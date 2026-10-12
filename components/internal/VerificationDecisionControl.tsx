"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setClientB2bVerification, setProducerVolumeVerification } from "@/lib/project-quote-actions";

interface VerificationDecisionControlProps {
  target: "producer" | "client";
  targetId: string;
  // Obecny status: pokazujemy tylko decyzję, która jeszcze coś zmienia.
  currentStatus: "not_submitted" | "pending" | "approved" | "rejected";
}

// Zatwierdź/odrzuć dla ekranów zatwierdzeń (spec 0070 AC-3, AC-4). Odrzucenie
// wymaga powodu tekstowego, ten sam układ co ProducerBlockControl;
// router.refresh() po sukcesie zamiast stanu optymistycznego.
export function VerificationDecisionControl({ target, targetId, currentStatus }: VerificationDecisionControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function decide(status: "approved" | "rejected") {
    setError(null);
    if (status === "rejected" && reason.trim() === "") {
      setError("Podaj powód odrzucenia.");
      return;
    }
    startTransition(async () => {
      const result =
        target === "producer"
          ? await setProducerVolumeVerification(targetId, status, reason)
          : await setClientB2bVerification(targetId, status, reason);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać decyzji.");
        return;
      }
      router.refresh();
    });
  }

  if (isRejecting) {
    return (
      <div className="flex flex-col items-start gap-brand-1">
        <label htmlFor={`reject-reason-${targetId}`} className="text-body font-medium">
          Powód odrzucenia
        </label>
        <textarea
          id={`reject-reason-${targetId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          className="w-64 rounded-data border border-brand-steel p-brand-1 text-body"
        />
        <div className="flex flex-wrap gap-brand-2">
          <button
            type="button"
            onClick={() => {
              setIsRejecting(false);
              setReason("");
              setError(null);
            }}
            className="focus-ring inline-flex h-9 items-center gap-brand-1 whitespace-nowrap rounded-data border px-brand-3 text-data font-medium disabled:opacity-50 border-brand-steel text-brand-technical-graphite hover:bg-brand-steel/30"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => decide("rejected")}
            disabled={isPending}
            className="focus-ring inline-flex h-9 items-center gap-brand-1 whitespace-nowrap rounded-data border px-brand-3 text-data font-medium disabled:opacity-50 border-status-blocked/40 bg-status-blocked/10 text-status-blocked hover:bg-status-blocked/20"
          >
            <X className="size-4" aria-hidden="true" />
            Potwierdź odrzucenie
          </button>
        </div>
        {error && (
          <span role="alert" className="text-body text-status-blocked">
            {error}
          </span>
        )}
      </div>
    );
  }

  const canApprove = currentStatus !== "approved";
  const canReject = currentStatus !== "rejected";

  return (
    <div className="flex flex-col items-start gap-brand-1">
      <div className="flex flex-wrap gap-brand-2">
        {canApprove && (
          <button
            type="button"
            onClick={() => decide("approved")}
            disabled={isPending}
            className="focus-ring inline-flex h-9 items-center gap-brand-1 whitespace-nowrap rounded-data border px-brand-3 text-data font-medium disabled:opacity-50 border-status-approved/40 bg-status-approved/10 text-status-approved hover:bg-status-approved/20"
          >
            <Check className="size-4" aria-hidden="true" />
            Zatwierdź
          </button>
        )}
        {canReject && (
          <button
            type="button"
            onClick={() => setIsRejecting(true)}
            disabled={isPending}
            className="focus-ring inline-flex h-9 items-center gap-brand-1 whitespace-nowrap rounded-data border px-brand-3 text-data font-medium disabled:opacity-50 border-brand-steel text-brand-technical-graphite hover:border-status-blocked/40 hover:bg-status-blocked/10 hover:text-status-blocked"
          >
            {currentStatus === "approved" ? "Cofnij zatwierdzenie" : "Odrzuć"}
          </button>
        )}
      </div>
      {error && (
        <span role="alert" className="text-body text-status-blocked">
          {error}
        </span>
      )}
    </div>
  );
}
