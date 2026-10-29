"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelAdminInvite, resendAdminInvite, restoreAdmin, revokeAdmin } from "@/lib/admin-account-actions";

const linkButton = "focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50";

function useAdminAction() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Nie udało się wykonać akcji.");
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return { isPending, error, run };
}

// Spec 0077 D AC-36: wyślij ponownie (nowa data ważności) albo anuluj zaproszenie.
export function AdminInviteControls({ email }: { email: string }) {
  const { isPending, error, run } = useAdminAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-brand-3">
        <button type="button" disabled={isPending} onClick={() => run(() => resendAdminInvite(email))} className={linkButton}>
          Wyślij ponownie
        </button>
        <button type="button" disabled={isPending} onClick={() => run(() => cancelAdminInvite(email))} className={linkButton}>
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

// Spec 0077 D AC-38, AC-39: odebranie dostępu z powodem. Ochrona ostatniego admina jest w akcji.
export function RevokeAdminControl({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const { isPending, error, run } = useAdminAction();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className={linkButton}>
        {isSelf ? "Odbierz dostęp sobie" : "Odbierz dostęp"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex flex-col gap-1 text-data">
        <span className="text-brand-technical-graphite">Powód (opcjonalnie)</span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
          disabled={isPending}
          className="focus-ring h-9 w-64 rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body"
        />
      </label>
      <div className="flex gap-brand-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(
              () => revokeAdmin(userId, reason),
              () => {
                setIsOpen(false);
                setReason("");
              },
            )
          }
          className="focus-ring rounded-data bg-status-blocked px-brand-3 py-1 text-body font-medium text-brand-warm-white disabled:opacity-50"
        >
          {isPending ? "Zapisuję…" : "Potwierdź odebranie"}
        </button>
        <button type="button" disabled={isPending} onClick={() => setIsOpen(false)} className={linkButton}>
          Wróć
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-xs text-right text-data text-status-blocked">
          {error}
        </p>
      )}
    </div>
  );
}

export function RestoreAdminControl({ userId }: { userId: string }) {
  const { isPending, error, run } = useAdminAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={isPending} onClick={() => run(() => restoreAdmin(userId))} className={linkButton}>
        Przywróć dostęp
      </button>
      {error && (
        <p role="alert" className="text-data text-status-blocked">
          {error}
        </p>
      )}
    </div>
  );
}
