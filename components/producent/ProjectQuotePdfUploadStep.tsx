"use client";

import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { FileText, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Label, Text } from "@/components/ui";
import { uploadProjectQuotePdf } from "@/lib/project-quote-actions";

interface ProjectQuotePdfUploadStepProps {
  quoteId: string;
  initialFilename?: string | null;
}

// Krok opcjonalny po udanym złożeniu wyceny (spec 0063 AC-11): producent może
// dołączyć PDF przygotowany samemu (Canva/PowerPoint/Word). Wgranie kolejnego
// pliku zastępuje poprzedni atomowo po stronie serwera (uploadProjectQuotePdf,
// AC-3), ten sam mechanizm UI co ProducerSalesPdfUploadStep, bez usuwania --
// spec nie przewiduje akcji usunięcia, tylko wgranie i zastąpienie.
export function ProjectQuotePdfUploadStep({ quoteId, initialFilename = null }: ProjectQuotePdfUploadStepProps) {
  const t = useTranslations("ProjectQuotePdfUploadStep");
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(initialFilename);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0]!;
    event.target.value = "";
    setError(null);
    startTransition(async () => {
      const result = await uploadProjectQuotePdf(quoteId, file);
      if (!result.ok) {
        setError(result.error ?? t("uploadError"));
        return;
      }
      setFilename(file.name);
    });
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <Label htmlFor="quote-pdf-upload">{t("label")}</Label>
      <div className="flex items-center gap-brand-2">
        <input
          ref={inputRef}
          id="quote-pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="sr-only"
          disabled={isPending}
        />
        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          {isPending ? t("uploading") : filename ? t("replaceFile") : t("chooseFile")}
        </Button>
        <Text as="span" variant="label" tone="muted">
          {t("hint")}
        </Text>
      </div>

      {error && (
        <p role="alert" className="rounded-data bg-status-blocked/10 px-brand-2 py-1 text-body text-status-blocked">
          {error}
        </p>
      )}

      {filename && (
        <div className="flex items-center gap-brand-2 rounded-data border border-brand-steel px-brand-2 py-brand-1">
          <FileText className="size-8 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
          <Text as="span" className="min-w-0 flex-1 truncate">
            {filename}
          </Text>
        </div>
      )}
    </div>
  );
}
