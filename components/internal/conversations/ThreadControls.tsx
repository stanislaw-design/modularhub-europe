"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { closeThreadAction, createThreadAction, reopenThreadAction, updateThreadAction } from "@/app/[locale]/internal/conversations/actions";
import type { LinkKind } from "@/lib/conversations/constants";
import { PlatformLinkPicker, type PickedPlatformRecord } from "./PlatformLinkPicker";
import { ErrorLine, fieldClass, labelClass, labelTextClass, primaryButtonClass, secondaryButtonClass, useRunAction } from "./shared";

interface ThreadCreateFormProps {
  locale: string;
  partnerId: string;
  admins: { id: string; name: string }[];
  defaultOwnerId: string;
  templates: { key: string; name: string; taskCount: number }[];
}

// Nowa sprawa (AC-9), opcjonalnie z szablonem, który tworzy listę zadań z terminami od dziś.
export function ThreadCreateForm({ locale, partnerId, admins, defaultOwnerId, templates }: ThreadCreateFormProps) {
  const router = useRouter();
  const { run, isPending, error } = useRunAction();
  const [link, setLink] = useState<PickedPlatformRecord | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () =>
        createThreadAction(partnerId, {
          title: String(data.get("title") ?? ""),
          ownerUserId: String(data.get("ownerUserId") ?? ""),
          templateKey: String(data.get("templateKey") ?? "") || null,
          link: link ? { kind: link.kind, id: link.id } : null,
        }),
      (result) => {
        if ("id" in result) router.push(`/${locale}/internal/conversations/threads/${result.id}`);
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-brand-3" aria-label="Nowa sprawa">
      <div className="grid gap-brand-3 sm:grid-cols-3">
        <label className={labelClass}>
          <span className={labelTextClass}>Tytuł sprawy</span>
          <input name="title" required maxLength={200} disabled={isPending} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Właściciel</span>
          <select name="ownerUserId" defaultValue={defaultOwnerId} disabled={isPending} className={fieldClass}>
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Szablon</span>
          <select name="templateKey" defaultValue="" disabled={isPending} className={fieldClass}>
            <option value="">Bez szablonu</option>
            {templates.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name} ({template.taskCount} zadań)
              </option>
            ))}
          </select>
        </label>
      </div>
      <PlatformLinkPicker value={link} onChange={setLink} disabled={isPending} />
      <ErrorLine error={error} />
      <div>
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "Zapisuję…" : "Utwórz sprawę"}
        </button>
      </div>
    </form>
  );
}

interface ThreadEditFormProps {
  threadId: string;
  title: string;
  ownerUserId: string;
  admins: { id: string; name: string }[];
  /** Obecne powiązanie z rekordem platformy. */
  link: { kind: LinkKind; id: string } | null;
  /** Nazwa powiązanego rekordu do pokazania wyboru; bez niej widać sam identyfikator. */
  linkLabel?: string | null;
}

// Edycja tytułu, właściciela i powiązania sprawy z rekordem platformy.
export function ThreadEditForm({ threadId, title, ownerUserId, admins, link: initialLink, linkLabel }: ThreadEditFormProps) {
  const { run, isPending, error } = useRunAction();
  const [link, setLink] = useState<PickedPlatformRecord | null>(
    initialLink ? { kind: initialLink.kind, id: initialLink.id, label: linkLabel ?? initialLink.id } : null,
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(() =>
      updateThreadAction(threadId, {
        title: String(data.get("title") ?? ""),
        ownerUserId: String(data.get("ownerUserId") ?? ""),
        link: link ? { kind: link.kind, id: link.id } : null,
      }),
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-brand-3" aria-label="Edycja sprawy">
      <div className="grid gap-brand-3 sm:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Tytuł sprawy</span>
          <input name="title" required maxLength={200} defaultValue={title} disabled={isPending} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Właściciel</span>
          <select name="ownerUserId" defaultValue={ownerUserId} disabled={isPending} className={fieldClass}>
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <PlatformLinkPicker value={link} onChange={setLink} disabled={isPending} />
      <ErrorLine error={error} />
      <div>
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "Zapisuję…" : "Zapisz sprawę"}
        </button>
      </div>
    </form>
  );
}

interface CloseThreadControlProps {
  threadId: string;
  closed: boolean;
  openTasks: { id: string; title: string }[];
}

// Zamknięcie sprawy (AC-12): dla każdego otwartego zadania trzeba wybrać "zrobione" albo "anulowane".
export function CloseThreadControl({ threadId, closed, openTasks }: CloseThreadControlProps) {
  const [open, setOpen] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, "done" | "cancelled">>({});
  const { run, isPending, error, setError } = useRunAction();

  if (closed) {
    return (
      <div className="flex flex-col items-start gap-brand-1">
        <button type="button" disabled={isPending} onClick={() => run(() => reopenThreadAction(threadId))} className={secondaryButtonClass}>
          Otwórz sprawę ponownie
        </button>
        <ErrorLine error={error} />
      </div>
    );
  }

  const undecided = openTasks.filter((task) => !decisions[task.id]).length;

  function close() {
    run(
      () => closeThreadAction(threadId, decisions),
      () => setOpen(false),
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setDecisions({});
          setOpen(true);
        }}
        className={secondaryButtonClass}
      >
        Zamknij sprawę
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-center justify-center p-brand-3">
          <DialogPanel className="flex max-h-[90vh] w-full max-w-xl flex-col gap-brand-3 overflow-y-auto rounded-data bg-brand-warm-white p-brand-4 text-brand-foundation-navy">
            <DialogTitle className="text-h3 font-semibold">Zamknij sprawę</DialogTitle>
            {openTasks.length === 0 ? (
              <p className="text-body">Sprawa nie ma otwartych zadań. Zamknąć ją?</p>
            ) : (
              <>
                <p className="text-body">Sprawa ma otwarte zadania. Dla każdego wybierz, co z nim zrobić.</p>
                <ul className="flex flex-col gap-brand-2">
                  {openTasks.map((task) => (
                    <li key={task.id}>
                      <fieldset className="rounded-data border border-brand-steel p-brand-2">
                        <legend className="px-brand-1 text-body font-medium">{task.title}</legend>
                        <div className="flex gap-brand-4 text-body">
                          {(["done", "cancelled"] as const).map((value) => (
                            <label key={value} className="flex items-center gap-brand-1">
                              <input
                                type="radio"
                                name={`decision-${task.id}`}
                                checked={decisions[task.id] === value}
                                onChange={() => setDecisions((current) => ({ ...current, [task.id]: value }))}
                              />
                              {value === "done" ? "Zrobione" : "Anulowane"}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <ErrorLine error={error} />
            <div className="flex gap-brand-2">
              <button type="button" disabled={isPending || undecided > 0} onClick={close} className={primaryButtonClass}>
                {isPending ? "Zamykam…" : "Zamknij sprawę"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className={secondaryButtonClass}>
                Anuluj
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
