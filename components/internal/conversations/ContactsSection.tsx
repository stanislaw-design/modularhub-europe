"use client";

import { type FormEvent, useState } from "react";
import { createContactAction, deleteContactAction, updateContactAction } from "@/app/[locale]/internal/conversations/actions";
import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_CHANNELS,
  CONTACT_LANGUAGE_LABELS,
  CONTACT_LANGUAGES,
  type ContactChannel,
  type ContactLanguage,
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

export interface ContactView {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  preferredChannel: string | null;
  language: string | null;
  note: string | null;
}

function ContactForm({
  partnerId,
  contact,
  onDone,
}: {
  partnerId: string;
  contact?: ContactView;
  onDone: () => void;
}) {
  const { run, isPending, error } = useRunAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      name: String(data.get("name") ?? ""),
      role: String(data.get("role") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      preferredChannel: (String(data.get("preferredChannel") ?? "") || null) as ContactChannel | null,
      language: (String(data.get("language") ?? "") || null) as ContactLanguage | null,
      note: String(data.get("note") ?? ""),
    };
    run(
      () => (contact ? updateContactAction(partnerId, contact.id, input) : createContactAction(partnerId, input)),
      onDone,
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-brand-3 rounded-data border border-brand-steel p-brand-3" aria-label={contact ? "Edycja osoby" : "Nowa osoba kontaktowa"}>
      <div className="grid gap-brand-3 sm:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Imię i nazwisko</span>
          <input name="name" required maxLength={200} defaultValue={contact?.name} disabled={isPending} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Rola</span>
          <input name="role" maxLength={200} defaultValue={contact?.role ?? ""} disabled={isPending} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Telefon</span>
          <input name="phone" type="tel" maxLength={60} defaultValue={contact?.phone ?? ""} disabled={isPending} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Mail</span>
          <input name="email" type="email" maxLength={254} defaultValue={contact?.email ?? ""} disabled={isPending} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Preferowany kanał</span>
          <select name="preferredChannel" defaultValue={contact?.preferredChannel ?? ""} disabled={isPending} className={fieldClass}>
            <option value="">Bez preferencji</option>
            {CONTACT_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {CONTACT_CHANNEL_LABELS[channel]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Język rozmowy</span>
          <select name="language" defaultValue={contact?.language ?? ""} disabled={isPending} className={fieldClass}>
            <option value="">Nie podano</option>
            {CONTACT_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {CONTACT_LANGUAGE_LABELS[language]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={labelClass}>
        <span className={labelTextClass}>Notatka o osobie</span>
        <textarea name="note" rows={2} maxLength={2000} defaultValue={contact?.note ?? ""} disabled={isPending} className={textareaClass} />
      </label>
      <ErrorLine error={error} />
      <div className="flex gap-brand-2">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "Zapisuję…" : contact ? "Zapisz osobę" : "Dodaj osobę"}
        </button>
        <button type="button" onClick={onDone} className={secondaryButtonClass}>
          Anuluj
        </button>
      </div>
    </form>
  );
}

// Osoby kontaktowe firmy (AC-6): dodawanie, edycja i miękkie usuwanie. Telefon i mail żyją tylko tutaj.
export function ContactsSection({ partnerId, contacts }: { partnerId: string; contacts: ContactView[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { run, isPending, error } = useRunAction();

  return (
    <div className="flex flex-col gap-brand-3">
      {contacts.length === 0 && editing !== "new" && <p className="text-body text-brand-technical-graphite">Brak osób kontaktowych.</p>}
      <ul className="flex flex-col gap-brand-2">
        {contacts.map((contact) =>
          editing === contact.id ? (
            <li key={contact.id}>
              <ContactForm partnerId={partnerId} contact={contact} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={contact.id} className="flex flex-wrap items-start justify-between gap-brand-3 rounded-data border border-brand-steel/60 p-brand-3">
              <div className="min-w-0 text-body">
                <p className="font-medium">
                  {contact.name}
                  {contact.role ? <span className="font-normal text-brand-technical-graphite">, {contact.role}</span> : null}
                </p>
                <p className="text-brand-technical-graphite">
                  {[contact.phone, contact.email].filter(Boolean).join(" · ") || "Brak telefonu i maila"}
                </p>
                <p className="text-label text-brand-technical-graphite">
                  {[
                    contact.preferredChannel ? `Kanał: ${CONTACT_CHANNEL_LABELS[contact.preferredChannel as ContactChannel]}` : null,
                    contact.language ? `Język: ${CONTACT_LANGUAGE_LABELS[contact.language as ContactLanguage]}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {contact.note && <p className="mt-brand-1 whitespace-pre-wrap">{contact.note}</p>}
              </div>
              <div className="flex gap-brand-2">
                <button type="button" onClick={() => setEditing(contact.id)} className={secondaryButtonClass}>
                  Edytuj
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (window.confirm(`Usunąć osobę „${contact.name}”?`)) run(() => deleteContactAction(partnerId, contact.id));
                  }}
                  className={secondaryButtonClass}
                >
                  Usuń
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
      <ErrorLine error={error} />
      {editing === "new" ? (
        <ContactForm partnerId={partnerId} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <button type="button" onClick={() => setEditing("new")} className={secondaryButtonClass}>
            Dodaj osobę kontaktową
          </button>
        </div>
      )}
    </div>
  );
}
