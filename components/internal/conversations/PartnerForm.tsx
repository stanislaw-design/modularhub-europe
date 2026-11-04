"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createPartnerAction, findSimilarPartnersAction, updatePartnerAction } from "@/app/[locale]/internal/conversations/actions";
import { PARTNER_KIND_LABELS, PARTNER_KINDS, type PartnerKind } from "@/lib/conversations/constants";
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

export interface PartnerFormValues {
  name: string;
  kind: PartnerKind;
  website: string | null;
  countryCode: string | null;
  tags: string[];
  notes: string | null;
}

interface PartnerFormProps {
  locale: string;
  countries: { code: string; name: string }[];
  /** Gdy podane, formularz edytuje istniejącą firmę. */
  partnerId?: string;
  initial?: PartnerFormValues;
}

interface Similar {
  id: string;
  name: string;
  archived: boolean;
}

// Tworzenie i edycja firmy (AC-4). Przy tworzeniu najpierw sprawdza podobne nazwy (AC-5):
// ostrzeżenie nie blokuje, drugi klik zapisuje mimo to.
export function PartnerForm({ locale, countries, partnerId, initial }: PartnerFormProps) {
  const router = useRouter();
  const { run, isPending, error, setError } = useRunAction();
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [checking, setChecking] = useState(false);

  function read(form: HTMLFormElement) {
    const data = new FormData(form);
    return {
      name: String(data.get("name") ?? ""),
      kind: String(data.get("kind") ?? "producent") as PartnerKind,
      website: String(data.get("website") ?? ""),
      countryCode: String(data.get("countryCode") ?? ""),
      tags: String(data.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: String(data.get("notes") ?? ""),
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = read(event.currentTarget);
    if (partnerId) {
      run(() => updatePartnerAction(partnerId, values));
      return;
    }
    // Pierwszy klik sprawdza duplikaty, kolejny (po ostrzeżeniu) zapisuje.
    if (!similar.length) {
      setChecking(true);
      setError(null);
      const found = await findSimilarPartnersAction(values.name);
      setChecking(false);
      if (found.ok && found.similar.length) {
        setSimilar(found.similar);
        return;
      }
    }
    run(
      () => createPartnerAction(values),
      (result) => {
        if ("id" in result) router.push(`/${locale}/internal/conversations/partners/${result.id}`);
      },
    );
  }

  const busy = isPending || checking;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-brand-3" aria-label={partnerId ? "Edycja firmy" : "Nowa firma"}>
      <div className="grid gap-brand-3 sm:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Nazwa firmy</span>
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={initial?.name}
            disabled={busy}
            onChange={() => setSimilar([])}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Rodzaj</span>
          <select name="kind" defaultValue={initial?.kind ?? "producent"} disabled={busy} className={fieldClass}>
            {PARTNER_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PARTNER_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Strona www</span>
          <input name="website" maxLength={300} defaultValue={initial?.website ?? ""} disabled={busy} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Kraj</span>
          <select name="countryCode" defaultValue={initial?.countryCode ?? ""} disabled={busy} className={fieldClass}>
            <option value="">Nie podano</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={labelClass}>
        <span className={labelTextClass}>Tagi (po przecinku)</span>
        <input name="tags" defaultValue={initial?.tags.join(", ") ?? ""} disabled={busy} className={fieldClass} />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Notatki</span>
        <textarea name="notes" rows={3} maxLength={5000} defaultValue={initial?.notes ?? ""} disabled={busy} className={textareaClass} />
      </label>

      {similar.length > 0 && (
        <div role="alert" className="rounded-data border border-amber-500/40 bg-amber-500/10 p-brand-3 text-body">
          <p className="font-medium">Podobne firmy już istnieją:</p>
          <ul className="my-brand-1 list-disc pl-brand-4">
            {similar.map((item) => (
              <li key={item.id}>
                <a href={`/${locale}/internal/conversations/partners/${item.id}`} className="underline" target="_blank" rel="noreferrer">
                  {item.name}
                </a>
                {item.archived ? " (archiwalna)" : ""}
              </li>
            ))}
          </ul>
          <p>Kliknij „Utwórz mimo to”, jeśli to inna firma.</p>
        </div>
      )}
      <ErrorLine error={error} />
      <div className="flex gap-brand-2">
        <button type="submit" disabled={busy} className={similar.length ? secondaryButtonClass : primaryButtonClass}>
          {busy ? "Zapisuję…" : partnerId ? "Zapisz zmiany" : similar.length ? "Utwórz mimo to" : "Utwórz firmę"}
        </button>
      </div>
    </form>
  );
}
