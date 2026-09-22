"use client";

import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Label, Text } from "@/components/ui";
import { deleteProductSalesPdf, uploadProductSalesPdf } from "@/lib/product-photo-actions";

export interface ProducerSalesPdf {
  id: string;
  url: string;
  filename: string;
}

interface ProducerSalesPdfUploadStepProps {
  productId: string;
  salesPdf: ProducerSalesPdf | null;
  onSalesPdfChange: (salesPdf: ProducerSalesPdf | null) => void;
}

// Spec 0050 AC-25, AC-26, AC-27: opcjonalny PDF sprzedażowy, dodatkowe źródło
// informacji obok PDF specyfikacji (spec 0049). Dokładnie ten sam mechanizm
// co ProducerSpecificationPdfUploadStep — najwyżej jeden plik, wgranie
// nowego zastępuje poprzedni atomowo po stronie serwera
// (uploadProductSalesPdf), nie tłumaczony (AC-27).
export function ProducerSalesPdfUploadStep({ productId, salesPdf, onSalesPdfChange }: ProducerSalesPdfUploadStepProps) {
  const t = useTranslations("ProducerSalesPdfUploadStep");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0]!;
    event.target.value = "";
    setError(null);
    startTransition(async () => {
      const result = await uploadProductSalesPdf(productId, file);
      if (!result.ok || !result.documentId || !result.url) {
        setError(result.error ?? t("uploadError"));
        return;
      }
      onSalesPdfChange({ id: result.documentId, url: result.url, filename: file.name });
    });
  }

  function handleDelete() {
    if (!salesPdf) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductSalesPdf(salesPdf.id);
      if (!result.ok) {
        setError(result.error ?? t("deleteError"));
        return;
      }
      onSalesPdfChange(null);
    });
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <Label htmlFor="wizard-sales-pdf">{t("label")}</Label>
      <div className="flex items-center gap-brand-2">
        <input
          ref={inputRef}
          id="wizard-sales-pdf"
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="sr-only"
          disabled={isPending}
        />
        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          {salesPdf ? t("replaceFile") : t("chooseFile")}
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

      {salesPdf ? (
        <div className="flex items-center gap-brand-2 rounded-data border border-brand-steel px-brand-2 py-brand-1">
          <FileText className="size-8 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
          <Text as="span" className="min-w-0 flex-1 truncate">
            {salesPdf.filename}
          </Text>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            aria-label={t("removeFile", { name: salesPdf.filename })}
            className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked disabled:opacity-30"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <Text tone="muted">{t("noFile")}</Text>
      )}
    </div>
  );
}
