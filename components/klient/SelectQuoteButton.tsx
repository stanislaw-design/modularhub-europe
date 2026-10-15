"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Text } from "@/components/ui";
import { selectProjectQuote, type SelectProjectQuoteErrorCode } from "@/lib/project-quote-actions";

interface SelectQuoteButtonProps {
  quoteId: string;
  // Ta oferta jest już wybrana przez klienta (czeka na połączenie albo właśnie się łączy).
  isSelected: boolean;
  // Klient ma już wybraną inną ofertę: przycisk zmienia wybór zamiast go zaczynać.
  hasOtherSelection: boolean;
}

const ERROR_KEY: Record<SelectProjectQuoteErrorCode, "notFound" | "alreadyConnected" | "closed" | "stale" | "genericError"> = {
  not_found: "notFound",
  already_connected: "alreadyConnected",
  closed: "closed",
  stale: "stale",
  generic: "genericError",
};

// Spec 0070 AC-16: klient wybiera ofertę i może zmienić wybór aż do połączenia stron.
// Wybór nie jest płatnym ani nieodwracalnym krokiem, więc bez okna potwierdzenia. Po zapisie
// odświeżamy stronę, żeby tabela i komunikat o oczekiwaniu na B2B pochodziły z serwera.
export function SelectQuoteButton({ quoteId, isSelected, hasOtherSelection }: SelectQuoteButtonProps) {
  const t = useTranslations("SelectQuoteButton");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect() {
    setError(null);
    startTransition(async () => {
      const result = await selectProjectQuote(quoteId);
      if (!result.ok) {
        setError(t(ERROR_KEY[result.errorCode ?? "generic"]));
        return;
      }
      router.refresh();
    });
  }

  if (isSelected) {
    return <Text className="font-medium text-status-approved">{t("selected")}</Text>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" surface="v5" size="sm" variant={hasOtherSelection ? "secondary" : undefined} onClick={handleSelect} disabled={isPending}>
        {isPending ? t("selecting") : hasOtherSelection ? t("change") : t("select")}
      </Button>
      {error && (
        <p className="font-sans text-body text-status-blocked" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
