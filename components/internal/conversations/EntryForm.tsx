"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { createEntryAction, updateEntryAction } from "@/app/[locale]/internal/conversations/actions";
import {
  ENTRY_CHANNEL_LABELS,
  ENTRY_CHANNELS,
  ENTRY_DIRECTION_LABELS,
  ENTRY_DIRECTIONS,
  type EntryChannel,
  type EntryDirection,
} from "@/lib/conversations/constants";
import { ATTACHMENT_ACCEPT, checkFilesBeforeUpload, formatFileSize, uploadEntryAttachments } from "./upload-attachments";
import {
  ErrorLine,
  fieldClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
  useRunAction,
} from "./shared";

interface EntryFormProps {
  partnerId: string;
  contacts: { id: string; name: string }[];
  /** Sprawa przypięta na stałe (karta sprawy) albo lista do wyboru (karta firmy). */
  fixedThreadId?: string;
  threads?: { id: string; title: string }[];
  /** Gdy podane, formularz edytuje istniejący wpis (AC-13). */
  entry?: {
    id: string;
    threadId: string | null;
    contactId: string | null;
    occurredAtLocal: string;
    direction: EntryDirection;
    channel: EntryChannel;
    body: string;
  };
  /** Ile aktywnych plików ma już edytowany wpis (limit pięciu na wpis). */
  attachmentCount?: number;
  onDone?: () => void;
}

// Wpis w dzienniku (AC-13). Autor i źródło ustawia serwer, a pusta data oznacza "teraz".
export function EntryForm({ partnerId, contacts, fixedThreadId, threads = [], entry, attachmentCount = 0, onDone }: EntryFormProps) {
  const router = useRouter();
  const { run, isPending, error, setError } = useRunAction();
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      threadId: fixedThreadId ?? (String(data.get("threadId") ?? "") || null),
      contactId: String(data.get("contactId") ?? "") || null,
      occurredAtLocal: String(data.get("occurredAtLocal") ?? "") || null,
      direction: String(data.get("direction")) as EntryDirection,
      channel: String(data.get("channel")) as EntryChannel,
      body: String(data.get("body") ?? ""),
    };
    const fileError = checkFilesBeforeUpload(files, attachmentCount);
    if (fileError) {
      setError(fileError);
      return;
    }
    const pending = files;
    run(
      async () => {
        const saved = entry ? await updateEntryAction(entry.id, input) : await createEntryAction(partnerId, input);
        if (!saved.ok || pending.length === 0) return saved;
        const createdId = (saved as { id?: unknown }).id;
        const entryId = entry ? entry.id : typeof createdId === "string" ? createdId : null;
        if (!entryId) return saved;
        const failure = await uploadEntryAttachments(entryId, pending);
        if (!failure) return saved;
        // Wpis jest już zapisany, więc formularz się czyści, a plik trzeba dodać ponownie przy edycji wpisu.
        reset();
        router.refresh();
        return { ok: false as const, error: `Wpis zapisano, ale nie wszystkie pliki zostały dodane. ${failure} Dodaj brakujące pliki przez „Edytuj”.` };
      },
      () => {
        reset();
        onDone?.();
      },
    );
  }

  function reset() {
    if (!entry) formRef.current?.reset();
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-brand-3"
      aria-label={entry ? "Edycja wpisu" : "Nowy wpis w dzienniku"}
    >
      <div className="grid gap-brand-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>
          <span className={labelTextClass}>Kierunek</span>
          <select name="direction" defaultValue={entry?.direction ?? "outbound"} disabled={isPending} className={fieldClass}>
            {ENTRY_DIRECTIONS.map((value) => (
              <option key={value} value={value}>
                {ENTRY_DIRECTION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Kanał</span>
          <select name="channel" defaultValue={entry?.channel ?? "phone"} disabled={isPending} className={fieldClass}>
            {ENTRY_CHANNELS.map((value) => (
              <option key={value} value={value}>
                {ENTRY_CHANNEL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Data i godzina (puste = teraz)</span>
          <input
            name="occurredAtLocal"
            type="datetime-local"
            defaultValue={entry?.occurredAtLocal}
            disabled={isPending}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Osoba kontaktowa</span>
          <select name="contactId" defaultValue={entry?.contactId ?? ""} disabled={isPending} className={fieldClass}>
            <option value="">Nie podano</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </label>
        {!fixedThreadId && (
          <label className={labelClass}>
            <span className={labelTextClass}>Sprawa</span>
            <select name="threadId" defaultValue={entry?.threadId ?? ""} disabled={isPending} className={fieldClass}>
              <option value="">Bez sprawy</option>
              {threads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className={labelClass}>
        <span className={labelTextClass}>Treść</span>
        <textarea
          name="body"
          required
          rows={4}
          maxLength={10000}
          defaultValue={entry?.body}
          disabled={isPending}
          className={textareaClass}
        />
      </label>
      <div className={labelClass}>
        <label htmlFor={`entry-files-${entry?.id ?? "new"}`} className={labelTextClass}>
          Pliki (PDF, JPEG, PNG, WebP, do 20 MB każdy, najwyżej 5 na wpis)
        </label>
        <input
          ref={fileInputRef}
          id={`entry-files-${entry?.id ?? "new"}`}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          disabled={isPending}
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          className="focus-ring text-body"
        />
        {files.length > 0 && (
          <ul className="text-data text-brand-technical-graphite">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>
                {file.name} ({formatFileSize(file.size)})
              </li>
            ))}
          </ul>
        )}
      </div>
      <ErrorLine error={error} />
      <div className="flex gap-brand-2">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? (files.length ? "Wysyłam pliki…" : "Zapisuję…") : entry ? "Zapisz wpis" : "Dodaj wpis"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className={secondaryButtonClass}>
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}
