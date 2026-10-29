"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { InquiryAttachmentsAfterSubmit } from "@/components/inquiry-attachments/InquiryAttachmentsAfterSubmit";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_ACTIVE_BYTES,
  ATTACHMENT_MAX_ACTIVE_FILES,
  ATTACHMENT_MAX_FILE_BYTES,
  formatAttachmentSize,
} from "@/lib/inquiry-attachment-specs";
import { createPlatformProject, type CreatePlatformProjectInput } from "@/lib/platform-project-actions";
import { COMPLETION_STANDARDS } from "@/lib/producer-capacity-profile-specs";
import { PRODUCT_FAMILIES, type ProductFamily } from "@/lib/product-technical-specs";
import { PROJECT_TYPES } from "@/lib/project-request-specs";

interface CreatePlatformProjectFormProps {
  locale: string;
  countries: { code: string; name: string }[];
  producers: { id: string; name: string; countryCode: string }[];
  // Grupy do wyboru odbiorców (spec 0077 część B): gotowe po rodzinie i własne admina, z liczbą członków.
  groups: { id: string; name: string; kind: "ready" | "custom"; memberIds: string[] }[];
  // Komunikat, gdy brakuje PLATFORM_CONTACT_* (AC-4): formularz jest wtedy zablokowany.
  contactConfigError: string | null;
}

const PROJECT_TYPE_LABEL: Record<(typeof PROJECT_TYPES)[number], string> = {
  resort: "Resort",
  "holiday-park": "Park wypoczynkowy",
  "housing-development": "Osiedle mieszkaniowe",
  "student-housing": "Akademik / mieszkania studenckie",
  "senior-living": "Mieszkania dla seniorów",
  "workforce-accommodation": "Zakwaterowanie pracownicze",
  other: "Inne",
};

const FAMILY_LABEL: Record<ProductFamily, string> = {
  dom: "Dom",
  "spa-modulowe": "Spa modułowe",
  "kontenery-modulowe": "Kontenery modułowe",
  "outdoor-tv": "Outdoor TV",
};

const COMPLETION_LABEL: Record<(typeof COMPLETION_STANDARDS)[number], string> = {
  "surowy-zamkniety": "Stan surowy zamknięty",
  deweloperski: "Standard deweloperski",
  "pod-klucz": "Pod klucz",
};

const fieldClass =
  "focus-ring h-11 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy";
const labelClass = "flex flex-col gap-brand-1 text-data";
const labelTextClass = "text-brand-technical-graphite";
const legendClass = "mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite";

// Szkic formularza zostaje w tej przegladarce (localStorage): bez zmian w bazie, nie przenosi sie na inne
// urzadzenie i nie obejmuje wybranych plikow. Kazdy dostep jest w try/catch, bo storage bywa zablokowany.
const DRAFT_KEY = "platformProjectDraft:v1";

interface FormDraft {
  savedAt: string;
  fields: Record<string, string>;
  families: ProductFamily[];
  producerIds: string[];
  groupIds?: string[];
}

