"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setProducerDeliveryCountriesAsAdmin } from "@/lib/project-quote-actions";

interface ProducerDeliveryCountriesAdminSectionProps {
  producerId: string;
  countries: { code: string; name: string }[];
  selectedCodes: string[];
}

// Spec 0070 AC-5: administrator poprawia kraje dostawy producenta. Od tych
// krajów zależy dopasowanie przetargów (część B) i widoczność produktów w
// katalogu kraju, więc zmiana jest jawna, z przyciskiem zapisu.
export function ProducerDeliveryCountriesAdminSection({
  producerId,
  countries,
  selectedCodes,
}: ProducerDeliveryCountriesAdminSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedCodes));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle(code: string) {
    setMessage(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await setProducerDeliveryCountriesAsAdmin(producerId, [...selected]);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error ?? "Nie udało się zapisać krajów dostawy." });
        return;
      }
      setMessage({ ok: true, text: "Zapisano." });
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="producer-delivery-countries-heading" className="flex flex-col gap-brand-3">
      <h2 id="producer-delivery-countries-heading" className="text-h3 font-semibold">
        Kraje dostawy
      </h2>
      <fieldset className="flex flex-wrap gap-x-brand-4 gap-y-brand-1">
        <legend className="sr-only">Kraje dostawy producenta</legend>
        {countries.map((item) => (
          <label key={item.code} className="flex items-center gap-brand-1 text-body">
            <input type="checkbox" checked={selected.has(item.code)} onChange={() => toggle(item.code)} />
            {item.name}
          </label>
        ))}
      </fieldset>
      <div className="flex items-center gap-brand-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="focus-ring h-11 rounded-data border border-brand-steel px-brand-3 text-body font-medium hover:bg-brand-steel/30 disabled:opacity-50"
        >
          Zapisz kraje
        </button>
        {message && (
          <span role="status" className={message.ok ? "text-status-approved" : "text-status-blocked"}>
            {message.text}
          </span>
        )}
      </div>
    </section>
  );
}
