"use client";

import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Label, Text } from "@/components/ui";
import { deleteProductSpecificationPdf, uploadProductSpecificationPdf } from "@/lib/product-photo-actions";

export interface ProducerSpecificationPdf {
  id: string;
  url: string;
  filename: string;
}

interface ProducerSpecificationPdfUploadStepProps {
  productId: string;
  specificationPdf: ProducerSpecificationPdf | null;
  onSpecificationPdfChange: (specificationPdf: ProducerSpecificationPdf | null) => void;
}

// Spec 0049 AC-6, AC-7, AC-8: dokładnie jeden plik PDF specyfikacji na
// produkt, opcjonalny (żadna z 25 AC spec 0049 nie wymaga go do publikacji).
// Wgranie nowego pliku zastępuje poprzedni atomowo po stronie serwera
// (uploadProductSpecificationPdf), więc tu wystarczy zwykłe zastąpienie
// lokalnego stanu, ten sam mechanizm wgrywania na wybór co
// ProducerFloorPlanUploadStep, uproszczony do jednego pliku bez wariantu.
export function ProducerSpecificationPdfUploadStep({
  productId,
  specificationPdf,
  onSpecificationPdfChange,
}: ProducerSpecificationPdfUploadStepProps) {
  const t = useTranslations("ProducerSpecificationPdfUploadStep");
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
      const result = await uploadProductSpecificationPdf(productId, file);
      if (!result.ok || !result.documentId || !result.url) {
        setError(result.error ?? t("uploadError"));
        return;
      }
      onSpecificationPdfChange({ id: result.documentId, url: result.url, filename: file.name });
    });
  }

  function handleDelete() {
    if (!specificationPdf) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductSpecificationPdf(specificationPdf.id);
      if (!result.ok) {
        setError(result.error ?? t("deleteError"));
        return;
      }
      onSpecificationPdfChange(null);
    });
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <Label htmlFor="wizard-specification-pdf">{t("label")}</Label>
      <div className="flex items-center gap-brand-2">
        <input
          ref={inputRef}
          id="wizard-specification-pdf"
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="sr-only"
          disabled={isPending}
        />
        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          {specificationPdf ? t("replaceFile") : t("chooseFile")}
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

      {specificationPdf ? (
        <div className="flex items-center gap-brand-2 rounded-data border border-brand-steel px-brand-2 py-brand-1">
          <FileText className="size-8 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
          <Text as="span" className="min-w-0 flex-1 truncate">
            {specificationPdf.filename}
          </Text>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            aria-label={t("removeFile", { name: specificationPdf.filename })}
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
