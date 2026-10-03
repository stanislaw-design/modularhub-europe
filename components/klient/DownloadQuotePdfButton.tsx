"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { getProjectQuotePdfUrl } from "@/lib/project-quote-actions";

interface DownloadQuotePdfButtonProps {
  quoteId: string;
}

// „Pobierz PDF" na ekranie wycen klienta (spec 0063 AC-9, AC-11): widoczny
// niezależnie od statusu wyceny (w przeciwieństwie do AcceptQuoteButton,
// który dotyczy wyłącznie wycen active). Generuje świeży podpisany URL na
// każde kliknięcie (AC-7), nigdy zapisywany, otwiera w nowej karcie.
export function DownloadQuotePdfButton({ quoteId }: DownloadQuotePdfButtonProps) {
  const t = useTranslations("DownloadQuotePdfButton");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      const result = await getProjectQuotePdfUrl(quoteId);
      if (!result.ok || !result.url) {
        setError(result.error ?? t("genericError"));
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" surface="v5" size="sm" onClick={handleDownload} disabled={isPending}>
        {isPending ? t("preparing") : t("download")}
      </Button>
      {error && (
        <p className="font-sans text-body text-status-blocked" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
