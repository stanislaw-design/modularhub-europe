"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { extendDeadline } from "@/lib/large-order-admin-actions";

interface ExtendDeadlineControlProps {
  id: string;
  kind: "request" | "product";
}

// Spec 0070 AC-9: administrator zmienia termin ofert. Pole datetime-local jest w
// czasie przeglądarki, na serwer idzie moment w UTC. router.refresh() po zapisie
// zamiast stanu optymistycznego, jak w ProducerOverridesAdminSection.
export function ExtendDeadlineControl({ id, kind }: ExtendDeadlineControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const parsed = new Date(value);
    if (!value || Number.isNaN(parsed.getTime())) {
      setError("Podaj datę i godzinę.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await extendDeadline(id, kind, parsed.toISOString());
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zmienić terminu.");
        return;
      }
      setOpen(false);
      setValue("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring mt-brand-1 rounded-data text-data font-medium text-brand-passage-blue underline"
      >
        Zmień termin
      </button>
    );
  }

  return (
    <div className="mt-brand-2 flex flex-col gap-brand-2">
      <label className="flex flex-col gap-brand-1 text-data">
        <span className="text-brand-technical-graphite">Nowy termin ofert</span>
        <input
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={isPending}
          className="focus-ring rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 py-brand-1"
        />
      </label>
      <div className="flex gap-brand-3 text-data">
        <button type="button" onClick={save} disabled={isPending} className="focus-ring rounded-data font-medium text-brand-passage-blue underline disabled:opacity-50">
          Zapisz termin
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="focus-ring rounded-data underline disabled:opacity-50">
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
