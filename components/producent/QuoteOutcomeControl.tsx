"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Text } from "@/components/ui";
import { reportQuoteOutcome, type QuoteProducerOutcome } from "@/lib/project-quote-actions";

interface QuoteOutcomeControlProps {
  quoteId: string;
  outcome: QuoteProducerOutcome | null;
}

const OUTCOMES: QuoteProducerOutcome[] = ["signed", "no_agreement", "withdrew"];

// Spec 0070 AC-18: zwycięski producent potwierdza wynik po połączeniu stron. Zapis tylko raz;
// po zapisaniu pokazujemy sam wynik, zmiana wymaga ModularHub.
export function QuoteOutcomeControl({ quoteId, outcome }: QuoteOutcomeControlProps) {
  const t = useTranslations("QuoteOutcomeControl");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (outcome) {
    return (
      <Text variant="label">
        {t("reported")}: {t(`outcome.${outcome}`)}
      </Text>
    );
  }

  function report(value: QuoteProducerOutcome) {
    setError(null);
    startTransition(async () => {
      const result = await reportQuoteOutcome(quoteId, value);
      if (!result.ok) {
        setError(result.errorCode === "already_reported" ? t("alreadyReported") : t("genericError"));
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-brand-1">
      <Text variant="label" tone="muted">
        {t("prompt")}
      </Text>
      <div className="flex flex-wrap justify-end gap-brand-1">
        {OUTCOMES.map((value) => (
          <Button key={value} type="button" variant="secondary" size="sm" onClick={() => report(value)} disabled={isPending}>
            {t(`outcome.${value}`)}
          </Button>
        ))}
      </div>
      {error && (
        <p className="font-sans text-label text-status-blocked" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
