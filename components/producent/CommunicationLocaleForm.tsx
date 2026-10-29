"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, Heading, Select, Text } from "@/components/ui";
import { COMMUNICATION_LOCALES, type CommunicationLocale } from "@/lib/communication-locales";

// Nazwy języków są własne (każdy w swoim języku), więc nie przechodzą przez tłumaczenia.
const LANGUAGE_NAMES: Record<CommunicationLocale, string> = {
  pl: "Polski",
  en: "English",
  de: "Deutsch",
  nl: "Nederlands",
};

export interface CommunicationLocaleFormLabels {
  heading: string;
  label: string;
  hint: string;
  save: string;
  saved: string;
  saveError: string;
}

interface CommunicationLocaleFormProps {
  initialLocale: CommunicationLocale;
  labels: CommunicationLocaleFormLabels;
  // Akcja serwera: producent woła setProducerCommunicationLocale, admin tę samą akcję
  // z przypiętym producerId (spec 0077 AC-29).
  onSave: (locale: string) => Promise<{ ok: boolean; error?: string }>;
}

// Pole "język komunikacji" w ustawieniach firmy producenta i na karcie producenta w adminie.
// Nie zmienia języka interfejsu panelu (AC-33).
export function CommunicationLocaleForm({ initialLocale, labels, onSave }: CommunicationLocaleFormProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<CommunicationLocale>(initialLocale);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await onSave(locale);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error ?? labels.saveError });
        return;
      }
      setMessage({ ok: true, text: labels.saved });
      router.refresh();
    });
  }

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-brand-3">
        <Heading level="h2">{labels.heading}</Heading>
        <div className="flex flex-col gap-1">
          <span id="communication-locale-label" className="text-label text-brand-technical-graphite">
            {labels.label}
          </span>
          <Select
            aria-labelledby="communication-locale-label"
            value={locale}
            onChange={(value) => {
              setMessage(null);
              setLocale(value);
            }}
            options={COMMUNICATION_LOCALES.map((value) => ({ value, label: LANGUAGE_NAMES[value] }))}
          />
          <Text tone="muted">{labels.hint}</Text>
        </div>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-data" : "text-data text-status-blocked"}>
            {message.text}
          </p>
        )}
        <div>
          <Button type="button" onClick={save} disabled={isPending || locale === initialLocale}>
            {labels.save}
          </Button>
        </div>
      </div>
    </Card>
  );
}
