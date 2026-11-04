"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Plus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { createQuickEntryAction, findSimilarPartnersAction } from "@/app/[locale]/internal/conversations/actions";
import {
  ENTRY_CHANNEL_LABELS,
  ENTRY_CHANNELS,
  ENTRY_DIRECTION_LABELS,
  ENTRY_DIRECTIONS,
  PARTNER_KIND_LABELS,
  PARTNER_KINDS,
  type EntryChannel,
  type EntryDirection,
  type PartnerKind,
} from "@/lib/conversations/constants";
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

export interface QuickEntryDialogProps {
  locale: string;
  currentUserId: string;
  admins: { id: string; name: string }[];
  partners: { id: string; name: string }[];
  threads: { id: string; partnerId: string; title: string }[];
  contacts: { id: string; partnerId: string; name: string }[];
  templates: { key: string; name: string; taskCount: number }[];
}

const NEW = "__new__";
const NONE = "__none__";
const MAX_TASKS = 10;

// Szybki wpis (AC-17), dostępny z każdego ekranu sekcji: firma (istniejąca lub nowa), opcjonalnie
// sprawa, wpis i zadania następne zapisują się jednym atomowym wywołaniem.
export function QuickEntryDialog({ locale, currentUserId, admins, partners, threads, contacts, templates }: QuickEntryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { run, isPending, error, setError } = useRunAction();
  const [partnerChoice, setPartnerChoice] = useState<string>(NEW);
  const [threadChoice, setThreadChoice] = useState<string>(NONE);
  const [filter, setFilter] = useState("");
  const [taskKeys, setTaskKeys] = useState<number[]>([]);
  const [nextKey, setNextKey] = useState(0);
  const [similar, setSimilar] = useState<{ id: string; name: string; archived: boolean }[]>([]);
  const [checking, setChecking] = useState(false);

  const visiblePartners = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? partners.filter((partner) => partner.name.toLowerCase().includes(needle) || partner.id === partnerChoice) : partners;
  }, [filter, partners, partnerChoice]);
  const partnerThreads = threads.filter((thread) => thread.partnerId === partnerChoice);
  const partnerContacts = contacts.filter((contact) => contact.partnerId === partnerChoice);
  const isNewPartner = partnerChoice === NEW;

  function reset() {
    setPartnerChoice(NEW);
    setThreadChoice(NONE);
    setFilter("");
    setTaskKeys([]);
    setSimilar([]);
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");

    const newPartnerName = text("partnerName");
    if (isNewPartner && !similar.length) {
      setChecking(true);
      const found = await findSimilarPartnersAction(newPartnerName);
      setChecking(false);
      if (found.ok && found.similar.length) {
        setSimilar(found.similar);
        return;
      }
    }

    const partner = isNewPartner
      ? { create: { name: newPartnerName, kind: text("partnerKind") as PartnerKind, tags: [] as string[] } }
      : { id: partnerChoice };
    const thread =
      threadChoice === NONE
        ? null
        : threadChoice === NEW
          ? { create: { title: text("threadTitle"), ownerUserId: text("threadOwner"), templateKey: text("threadTemplate") || null } }
          : { id: threadChoice };
    const tasks = taskKeys.map((key) => {
      const assignee = text(`task-${key}-assignee`);
      return {
        title: text(`task-${key}-title`),
        dueDate: text(`task-${key}-due`) || null,
        assignee:
          assignee === "external"
            ? { kind: "external" as const, contactId: null }
            : { kind: "user" as const, userId: assignee },
      };
    });

    run(
      () =>
        createQuickEntryAction({
          partner,
          thread,
          entry: {
            contactId: isNewPartner ? null : text("contactId") || null,
            occurredAtLocal: text("occurredAtLocal") || null,
            direction: text("direction") as EntryDirection,
            channel: text("channel") as EntryChannel,
            body: text("body"),
          },
          tasks,
        }),
      (result) => {
        setOpen(false);
        reset();
        if ("partnerId" in result) router.push(`/${locale}/internal/conversations/partners/${result.partnerId}`);
      },
    );
  }

  const busy = isPending || checking;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButtonClass}>
        <Zap className="mr-1 size-4" aria-hidden="true" />
        Szybki wpis
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-brand-3">
          <DialogPanel className="my-brand-4 w-full max-w-3xl rounded-data bg-brand-warm-white p-brand-4 text-brand-foundation-navy">
            <DialogTitle className="text-h3 font-semibold">Szybki wpis</DialogTitle>
            <form onSubmit={onSubmit} className="mt-brand-3 flex flex-col gap-brand-4" aria-label="Szybki wpis">
              <fieldset className="flex flex-col gap-brand-3">
                <legend className="mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">Firma</legend>
                <label className={labelClass}>
                  <span className={labelTextClass}>Szukaj na liście</span>
                  <input value={filter} onChange={(event) => setFilter(event.target.value)} disabled={busy} className={fieldClass} />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>Firma</span>
                  <select
                    value={partnerChoice}
                    onChange={(event) => {
                      setPartnerChoice(event.target.value);
                      setThreadChoice(NONE);
                      setSimilar([]);
                    }}
                    disabled={busy}
                    className={fieldClass}
                  >
                    <option value={NEW}>Nowa firma</option>
                    {visiblePartners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </label>
                {isNewPartner && (
                  <div className="grid gap-brand-3 sm:grid-cols-2">
                    <label className={labelClass}>
                      <span className={labelTextClass}>Nazwa nowej firmy</span>
                      <input name="partnerName" required maxLength={200} disabled={busy} onChange={() => setSimilar([])} className={fieldClass} />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>Rodzaj</span>
                      <select name="partnerKind" defaultValue="producent" disabled={busy} className={fieldClass}>
                        {PARTNER_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {PARTNER_KIND_LABELS[kind]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                {similar.length > 0 && (
                  <div role="alert" className="rounded-data border border-amber-500/40 bg-amber-500/10 p-brand-3 text-body">
                    <p className="font-medium">Podobne firmy już istnieją:</p>
                    <ul className="my-brand-1 list-disc pl-brand-4">
                      {similar.map((item) => (
                        <li key={item.id}>
                          {item.name}
                          {item.archived ? " (archiwalna)" : ""}
                        </li>
                      ))}
                    </ul>
                    <p>Wybierz ją z listy albo zapisz ponownie, żeby utworzyć nową firmę.</p>
                  </div>
                )}
              </fieldset>

              <fieldset className="flex flex-col gap-brand-3">
                <legend className="mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">Sprawa</legend>
                <label className={labelClass}>
                  <span className={labelTextClass}>Sprawa</span>
                  <select value={threadChoice} onChange={(event) => setThreadChoice(event.target.value)} disabled={busy} className={fieldClass}>
                    <option value={NONE}>Bez sprawy</option>
                    <option value={NEW}>Nowa sprawa</option>
                    {partnerThreads.map((thread) => (
                      <option key={thread.id} value={thread.id}>
                        {thread.title}
                      </option>
                    ))}
                  </select>
                </label>
                {threadChoice === NEW && (
                  <div className="grid gap-brand-3 sm:grid-cols-3">
                    <label className={labelClass}>
                      <span className={labelTextClass}>Tytuł sprawy</span>
                      <input name="threadTitle" required maxLength={200} disabled={busy} className={fieldClass} />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>Właściciel</span>
                      <select name="threadOwner" defaultValue={currentUserId} disabled={busy} className={fieldClass}>
                        {admins.map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            {admin.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>Szablon</span>
                      <select name="threadTemplate" defaultValue="" disabled={busy} className={fieldClass}>
                        <option value="">Bez szablonu</option>
                        {templates.map((template) => (
                          <option key={template.key} value={template.key}>
                            {template.name} ({template.taskCount} zadań)
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </fieldset>

              <fieldset className="flex flex-col gap-brand-3">
                <legend className="mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">Wpis w dzienniku</legend>
                <div className="grid gap-brand-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className={labelClass}>
                    <span className={labelTextClass}>Kierunek</span>
                    <select name="direction" defaultValue="outbound" disabled={busy} className={fieldClass}>
                      {ENTRY_DIRECTIONS.map((value) => (
                        <option key={value} value={value}>
                          {ENTRY_DIRECTION_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span className={labelTextClass}>Kanał</span>
                    <select name="channel" defaultValue="phone" disabled={busy} className={fieldClass}>
                      {ENTRY_CHANNELS.map((value) => (
                        <option key={value} value={value}>
                          {ENTRY_CHANNEL_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span className={labelTextClass}>Data (puste = teraz)</span>
                    <input name="occurredAtLocal" type="datetime-local" disabled={busy} className={fieldClass} />
                  </label>
                  {!isNewPartner && (
                    <label className={labelClass}>
                      <span className={labelTextClass}>Osoba kontaktowa</span>
                      <select name="contactId" defaultValue="" disabled={busy} className={fieldClass}>
                        <option value="">Nie podano</option>
                        {partnerContacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <label className={labelClass}>
                  <span className={labelTextClass}>Treść</span>
                  <textarea name="body" required rows={4} maxLength={10000} disabled={busy} className={textareaClass} />
                </label>
              </fieldset>

              <fieldset className="flex flex-col gap-brand-3">
                <legend className="mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">Zadania następne</legend>
                {taskKeys.map((key) => (
                  <div key={key} className="grid items-end gap-brand-2 sm:grid-cols-[2fr_1fr_1.5fr_auto]">
                    <label className={labelClass}>
                      <span className={labelTextClass}>Tytuł</span>
                      <input name={`task-${key}-title`} required maxLength={300} disabled={busy} className={fieldClass} />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>Termin</span>
                      <input name={`task-${key}-due`} type="date" disabled={busy} className={fieldClass} />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>Kto</span>
                      <select name={`task-${key}-assignee`} defaultValue={currentUserId} disabled={busy} className={fieldClass}>
                        {admins.map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            {admin.name}
                          </option>
                        ))}
                        <option value="external">Strona zewnętrzna</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => setTaskKeys((keys) => keys.filter((k) => k !== key))} className={secondaryButtonClass}>
                      Usuń
                    </button>
                  </div>
                ))}
                {taskKeys.length < MAX_TASKS && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setTaskKeys((keys) => [...keys, nextKey]);
                        setNextKey((value) => value + 1);
                      }}
                      className={secondaryButtonClass}
                    >
                      <Plus className="mr-1 size-4" aria-hidden="true" />
                      Dodaj zadanie
                    </button>
                  </div>
                )}
              </fieldset>

              <ErrorLine error={error} />
              <div className="flex gap-brand-2">
                <button type="submit" disabled={busy} className={primaryButtonClass}>
                  {busy ? "Zapisuję…" : similar.length ? "Utwórz nową firmę i zapisz" : "Zapisz wszystko"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className={secondaryButtonClass}>
                  Anuluj
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