function readDraft(): FormDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as FormDraft) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: FormDraft | null): boolean {
  try {
    if (draft) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

function optional(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? undefined : text;
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  const text = optional(value);
  if (text === undefined) return undefined;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Spec 0077 AC-1: formularz projektu własnego ModularHub. Nie ma w nim zgody klienta, języka klienta
// ani danych kontaktowych klienta (kontakt bierze akcja ze zmiennych PLATFORM_CONTACT_*). Odbiorców
// wskazuje się na razie pojedynczo (grupy producentów dochodzą w części B). Po zapisie krok "Pliki".
export function CreatePlatformProjectForm({ locale, countries, producers, groups, contactConfigError }: CreatePlatformProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [selectedProducers, setSelectedProducers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [producerFilter, setProducerFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Pliki wybrane przed zapisem: wgrywają się same zaraz po założeniu projektu (zapis pliku wymaga istniejącego projektu).
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; skipped: { id: string; name: string }[] } | null>(null);

  const visibleProducers = useMemo(() => {
    const needle = producerFilter.trim().toLowerCase();
    return needle ? producers.filter((item) => item.name.toLowerCase().includes(needle)) : producers;
  }, [producers, producerFilter]);

  function toggleFamily(family: ProductFamily) {
    setFamilies((current) => (current.includes(family) ? current.filter((item) => item !== family) : [...current, family]));
  }

  // Zaznaczenie grupy dopisuje jej członków do jednej listy odbiorców, odznaczenie zdejmuje tych, których
  // nie trzyma inna zaznaczona grupa. Potem admin może ręcznie odznaczać i dopisywać pojedynczych producentów.
  function toggleGroup(id: string) {
    const group = groups.find((item) => item.id === id);
    if (!group) return;
    if (selectedGroups.includes(id)) {
      const remaining = selectedGroups.filter((item) => item !== id);
      const stillHeld = new Set(groups.filter((item) => remaining.includes(item.id)).flatMap((item) => item.memberIds));
      setSelectedProducers((current) => current.filter((producerId) => !group.memberIds.includes(producerId) || stillHeld.has(producerId)));
      setSelectedGroups(remaining);
    } else {
      setSelectedProducers((current) => [...new Set([...current, ...group.memberIds])]);
      setSelectedGroups([...selectedGroups, id]);
    }
  }

  function toggleProducer(id: string) {
    setSelectedProducers((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  // Przywrocenie szkicu po wejsciu na ekran: pola nieKontrolowane wypelniamy po nazwie, reszta idzie przez stan.
  useEffect(() => {
    const draft = readDraft();
    const form = formRef.current;
    if (!draft || !form) return;
    for (const [name, value] of Object.entries(draft.fields)) {
      const element = form.elements.namedItem(name);
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        element.value = value;
      }
    }
    setFamilies(draft.families ?? []);
    setSelectedProducers((draft.producerIds ?? []).filter((id) => producers.some((item) => item.id === id)));
    setSelectedGroups((draft.groupIds ?? []).filter((id) => groups.some((item) => item.id === id)));
    setDraftSavedAt(draft.savedAt);
    setDraftMessage("Przywrócono zapisany szkic. Pliki trzeba wybrać ponownie.");
    // Tylko przy pierwszym wejściu na ekran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveDraft() {
    const form = formRef.current;
    if (!form) return;
    const fields: Record<string, string> = {};
    for (const [name, value] of new FormData(form).entries()) {
      if (typeof value === "string") fields[name] = value;
    }
    const savedAt = new Date().toISOString();
    const ok = writeDraft({ savedAt, fields, families, producerIds: selectedProducers, groupIds: selectedGroups });
    setDraftSavedAt(ok ? savedAt : null);
    setDraftMessage(ok ? "Szkic zapisany w tej przeglądarce. Wrócisz do niego po ponownym wejściu na ten ekran." : "Nie udało się zapisać szkicu (przeglądarka blokuje pamięć lokalną).");
  }

  function discardDraft() {
    writeDraft(null);
    setDraftSavedAt(null);
    setDraftMessage("Szkic usunięty. Pola formularza zostają, dopóki nie odświeżysz strony.");
  }

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const next = [...files];
    let rejected: string | null = null;
    for (const file of Array.from(selected)) {
      const totalBytes = next.reduce((sum, item) => sum + item.size, 0) + file.size;
      if (file.size > ATTACHMENT_MAX_FILE_BYTES) {
        rejected = `Plik ${file.name} jest za duży (najwyżej ${formatAttachmentSize(ATTACHMENT_MAX_FILE_BYTES)}).`;
      } else if (next.length >= ATTACHMENT_MAX_ACTIVE_FILES || totalBytes > ATTACHMENT_MAX_ACTIVE_BYTES) {
        rejected = `Najwyżej ${ATTACHMENT_MAX_ACTIVE_FILES} plików, razem do ${formatAttachmentSize(ATTACHMENT_MAX_ACTIVE_BYTES)}.`;
      } else {
        next.push(file);
      }
    }
    setFileError(rejected);
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const completionStandard = optional(form.get("completionStandard"));
    const intendedUse = optional(form.get("intendedUse"));
    const input: CreatePlatformProjectInput = {
      title: optional(form.get("title")) ?? "",
      countryCode: optional(form.get("countryCode")) ?? "",
      locationDetail: optional(form.get("locationDetail")),
      projectType: (optional(form.get("projectType")) ?? "") as (typeof PROJECT_TYPES)[number],
      families,
      unitCount: optionalNumber(form.get("unitCount")) ?? 0,
      floorAreaM2Min: optionalNumber(form.get("floorAreaM2Min")),
      floorAreaM2Max: optionalNumber(form.get("floorAreaM2Max")),
      completionStandard: completionStandard as (typeof COMPLETION_STANDARDS)[number] | undefined,
      startWindowFrom: optional(form.get("startWindowFrom")),
      startWindowTo: optional(form.get("startWindowTo")),
      deliveryWindowFrom: optional(form.get("deliveryWindowFrom")),
      deliveryWindowTo: optional(form.get("deliveryWindowTo")),
      extrasNote: optional(form.get("note")),
      intendedUse: intendedUse as CreatePlatformProjectInput["intendedUse"],
      intendedUseMonths: optionalNumber(form.get("intendedUseMonths")),
      deadlineDate: optional(form.get("deadlineDate")),
      producerIds: selectedProducers,
    };

    setError(null);
    startTransition(async () => {
      const result = await createPlatformProject(input);
      if (!result.ok || !result.id) {
        setError(result.error ?? "Nie udało się założyć projektu.");
        return;
      }
      writeDraft(null);
      setCreated({ id: result.id, skipped: result.skippedProducers ?? [] });
    });
  }

  if (created) {
    return (
      <div className="flex max-w-3xl flex-col gap-brand-4">
        <p role="status" className="text-body font-medium">
          Projekt został założony, a wskazani producenci dostali mail. Możesz teraz dołączyć pliki.
        </p>
        {created.skipped.length > 0 && (
          <p role="status" className="text-body text-status-blocked">
            Pominięto producentów (usunięci lub zablokowani): {created.skipped.map((item) => item.name).join(", ")}.
          </p>
        )}
        <InquiryAttachmentsAfterSubmit kind="request" inquiryId={created.id} surface="v3" staff initialFiles={files} />
        <div>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/internal/large-orders/${created.id}?kind=request`)}
            className="focus-ring inline-flex h-11 items-center rounded-data bg-brand-foundation-navy px-brand-4 text-body font-medium text-brand-warm-white"
          >
            Przejdź do szczegółów projektu
          </button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-brand-5" noValidate>
      {contactConfigError && (
        <p role="alert" className="rounded-data border border-status-blocked p-brand-3 text-body text-status-blocked">
          {contactConfigError} Projekt nie zostanie zapisany, dopóki konfiguracja nie jest kompletna.
        </p>
      )}

      <fieldset className="grid gap-brand-3 sm:grid-cols-2" disabled={isPending}>
        <legend className={legendClass}>Projekt</legend>
        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>Nazwa projektu (3 do 120 znaków, widoczna dla producentów)</span>
          <input name="title" type="text" maxLength={120} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Kraj</span>
          <select name="countryCode" defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Wybierz kraj
            </option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Lokalizacja (opcjonalnie)</span>
          <input name="locationDetail" type="text" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Typ przedsięwzięcia</span>
          <select name="projectType" defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Wybierz typ
            </option>
            {PROJECT_TYPES.map((value) => (
              <option key={value} value={value}>
                {PROJECT_TYPE_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Liczba sztuk (od 1)</span>
          <input name="unitCount" type="number" min={1} max={10000} step={1} inputMode="numeric" className={fieldClass} />
        </label>
        <div className="flex flex-col gap-brand-1 text-data sm:col-span-2">
          <span className={labelTextClass}>Rodzina produktu (przynajmniej jedna)</span>
          <div className="flex flex-wrap gap-brand-4 text-body">
            {PRODUCT_FAMILIES.map((family) => (
              <label key={family} className="flex items-center gap-brand-2">
                <input type="checkbox" checked={families.includes(family)} onChange={() => toggleFamily(family)} />
                {FAMILY_LABEL[family]}
              </label>
            ))}
          </div>
        </div>
        <label className={labelClass}>
          <span className={labelTextClass}>Metraż od (m², opcjonalnie)</span>
          <input name="floorAreaM2Min" type="number" min={0} step="any" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Metraż do (m², opcjonalnie)</span>
          <input name="floorAreaM2Max" type="number" min={0} step="any" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Standard wykończenia (opcjonalnie)</span>
          <select name="completionStandard" defaultValue="" className={fieldClass}>
            <option value="">Bez wskazania</option>
            {COMPLETION_STANDARDS.map((value) => (
              <option key={value} value={value}>
                {COMPLETION_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Planowane użytkowanie (opcjonalnie)</span>
          <select name="intendedUse" defaultValue="" className={fieldClass}>
            <option value="">Bez wskazania</option>
            <option value="year_round">Przez cały rok</option>
            <option value="seasonal">Sezonowo</option>
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Miesiące użytkowania w roku (1 do 11, tylko sezonowo)</span>
          <input name="intendedUseMonths" type="number" min={1} max={11} step={1} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Start budowy od (opcjonalnie)</span>
          <input name="startWindowFrom" type="date" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Start budowy do (opcjonalnie)</span>
          <input name="startWindowTo" type="date" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Dostawa od (opcjonalnie)</span>
          <input name="deliveryWindowFrom" type="date" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Dostawa do (opcjonalnie)</span>
          <input name="deliveryWindowTo" type="date" className={fieldClass} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>Termin składania ofert (opcjonalnie, domyślnie za 14 dni, najdalej za 90 dni)</span>
          <input name="deadlineDate" type="date" className={fieldClass} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>Uwagi (opcjonalnie, widoczne dla producentów)</span>
          <textarea
            name="note"
            rows={3}
            className="focus-ring rounded-data border border-brand-steel bg-brand-warm-white p-brand-2 text-body text-brand-foundation-navy"
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-brand-2" disabled={isPending}>
        <legend className={legendClass}>Odbiorcy</legend>
        <p className="text-data text-brand-technical-graphite" role="status">
          Wybrano {selectedProducers.length} producentów. Zaznaczenie grupy dopisuje jej członków do listy poniżej, a potem możesz
          ręcznie odznaczać i dopisywać pojedynczych producentów.
        </p>
        {groups.length > 0 && (
          <ul className="grid gap-brand-1 rounded-data border border-brand-steel p-brand-3 sm:grid-cols-2" aria-label="Grupy producentów">
            {groups.map((group) => (
              <li key={group.id}>
                <label className="flex items-center gap-brand-2 text-body">
                  <input type="checkbox" checked={selectedGroups.includes(group.id)} onChange={() => toggleGroup(group.id)} />
                  {group.name}{" "}
                  <span className="text-label text-brand-technical-graphite">
                    ({group.kind === "ready" ? "gotowa" : "własna"}, {group.memberIds.length})
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="text-data text-brand-technical-graphite">Lista odbiorców:</p>
        <input
          type="search"
          value={producerFilter}
          onChange={(event) => setProducerFilter(event.target.value)}
          placeholder="Szukaj producenta"
          aria-label="Szukaj producenta"
          className={fieldClass}
        />
        <ul className="grid max-h-72 gap-brand-1 overflow-y-auto rounded-data border border-brand-steel p-brand-3 sm:grid-cols-2">
          {visibleProducers.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-brand-2 text-body">
                <input type="checkbox" checked={selectedProducers.includes(item.id)} onChange={() => toggleProducer(item.id)} />
                {item.name} <span className="text-label text-brand-technical-graphite">({item.countryCode})</span>
              </label>
            </li>
          ))}
          {visibleProducers.length === 0 && <li className="text-body text-brand-technical-graphite">Brak producentów.</li>}
        </ul>
      </fieldset>

      <fieldset className="flex flex-col gap-brand-2" disabled={isPending}>
        <legend className={legendClass}>Pliki (opcjonalnie)</legend>
        <p className="text-data text-brand-technical-graphite">
          Zdjęcia i dokumenty PDF dla producentów. Wgrają się automatycznie po założeniu projektu. Do{" "}
          {ATTACHMENT_MAX_ACTIVE_FILES} plików, każdy do {formatAttachmentSize(ATTACHMENT_MAX_FILE_BYTES)}.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          aria-label="Dodaj pliki"
          onChange={(event) => addFiles(event.target.files)}
          className="sr-only"
          tabIndex={-1}
        />
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="focus-ring inline-flex h-11 items-center rounded-data border border-brand-steel px-brand-4 text-body font-medium hover:bg-brand-steel/30 disabled:opacity-50"
          >
            {files.length > 0 ? "Dodaj kolejne pliki" : "Wybierz pliki"}
          </button>
        </div>
        {files.length > 0 && (
          <ul className="flex flex-col gap-brand-1 text-body">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-brand-3 rounded-data border border-brand-steel px-brand-2 py-brand-1">
                <span className="min-w-0 truncate">
                  {file.name} <span className="text-label text-brand-technical-graphite">({formatAttachmentSize(file.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}
                  className="focus-ring rounded-data text-data font-medium text-brand-passage-blue underline"
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
        {fileError && (
          <p role="alert" className="text-data text-status-blocked">
            {fileError}
          </p>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-brand-3">
        <button
          type="submit"
          disabled={isPending || contactConfigError !== null}
          className="focus-ring inline-flex h-11 items-center rounded-data bg-brand-foundation-navy px-brand-4 text-body font-medium text-brand-warm-white disabled:opacity-50"
        >
          {isPending ? "Zapisywanie…" : "Załóż projekt i powiadom producentów"}
        </button>
        <button
          type="button"
          onClick={saveDraft}
          disabled={isPending}
          className="focus-ring inline-flex h-11 items-center rounded-data border border-brand-steel px-brand-4 text-body font-medium hover:bg-brand-steel/30 disabled:opacity-50"
        >
          Zapisz szkic na później
        </button>
        {draftSavedAt && (
          <button type="button" onClick={discardDraft} disabled={isPending} className="focus-ring rounded-data text-data font-medium text-brand-passage-blue underline">
            Usuń szkic
          </button>
        )}
      </div>
      {draftMessage && (
        <p role="status" className="text-data text-brand-technical-graphite">
          {draftMessage}
          {draftSavedAt ? ` (${new Date(draftSavedAt).toLocaleString("pl-PL")})` : ""}
        </p>
      )}
    </form>
  );
}
