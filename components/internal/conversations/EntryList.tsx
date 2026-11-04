"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import { deleteEntryAction, deleteEntryAttachmentAction } from "@/app/[locale]/internal/conversations/actions";
import type { EntryChannel, EntryDirection } from "@/lib/conversations/constants";
import { EntryForm } from "./EntryForm";
import { ErrorLine, secondaryButtonClass, useRunAction } from "./shared";
import { formatFileSize } from "./upload-attachments";

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
  attachments: { id: string; filename: string; sizeBytes: number }[];
}

interface EntryListProps {
  locale: string;
  /** Odczyt załączników zawiódł: wpisy się pokazują, a miejsce na pliki mówi, że są niedostępne (AC-3). */
  attachmentsUnavailable?: boolean;
  partnerId: string;
  entries: EntryItem[];
  contacts: { id: string; name: string }[];
  /** Sprawy do wyboru przy edycji (na karcie sprawy sprawa jest stała). */
  threads?: { id: string; title: string }[];
  fixedThreadId?: string;
}

// Lista wpisów dziennika z edycją i miękkim usuwaniem (AC-13): każdy administrator może zmienić każdy wpis.
export function EntryList({ locale, attachmentsUnavailable = false, partnerId, entries, contacts, threads, fixedThreadId }: EntryListProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const { run, isPending, error } = useRunAction();

  return (
    <>
      <ul className="flex flex-col gap-brand-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-data border border-brand-steel/60 p-brand-3">
            {editing === entry.id ? (
              <>
              <EntryForm
                partnerId={partnerId}
                contacts={contacts}
                threads={threads}
                fixedThreadId={fixedThreadId}
                entry={entry}
                attachmentCount={entry.attachments.length}
                onDone={() => setEditing(null)}
              />
              {entry.attachments.length > 0 && (
                <ul className="mt-brand-2 flex flex-col gap-brand-1">
                  {entry.attachments.map((file) => (
                    <li key={file.id} className="flex flex-wrap items-center gap-brand-2 text-data">
                      <span>{file.filename}</span>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (window.confirm(`Usunąć plik „${file.filename}”?`)) run(() => deleteEntryAttachmentAction(file.id));
                        }}
                        className="focus-ring underline"
                      >
                        Usuń plik
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              </>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-brand-3">
                <div className="min-w-0 flex-1">
                  <p className="text-data text-brand-technical-graphite">{entry.meta}</p>
                  <p className="mt-brand-1 whitespace-pre-wrap text-body">{entry.body}</p>
                  {attachmentsUnavailable ? (
                    <p className="mt-brand-1 text-data text-brand-technical-graphite">Pliki chwilowo niedostępne.</p>
                  ) : (
                    entry.attachments.length > 0 && (
                      <ul className="mt-brand-2 flex flex-col gap-brand-1" aria-label="Załączniki wpisu">
                        {entry.attachments.map((file) => (
                          <li key={file.id} className="flex items-center gap-brand-1 text-data">
                            <Paperclip aria-hidden="true" className="h-4 w-4" />
                            <a href={`/${locale}/internal/conversations/attachments/${file.id}`} className="focus-ring underline">
                              {file.filename}
                            </a>
                            <span className="text-brand-technical-graphite">({formatFileSize(file.sizeBytes)})</span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
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
