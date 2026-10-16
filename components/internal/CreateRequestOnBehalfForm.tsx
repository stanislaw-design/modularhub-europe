"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { InquiryAttachmentsAfterSubmit } from "@/components/inquiry-attachments/InquiryAttachmentsAfterSubmit";
import { createRequestOnBehalf, type CreateRequestOnBehalfInput } from "@/lib/project-request-actions";
import { COMPLETION_STANDARDS } from "@/lib/producer-capacity-profile-specs";
import { PRODUCT_FAMILIES, type ProductFamily } from "@/lib/product-technical-specs";
import { PROJECT_TYPES } from "@/lib/project-request-specs";

interface CreateRequestOnBehalfFormProps {
  locale: string;
  countries: { code: string; name: string }[];
  products: { id: string; name: string; producerName: string }[];
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

const CLIENT_LOCALES = [
  { value: "pl", label: "Polski" },
  { value: "en", label: "Angielski" },
  { value: "de", label: "Niemiecki" },
  { value: "nl", label: "Niderlandzki" },
];

const fieldClass =
  "focus-ring h-11 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy";
const labelClass = "flex flex-col gap-brand-1 text-data";
const labelTextClass = "text-brand-technical-graphite";

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

// Spec 0070 AC-20: formularz doradcy. Język klienta nie ma wartości domyślnej (admin
// pracuje po polsku, a zły język oznaczałby mail, którego klient nie zrozumie), a zgoda
// klienta jest obowiązkowym polem tekstowym. Po zapisie przechodzimy do szczegółów
// zapytania. Dla zapytania o produkt zamiast kraju, rodzin i typu podaje się produkt.
export function CreateRequestOnBehalfForm({ locale, countries, products }: CreateRequestOnBehalfFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<"request" | "product">("request");
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Po zapisie zapytania pokazujemy krok "Pliki" (spec 0070 AC-34), dopiero potem szczegóły.
  const [created, setCreated] = useState<{ id: string; kind: "request" | "product" } | null>(null);

  function toggleFamily(family: ProductFamily) {
    setFamilies((current) => (current.includes(family) ? current.filter((item) => item !== family) : [...current, family]));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const clientLocale = optional(form.get("clientLocale"));
    if (!clientLocale) {
      setError("Wybierz język klienta.");
      return;
    }
    const common = {
      contactName: optional(form.get("contactName")) ?? "",
      contactEmail: optional(form.get("contactEmail")) ?? "",
      contactPhone: optional(form.get("contactPhone")),
      locale: clientLocale,
      staffConsentNote: optional(form.get("staffConsentNote")) ?? "",
      unitCount: optionalNumber(form.get("unitCount")) ?? 0,
      startWindowFrom: optional(form.get("startWindowFrom")),
      startWindowTo: optional(form.get("startWindowTo")),
      deliveryWindowFrom: optional(form.get("deliveryWindowFrom")),
      deliveryWindowTo: optional(form.get("deliveryWindowTo")),
    };

    let input: CreateRequestOnBehalfInput;
    if (kind === "request") {
      const completionStandard = optional(form.get("completionStandard"));
      input = {
        ...common,
        kind: "request",
        countryCode: optional(form.get("countryCode")) ?? "",
        locationDetail: optional(form.get("locationDetail")),
        projectType: (optional(form.get("projectType")) ?? "") as (typeof PROJECT_TYPES)[number],
        families,
        floorAreaM2Min: optionalNumber(form.get("floorAreaM2Min")),
        floorAreaM2Max: optionalNumber(form.get("floorAreaM2Max")),
        completionStandard: completionStandard as (typeof COMPLETION_STANDARDS)[number] | undefined,
        extrasNote: optional(form.get("note")),
      };
    } else {
      input = {
        ...common,
        kind: "product",
        productId: optional(form.get("productId")) ?? "",
        deliveryCountryCode: optional(form.get("countryCode")) ?? "",
        note: optional(form.get("note")),
      };
    }

    setError(null);
    startTransition(async () => {
      const result = await createRequestOnBehalf(input);
      if (!result.ok || !result.id) {
        setError(result.error ?? "Nie udało się złożyć zapytania.");
        return;
      }
      setCreated({ id: result.id, kind: result.kind ?? kind });
    });
  }

  if (created) {
    return (
      <div className="flex max-w-3xl flex-col gap-brand-4">
        <p role="status" className="text-body font-medium">
          Zapytanie zostało złożone w imieniu klienta. Możesz teraz dołączyć pliki klienta.
        </p>
        <InquiryAttachmentsAfterSubmit kind={created.kind} inquiryId={created.id} surface="v3" staff />
        <div>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/internal/large-orders/${created.id}?kind=${created.kind}`)}
            className="focus-ring inline-flex h-11 items-center rounded-data bg-brand-foundation-navy px-brand-4 text-body font-medium text-brand-warm-white"
          >
            Przejdź do szczegółów zapytania
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-brand-5" noValidate>
      <fieldset className="flex flex-col gap-brand-2" disabled={isPending}>
        <legend className="mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">
          Rodzaj zapytania
        </legend>
        <div className="flex flex-wrap gap-brand-4 text-body">
          <label className="flex items-center gap-brand-2">
            <input type="radio" name="kind" checked={kind === "request"} onChange={() => setKind("request")} />
            Zapytanie wolne (projekt)
          </label>
          <label className="flex items-center gap-brand-2">
            <input type="radio" name="kind" checked={kind === "product"} onChange={() => setKind("product")} />
            Zapytanie o konkretny produkt
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-brand-3 sm:grid-cols-2" disabled={isPending}>
        <legend className="mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">
          Klient
        </legend>
        <label className={labelClass}>
          <span className={labelTextClass}>Imię i nazwisko</span>
          <input name="contactName" type="text" autoComplete="off" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Adres e mail</span>
          <input name="contactEmail" type="email" autoComplete="off" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Telefon (opcjonalnie)</span>
          <input name="contactPhone" type="tel" autoComplete="off" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Język klienta (mail i panel)</span>
          <select name="clientLocale" defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Wybierz język
            </option>
            {CLIENT_LOCALES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>Zgoda klienta (kiedy i jak ją wyraził)</span>
          <textarea
            name="staffConsentNote"
            rows={3}
            className="focus-ring rounded-data border border-brand-steel bg-brand-warm-white p-brand-2 text-body text-brand-foundation-navy"
          />
          <span className="text-label text-brand-technical-graphite">
            Zgoda klienta obejmuje przekazanie zapytania dopasowanym producentom oraz plików do zapytania.
          </span>
        </label>
      </fieldset>

      <fieldset className="grid gap-brand-3 sm:grid-cols-2" disabled={isPending}>
        <legend className="mb-brand-1 text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">
          Zakres zamówienia
        </legend>
        {kind === "product" && (
          <label className={`${labelClass} sm:col-span-2`}>
            <span className={labelTextClass}>Produkt</span>
            <select name="productId" defaultValue="" className={fieldClass}>
              <option value="" disabled>
                Wybierz produkt
              </option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.producerName}: {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={labelClass}>
          <span className={labelTextClass}>{kind === "request" ? "Kraj" : "Kraj dostawy"}</span>
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
          <span className={labelTextClass}>Liczba domów (od 3)</span>
          <input name="unitCount" type="number" min={3} step={1} inputMode="numeric" className={fieldClass} />
        </label>
        {kind === "request" && (
          <>
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
              <span className={labelTextClass}>Powierzchnia domu od (m², opcjonalnie)</span>
              <input name="floorAreaM2Min" type="number" min={0} step="any" className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Powierzchnia domu do (m², opcjonalnie)</span>
              <input name="floorAreaM2Max" type="number" min={0} step="any" className={fieldClass} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              <span className={labelTextClass}>Lokalizacja (opcjonalnie)</span>
              <input name="locationDetail" type="text" className={fieldClass} />
            </label>
          </>
        )}
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
          <span className={labelTextClass}>Uwagi (opcjonalnie, widoczne dla producentów)</span>
          <textarea
            name="note"
            rows={3}
            className="focus-ring rounded-data border border-brand-steel bg-brand-warm-white p-brand-2 text-body text-brand-foundation-navy"
          />
          <span className="text-label text-brand-technical-graphite">
            Bez danych kontaktowych klienta. Kto nie zna dokładnej liczby domów, podaje liczbę pierwszego etapu i opisuje resztę tutaj.
          </span>
        </label>
      </fieldset>

      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring inline-flex h-11 items-center rounded-data bg-brand-foundation-navy px-brand-4 text-body font-medium text-brand-warm-white disabled:opacity-50"
        >
          {isPending ? "Zapisywanie…" : "Złóż zapytanie w imieniu klienta"}
        </button>
      </div>
    </form>
  );
}
