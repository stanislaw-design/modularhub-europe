"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import {
  addProducerToGroup,
  deleteProducerGroup,
  removeProducerFromGroup,
  searchProducersForGroup,
  updateProducerGroup,
} from "@/lib/producer-group-actions";

interface ProducerGroupManagerProps {
  locale: string;
  group: { id: string; name: string; description: string | null };
  members: { id: string; name: string; countryCode: string; eligible: boolean }[];
}

const fieldClass =
  "focus-ring h-11 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy";
const legendClass = "mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite";
const linkButtonClass = "focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50";

// Spec 0077 AC-23, AC-24: szczegół własnej grupy. Zmiana nazwy i opisu, usunięcie z potwierdzeniem
// (kaskada na członków, projekty bez zmian), dodawanie producentów przez wyszukiwanie po nazwie i
// usuwanie ich z grupy. Członek usunięty lub z zablokowanym kontem jest oznaczony i pomijany przy rozwinięciu.
export function ProducerGroupManager({ locale, group, members }: ProducerGroupManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; countryCode: string }[] | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    setNotice(null);
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

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => updateProducerGroup(group.id, { name: String(data.get("name") ?? ""), description: String(data.get("description") ?? "") }),
      () => setNotice("Zapisano."),
    );
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      setResults(await searchProducersForGroup(query, members.map((item) => item.id)));
    });
  }

  function onAdd(producerId: string) {
    run(
      () => addProducerToGroup(group.id, producerId),
      () => setResults((current) => (current ? current.filter((item) => item.id !== producerId) : current)),
    );
  }

  return (
    <div className="flex flex-col gap-brand-5">
      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-body text-brand-foundation-navy">
          {notice}
        </p>
      )}

      <form onSubmit={onSave} className="flex flex-col gap-brand-3" aria-label="Nazwa i opis grupy">
        <label className="flex flex-col gap-brand-1 text-data">
          <span className="text-brand-technical-graphite">Nazwa grupy</span>
          <input name="name" defaultValue={group.name} required minLength={2} maxLength={60} className={fieldClass} disabled={isPending} />
        </label>
        <label className="flex flex-col gap-brand-1 text-data">
          <span className="text-brand-technical-graphite">Opis</span>
          <textarea
            name="description"
            defaultValue={group.description ?? ""}
            rows={2}
            maxLength={300}
            disabled={isPending}
            className="focus-ring rounded-data border border-brand-steel bg-brand-warm-white p-brand-2 text-body text-brand-foundation-navy"
          />
        </label>
        <div>
          <button
            type="submit"
            disabled={isPending}
            className="focus-ring rounded-data bg-brand-passage-blue px-brand-4 py-brand-2 text-body font-medium text-brand-warm-white disabled:opacity-50"
          >
            Zapisz nazwę i opis
          </button>
        </div>
      </form>

      <section className="flex flex-col gap-brand-2" aria-label="Członkowie grupy">
        <h2 className={legendClass}>Członkowie ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-body text-brand-technical-graphite">Grupa jest pusta. Dodaj producentów wyszukiwarką poniżej.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-brand-steel rounded-data border border-brand-steel">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-brand-3 px-brand-3 py-brand-2 text-body">
                <span>
                  {member.name} <span className="text-label text-brand-technical-graphite">({member.countryCode})</span>
                  {!member.eligible && (
                    <span className="ml-brand-2 rounded-data border border-status-blocked px-brand-1 text-label text-status-blocked">
                      usunięty lub zablokowany, pomijany przy rozwinięciu
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => removeProducerFromGroup(group.id, member.id))}
                  className={linkButtonClass}
                  aria-label={`Usuń ${member.name} z grupy`}
                >
                  Usuń z grupy
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-brand-2" aria-label="Dodaj producenta">
        <h2 className={legendClass}>Dodaj producenta</h2>
        <form onSubmit={onSearch} className="flex gap-brand-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj producenta po nazwie"
            aria-label="Szukaj producenta po nazwie"
            className={fieldClass}
          />
          <button
            type="submit"
            disabled={isPending || query.trim() === ""}
            className="focus-ring rounded-data border border-brand-steel px-brand-4 text-body disabled:opacity-50"
          >
            Szukaj
          </button>
        </form>
        {results && results.length === 0 && <p className="text-body text-brand-technical-graphite">Nie znaleziono producentów.</p>}
        {results && results.length > 0 && (
          <ul className="flex flex-col divide-y divide-brand-steel rounded-data border border-brand-steel">
            {results.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-brand-3 px-brand-3 py-brand-2 text-body">
                <span>
                  {item.name} <span className="text-label text-brand-technical-graphite">({item.countryCode})</span>
                </span>
                <button type="button" disabled={isPending} onClick={() => onAdd(item.id)} className={linkButtonClass}>
                  Dodaj do grupy
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-brand-2 border-t border-brand-steel pt-brand-4" aria-label="Usuwanie grupy">
        {confirmingDelete ? (
          <div className="flex flex-col gap-brand-2">
            <p className="text-body">
              Usunąć grupę „{group.name}” razem z listą jej członków? Projekty już założone z tej grupy zostają bez zmian.
            </p>
            <div className="flex gap-brand-3">
              <button type="button" onClick={() => setConfirmingDelete(false)} className={linkButtonClass} disabled={isPending}>
                Anuluj
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => deleteProducerGroup(group.id, true), () => router.push(`/${locale}/internal/producer-groups`))}
                className="focus-ring rounded-data bg-status-blocked px-brand-4 py-brand-1 text-body font-medium text-brand-warm-white disabled:opacity-50"
              >
                Tak, usuń grupę
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button type="button" onClick={() => setConfirmingDelete(true)} className="focus-ring rounded-data text-status-blocked underline">
              Usuń grupę
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
