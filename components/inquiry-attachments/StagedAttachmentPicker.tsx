"use client";

import { FileText, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button, Checkbox, Label, Stack, Text } from "@/components/ui";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_ACTIVE_BYTES,
  ATTACHMENT_MAX_ACTIVE_FILES,
  ATTACHMENT_MAX_FILE_BYTES,
  formatAttachmentSize,
} from "@/lib/inquiry-attachment-specs";
import type { InquiryAttachmentLabels } from "./labels";

interface StagedAttachmentPickerProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  consent: boolean;
  onConsentChange: (consent: boolean) => void;
  labels: InquiryAttachmentLabels;
  surface?: "v5" | "v3";
}

// Wybór plików PRZED wysłaniem zapytania: pliki zostają w pamięci przeglądarki, a
// wgrywa je InquiryAttachmentUploader (initialFiles) zaraz po utworzeniu zapytania,
// bo zapis pliku wymaga istniejącego zapytania i tokenu (spec 0070 AC-28/29).
// Tu sprawdzamy tylko limity widoczne od razu (rozmiar, liczba); resztę waliduje serwer.
export function StagedAttachmentPicker({
  files,
  onFilesChange,
  consent,
  onConsentChange,
  labels,
  surface = "v5",
}: StagedAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const consentId = useId();
  const [error, setError] = useState<string | null>(null);
  const line = surface === "v5" ? "border-brand-v5-line" : "border-brand-steel";

  function handleSelect(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const next = [...files];
    let rejected: string | null = null;
    for (const file of Array.from(selected)) {
      const totalBytes = next.reduce((sum, item) => sum + item.size, 0) + file.size;
      if (file.size > ATTACHMENT_MAX_FILE_BYTES) rejected = labels.errors.too_large;
      else if (next.length >= ATTACHMENT_MAX_ACTIVE_FILES || totalBytes > ATTACHMENT_MAX_ACTIVE_BYTES)
        rejected = labels.limitsHint;
      else next.push(file);
    }
    setError(rejected);
    onFilesChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Stack gap={3}>
      <Text tone="muted" surface={surface} className="text-data">
        {labels.limitsHint}
      </Text>
      <p className={`rounded-data border ${line} px-brand-3 py-brand-2 text-data`}>{labels.warning}</p>
      <div className="flex items-start gap-brand-2">
        <Checkbox id={consentId} surface={surface} checked={consent} onChange={(event) => onConsentChange(event.target.checked)} />
        <Label htmlFor={consentId} surface={surface}>
          {labels.consentLabel}
        </Label>
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          aria-label={labels.chooseFiles}
          data-testid="staged-attachment-input"
          disabled={!consent}
          onChange={(event) => handleSelect(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          surface={surface}
          disabled={!consent}
          onClick={() => inputRef.current?.click()}
          className="w-fit"
        >
          <Upload className="size-4" aria-hidden="true" />
          {labels.chooseFiles}
        </Button>
      </div>
      {error && (
        <p className="text-data text-status-blocked" role="alert">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <ul className="flex flex-col gap-brand-2">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className={`flex items-center gap-brand-2 rounded-data border ${line} px-brand-3 py-brand-2`}>
              <FileText className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-body">{file.name}</span>
              <span className="shrink-0 text-data">{formatAttachmentSize(file.size)}</span>
              <button
                type="button"
                className="focus-ring shrink-0 rounded p-1"
                aria-label={`${labels.remove}: ${file.name}`}
                onClick={() => onFilesChange(files.filter((_, i) => i !== index))}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}
