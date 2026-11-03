"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, Heading, Text } from "@/components/ui";

export interface EmailTrackingConsentFormLabels {
  heading: string;
  description: string;
  statusOn: string;
  statusOff: string;
  grant: string;
  withdraw: string;
  saved: string;
  saveError: string;
}

interface EmailTrackingConsentFormProps {
  initialActive: boolean;
  labels: EmailTrackingConsentFormLabels;
  // Akcja serwera setProducerEmailTrackingConsent (spec 0079 AC-19).
  onSave: (grant: boolean) => Promise<{ ok: boolean; error?: string }>;
}

// Przełącznik zgody na pomiar otwarć i kliknięć w mailach, w ustawieniach firmy producenta.
// Zgoda dotyczy zalogowanego użytkownika, nie całej firmy. Dobrowolna, bez wpływu na dostęp do panelu.
export function EmailTrackingConsentForm({ initialActive, labels, onSave }: EmailTrackingConsentFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function change(grant: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await onSave(grant);
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
        <Text tone="muted">{labels.description}</Text>
        <Text className="font-medium">{initialActive ? labels.statusOn : labels.statusOff}</Text>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-data" : "text-data text-status-blocked"}>
            {message.text}
          </p>
        )}
        <div>
          <Button type="button" onClick={() => change(!initialActive)} disabled={isPending}>
            {initialActive ? labels.withdraw : labels.grant}
          </Button>
        </div>
      </div>
    </Card>
  );
}
