"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Text } from "@/components/ui";
import { acceptProjectQuote } from "@/lib/project-quote-actions";

interface AcceptQuoteButtonProps {
  quoteId: string;
}

// Przycisk Akceptuj na ekranie "wyceny" klienta (spec 0062 AC-6): woła
// istniejące acceptProjectQuote bez zmian sygnatury. Gdy klient nie ma
// zatwierdzonego b2bVerificationStatus, przycisk zostaje klikalny (nie
// chowany, nie disabled) i pokazuje dokładnie ten komunikat błędu, który
// acceptProjectQuote już zwraca, w miejscu — nigdy fałszywy sukces.
export function AcceptQuoteButton({ quoteId }: AcceptQuoteButtonProps) {
  const t = useTranslations("AcceptQuoteButton");
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptProjectQuote(quoteId);
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        return;
      }
      setAccepted(true);
    });
  }

  if (accepted) {
    return <Text className="font-medium text-status-approved">{t("accepted")}</Text>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" surface="v5" size="sm" onClick={handleAccept} disabled={isPending}>
        {isPending ? t("accepting") : t("accept")}
      </Button>
      {error && (
        <p className="font-sans text-body text-status-blocked" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
