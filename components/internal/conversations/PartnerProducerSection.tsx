"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  linkPartnerProducerAction,
  suggestProducersAction,
  unlinkPartnerProducerAction,
} from "@/app/[locale]/internal/conversations/actions";
import { PRODUCER_VERIFICATION_LABELS } from "@/lib/conversations/constants";
import type { ProducerSuggestion } from "@/lib/conversations/queries";
import { ErrorLine, fieldClass, labelClass, labelTextClass, primaryButtonClass, secondaryButtonClass, useRunAction } from "./shared";

const REASON_LABELS: Record<ProducerSuggestion["reason"], string> = {
  email: "Mail osoby kontaktowej zgadza się z kontem producenta",
  name: "Podobna nazwa",
  search: "Wynik wyszukiwania",
};

interface PartnerProducerSectionProps {
  locale: string;
  partnerId: string;
  /** Stan z karty firmy: `null` brak połączenia, `available: false` konto usunięte lub nieczytelne. */
  producer: { id: string; available: true; name: string; nip: string; verificationStatus: string } | { id: string; available: false } | null;
}

// Połączenie firmy z producentem z platformy (spec 0080 AC-7): wybór z podpowiedziami po mailu osoby
// i po nazwie, NIP i weryfikacja czytane z `producer` oraz odłączanie (firma i historia zostają).
export function PartnerProducerSection({ locale, partnerId, producer }: PartnerProducerSectionProps) {
  const { run, isPending, error } = useRunAction();

  if (producer) {
    return (
      <div className="flex flex-col gap-brand-2">
        {producer.available ? (
          <p className="text-body">
            <Link href={`/${locale}/internal/producers/${producer.id}`} className="focus-ring font-medium underline">
              {producer.name}
            </Link>
            <span className="text-brand-technical-graphite">
              {" "}
              · NIP {producer.nip} · {PRODUCER_VERIFICATION_LABELS[producer.verificationStatus] ?? producer.verificationStatus}
            </span>
          </p>
        ) : (
          <p className="text-body text-brand-technical-graphite">Konto producenta niedostępne. Połączenie można zdjąć, firma i historia zostają.</p>
        )}
        <div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (window.confirm("Odłączyć producenta od tej firmy? Firma i jej historia zostają.")) {
                run(() => unlinkPartnerProducerAction(partnerId));
              }
            }}
            className={secondaryButtonClass}
          >
            Odłącz producenta
          </button>
        </div>
        <ErrorLine error={error} />
      </div>
    );
  }

  return <ProducerPicker partnerId={partnerId} />;
}

function ProducerPicker({ partnerId }: { partnerId: string }) {
  const { run, isPending, error } = useRunAction();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProducerSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const request = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      const result = await suggestProducersAction(partnerId, query);
      if (request !== requestRef.current) return;
      setLoading(false);
      if (!result.ok) {
        setSuggestions([]);
        setLoadError(result.error);
        return;
      }
      setSuggestions(result.suggestions);
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [partnerId, query]);

  return (
    <div className="flex flex-col gap-brand-2">
      <p className="text-body text-brand-technical-graphite">Ta firma nie jest połączona z kontem producenta na platformie.</p>
      <label className={labelClass}>
        <span className={labelTextClass}>Szukaj producenta po nazwie</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className={fieldClass} />
      </label>
      <ErrorLine error={loadError ?? error} />
      <div aria-live="polite" className="text-data text-brand-technical-graphite">
        {loading ? "Szukam…" : suggestions.length === 0 && !loadError ? "Brak podpowiedzi. Wpisz nazwę producenta." : null}
      </div>
      {suggestions.length > 0 && (
        <ul className="flex flex-col divide-y divide-brand-steel/50 rounded-data border border-brand-steel/60">
          {suggestions.map((item) => {
            const taken = item.linkedPartnerId !== null;
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-brand-3 p-brand-2">
                <div className="min-w-0">
                  <p className="text-body font-medium">{item.name}</p>
                  <p className="text-data text-brand-technical-graphite">
                    NIP {item.nip} · {item.countryCode} · {PRODUCER_VERIFICATION_LABELS[item.verificationStatus] ?? item.verificationStatus}
                  </p>
                  <p className="text-data text-brand-technical-graphite">
                    {taken
                      ? `Już połączony z firmą „${item.linkedPartnerName}”${item.linkedPartnerArchived ? " (archiwalna)" : ""}`
                      : REASON_LABELS[item.reason]}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending || taken}
                  onClick={() => run(() => linkPartnerProducerAction(partnerId, item.id))}
                  className={primaryButtonClass}
                >
                  Połącz
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
