"use client";

import { useState } from "react";
import { deleteEntryAction } from "@/app/[locale]/internal/conversations/actions";
import type { EntryChannel, EntryDirection } from "@/lib/conversations/constants";
import { EntryForm } from "./EntryForm";
import { ErrorLine, secondaryButtonClass, useRunAction } from "./shared";

export interface EntryItem {
  id: string;
  /** Nagłówek wpisu złożony na serwerze (data, kierunek, kanał, osoba, autor, adnotacja). */
  meta: string;
  body: string;
  threadId: string | null;
  contactId: string | null;
  occurredAtLocal: string;
  direction: EntryDirection;
  channel: EntryChannel;
}

interface EntryListProps {
  partnerId: string;
  entries: EntryItem[];
  contacts: { id: string; name: string }[];
  /** Sprawy do wyboru przy edycji (na karcie sprawy sprawa jest stała). */
  threads?: { id: string; title: string }[];
  fixedThreadId?: string;
}

// Lista wpisów dziennika z edycją i miękkim usuwaniem (AC-13): każdy administrator może zmienić każdy wpis.
export function EntryList({ partnerId, entries, contacts, threads, fixedThreadId }: EntryListProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const { run, isPending, error } = useRunAction();

  return (
    <>
      <ul className="flex flex-col gap-brand-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-data border border-brand-steel/60 p-brand-3">
            {editing === entry.id ? (
              <EntryForm
                partnerId={partnerId}
                contacts={contacts}
                threads={threads}
                fixedThreadId={fixedThreadId}
                entry={entry}
                onDone={() => setEditing(null)}
              />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-brand-3">
                <div className="min-w-0 flex-1">
                  <p className="text-data text-brand-technical-graphite">{entry.meta}</p>
                  <p className="mt-brand-1 whitespace-pre-wrap text-body">{entry.body}</p>
                </div>
                <div className="flex gap-brand-2">
                  <button type="button" onClick={() => setEditing(entry.id)} className={secondaryButtonClass}>
                    Edytuj
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (window.confirm("Usunąć ten wpis?")) run(() => deleteEntryAction(entry.id));
                    }}
                    className={secondaryButtonClass}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <ErrorLine error={error} />
    </>
  );
}
