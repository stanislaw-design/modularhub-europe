"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";
import { inviteAdmin } from "@/lib/admin-account-actions";

const fieldClass =
  "focus-ring h-11 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy";

// Spec 0077 D AC-35: zaproszenie nowego administratora (e mail, imię, telefon służbowy).
export function AdminInviteForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    setError(null);
    setDone(null);
    startTransition(async () => {
      const result = await inviteAdmin({ email, name: String(data.get("name") ?? ""), phone: String(data.get("phone") ?? "") });
      if (!result.ok) {
        setError(result.error ?? "Nie udało się wysłać zaproszenia.");
        router.refresh();
        return;
      }
      formRef.current?.reset();
      setDone(`Zaproszenie wysłano na adres ${email.trim().toLowerCase()}.`);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-brand-3" aria-label="Zaproś administratora">
      <div className="grid gap-brand-3 sm:grid-cols-3">
        <label className="flex flex-col gap-brand-1 text-data">
          <span className="text-brand-technical-graphite">Adres e mail</span>
          <input name="email" type="email" required autoComplete="off" disabled={isPending} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-brand-1 text-data">
          <span className="text-brand-technical-graphite">Imię i nazwisko</span>
          <input name="name" required maxLength={120} autoComplete="off" disabled={isPending} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-brand-1 text-data">
          <span className="text-brand-technical-graphite">Telefon (może być służbowy)</span>
          <input name="phone" type="tel" required minLength={5} maxLength={40} autoComplete="off" disabled={isPending} className={fieldClass} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-body text-brand-foundation-navy">
          {done}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring rounded-data bg-brand-passage-blue px-brand-4 py-brand-2 text-body font-medium text-brand-warm-white disabled:opacity-50"
        >
          {isPending ? "Wysyłam…" : "Wyślij zaproszenie"}
        </button>
      </div>
    </form>
  );
}
