"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createProducerGroup } from "@/lib/producer-group-actions";

interface ProducerGroupCreateFormProps {
  locale: string;
}

const fieldClass =
  "focus-ring h-11 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy";

// Spec 0077 AC-23: tworzenie własnej grupy producentów (nazwa 2 do 60 znaków, opis do 300).
export function ProducerGroupCreateForm({ locale }: ProducerGroupCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const description = String(data.get("description") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await createProducerGroup({ name, description });
      if (!result.ok || !result.id) {
        setError(result.error ?? "Nie udało się utworzyć grupy.");
        return;
      }
      router.push(`/${locale}/internal/producer-groups/${result.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-brand-3" aria-label="Nowa grupa producentów">
      <label className="flex flex-col gap-brand-1 text-data">
        <span className="text-brand-technical-graphite">Nazwa grupy (2 do 60 znaków)</span>
        <input name="name" required minLength={2} maxLength={60} className={fieldClass} disabled={isPending} />
      </label>
      <label className="flex flex-col gap-brand-1 text-data">
        <span className="text-brand-technical-graphite">Opis (opcjonalnie, do 300 znaków)</span>
        <textarea
          name="description"
          rows={2}
          maxLength={300}
          disabled={isPending}
          className="focus-ring rounded-data border border-brand-steel bg-brand-warm-white p-brand-2 text-body text-brand-foundation-navy"
        />
      </label>
      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring rounded-data bg-brand-passage-blue px-brand-4 py-brand-2 text-body font-medium text-brand-warm-white disabled:opacity-50"
        >
          {isPending ? "Zapisuję…" : "Utwórz grupę"}
        </button>
      </div>
    </form>
  );
}
