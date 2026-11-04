"use client";

import { type FormEvent, useRef, useState } from "react";
import { createTaskAction, setTaskStatusAction, updateTaskAction } from "@/app/[locale]/internal/conversations/actions";
import type { TaskStatus } from "@/lib/conversations/constants";
import {
  ErrorLine,
  fieldClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  useRunAction,
} from "./shared";

export interface AdminChoice {
  id: string;
  name: string;
}

interface TaskInitial {
  id: string;
  title: string;
  note: string | null;
  dueDate: string | null;
  assigneeKind: "user" | "external";
  assigneeUserId: string | null;
  externalContactId: string | null;
}

interface TaskFormProps {
  partnerId: string;
  admins: AdminChoice[];
  contacts: { id: string; name: string }[];
  /** Domyślny wykonawca nowego zadania (zalogowany administrator). */
  defaultUserId: string;
  fixedThreadId?: string;
  threads?: { id: string; title: string }[];
  task?: TaskInitial;
  onDone?: () => void;
}

// Zadanie (AC-10): termin to sama data, wykonawca to administrator albo strona zewnętrzna.
// Przy edycji sprawa się nie zmienia.
export function TaskForm({ partnerId, admins, contacts, defaultUserId, fixedThreadId, threads = [], task, onDone }: TaskFormProps) {
  const { run, isPending, error } = useRunAction();
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"user" | "external">(task?.assigneeKind ?? "user");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const assignee =
      kind === "user"
        ? { kind: "user" as const, userId: String(data.get("userId") ?? "") }
        : { kind: "external" as const, contactId: String(data.get("contactId") ?? "") || null };
    const base = {
      title: String(data.get("title") ?? ""),
      note: String(data.get("note") ?? ""),
      dueDate: String(data.get("dueDate") ?? "") || null,
      assignee,
      link: null,
    };
    run(
      () =>
        task
          ? updateTaskAction(task.id, base)
          : createTaskAction(partnerId, { ...base, threadId: fixedThreadId ?? (String(data.get("threadId") ?? "") || null) }),
      () => {
        formRef.current?.reset();
        onDone?.();
      },
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-brand-3" aria-label={task ? "Edycja zadania" : "Nowe zadanie"}>
      <div className="grid gap-brand-3 sm:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Tytuł zadania</span>
          <input name="title" required maxLength={300} defaultValue={task?.title} disabled={isPending} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Termin (opcjonalnie)</span>
          <input name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} disabled={isPending} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Po czyjej stronie</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as "user" | "external")} disabled={isPending} className={fieldClass}>
            <option value="user">Administrator (po naszej stronie)</option>
            <option value="external">Strona zewnętrzna (czekamy na nich)</option>
          </select>
        </label>
        {kind === "user" ? (
          <label className={labelClass}>
            <span className={labelTextClass}>Administrator</span>
            <select name="userId" defaultValue={task?.assigneeUserId ?? defaultUserId} disabled={isPending} className={fieldClass}>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className={labelClass}>
            <span className={labelTextClass}>Osoba kontaktowa (opcjonalnie)</span>
            <select name="contactId" defaultValue={task?.externalContactId ?? ""} disabled={isPending} className={fieldClass}>
              <option value="">Nie podano</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {!task && !fixedThreadId && (
          <label className={labelClass}>
            <span className={labelTextClass}>Sprawa</span>
            <select name="threadId" defaultValue="" disabled={isPending} className={fieldClass}>
              <option value="">Przy samej firmie</option>
              {threads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>Opis (opcjonalnie)</span>
          <input name="note" maxLength={5000} defaultValue={task?.note ?? ""} disabled={isPending} className={fieldClass} />
        </label>
      </div>
      <ErrorLine error={error} />
      <div className="flex gap-brand-2">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "Zapisuję…" : task ? "Zapisz zadanie" : "Dodaj zadanie"}
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

interface TaskRowActionsProps {
  taskId: string;
  status: TaskStatus;
  /** Gdy podane, pokazuje też edycję (karty firmy i sprawy; "Najbliższe" tylko odhacza). */
  edit?: Omit<TaskFormProps, "task" | "onDone" | "fixedThreadId" | "threads"> & { task: TaskInitial };
}

// Odhaczenie, anulowanie, ponowne otwarcie i edycja zadania (AC-10). Błąd (np. zamknięta sprawa) widać przy wierszu.
export function TaskRowActions({ taskId, status, edit }: TaskRowActionsProps) {
  const { run, isPending, error } = useRunAction();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col items-end gap-brand-1">
      <div className="flex flex-wrap justify-end gap-brand-1">
        {status === "open" ? (
          <>
            <button type="button" disabled={isPending} onClick={() => run(() => setTaskStatusAction(taskId, "done"))} className={secondaryButtonClass}>
              Zrobione
            </button>
            <button type="button" disabled={isPending} onClick={() => run(() => setTaskStatusAction(taskId, "cancelled"))} className={secondaryButtonClass}>
              Anuluj
            </button>
          </>
        ) : (
          <button type="button" disabled={isPending} onClick={() => run(() => setTaskStatusAction(taskId, "open"))} className={secondaryButtonClass}>
            Otwórz ponownie
          </button>
        )}
        {edit && (
          <button type="button" onClick={() => setEditing((value) => !value)} className={secondaryButtonClass}>
            {editing ? "Zwiń" : "Edytuj"}
          </button>
        )}
      </div>
      <ErrorLine error={error} />
      {edit && editing && (
        <div className="mt-brand-2 w-full min-w-[20rem] text-left">
          <TaskForm {...edit} onDone={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}
