"use client";

import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button, Checkbox, Label, Stack, Text } from "@/components/ui";
import { confirmInquiryAttachment, requestInquiryAttachmentUpload } from "@/lib/inquiry-attachment-actions";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_FILE_BYTES,
  formatAttachmentSize,
  type AttachmentErrorCode,
  type InquiryKind,
} from "@/lib/inquiry-attachment-specs";
import { declaredMimeType, putFileToSignedUrl } from "@/lib/storage/direct-upload-client";
import type { InquiryAttachmentLabels } from "./labels";

interface InquiryAttachmentUploaderProps {
  kind: InquiryKind;
  inquiryId: string;
  labels: InquiryAttachmentLabels;
  // Token gościa (spec 0070 AC-29): żyje wyłącznie w stanie komponentu, nigdy w adresie URL.
  uploadToken?: string;
  // Admin i doradca: bez pola zgody (AC-32), z innym ostrzeżeniem.
  staff?: boolean;
  surface?: "v5" | "v3";
  // Odświeża stronę serwerową po wgraniu (lista plików na stronie szczegółów).
  refreshOnUploaded?: boolean;
  // Dla stron z listą: przycisk zamiast bloku z opisem.
  compact?: boolean;
  // Wołane po każdym udanym wgraniu (panel używa tego przy "Zamień": usuwa stary plik).
  onUploaded?: () => void;
  // Pliki wybrane jeszcze w formularzu zapytania: wgrywane zaraz po zamontowaniu,
  // a zgoda została już potwierdzona w formularzu.
  initialFiles?: File[];
}

type ItemStatus = "uploading" | "done" | "error";

interface UploadItem {
  key: string;
  file: File;
  status: ItemStatus;
  errorCode?: AttachmentErrorCode;
  // Postęp wysyłania do R2 w przedziale 0 do 1 (spec 0085 AC-11).
  progress?: number;
}

// Potwierdzenie ponawiamy do 2 razy przy błędach, które mogą być chwilowe (spec 0085 AC-11).
const CONFIRM_RETRY_CODES: AttachmentErrorCode[] = ["generic", "storage_failed", "not_uploaded"];
const CONFIRM_MAX_RETRIES = 2;

// AC-28, AC-29: każdy plik jest osobnym wywołaniem akcji, ze swoim paskiem postępu i
// przyciskiem ponowienia. Błąd jednego pliku nie cofa zapytania ani pozostałych plików.
// Wgrywanie idzie po kolei, bo wyzwalacz w bazie i tak serializuje zapisy jednego zapytania.
export function InquiryAttachmentUploader({
  kind,
  inquiryId,
  labels,
  uploadToken,
  staff = false,
  surface = "v5",
  refreshOnUploaded = false,
  compact = false,
  onUploaded,
  initialFiles,
}: InquiryAttachmentUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const consentId = useId();
  const [consent, setConsent] = useState(Boolean(initialFiles?.length));
  const nextKey = useRef(initialFiles?.length ?? 0);
  const [items, setItems] = useState<UploadItem[]>(() =>
    (initialFiles ?? []).map((file, index) => ({ key: `file-${index}`, file, status: "uploading" as const }))
  );
  const queue = useRef<Promise<void>>(Promise.resolve());

  const canPick = staff || consent;
  const line = surface === "v5" ? "border-brand-v5-line" : "border-brand-steel";

  function update(key: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function uploadOne(item: UploadItem) {
    update(item.key, { status: "uploading", errorCode: undefined, progress: undefined });
    if (item.file.size > ATTACHMENT_MAX_FILE_BYTES) {
      update(item.key, { status: "error", errorCode: "too_large" });
      return;
    }
    try {
      // Krok 1: serwer sprawdza uprawnienia i limity, wydaje podpisany adres (odmowa ma kod błędu).
      const requested = await requestInquiryAttachmentUpload(
        kind,
        inquiryId,
        { filename: item.file.name, mimeType: declaredMimeType(item.file), sizeBytes: item.file.size },
        { uploadToken, confirmedNoContactData: staff ? undefined : consent },
      );
      if (!requested.ok || !requested.uploadUrl || !requested.intentId) {
        update(item.key, { status: "error", errorCode: requested.errorCode ?? "generic" });
        return;
      }

      // Krok 2: plik leci prosto do R2, z pominięciem funkcji serwerowej.
      const put = await putFileToSignedUrl(requested.uploadUrl, item.file, declaredMimeType(item.file), (fraction) =>
        update(item.key, { progress: fraction }),
      );
      if (!put.ok) {
        update(item.key, { status: "error", errorCode: "upload_failed" });
        return;
      }

      // Krok 3: potwierdzenie (serwer sprawdza rozmiar i zawartość, dopiero wtedy powstaje wiersz).
      let result = await confirmInquiryAttachment(requested.intentId, { uploadToken });
      for (let attempt = 0; !result.ok && attempt < CONFIRM_MAX_RETRIES && CONFIRM_RETRY_CODES.includes(result.errorCode ?? "generic"); attempt++) {
        result = await confirmInquiryAttachment(requested.intentId, { uploadToken });
      }
      if (result.ok) {
        update(item.key, { status: "done" });
        onUploaded?.();
        if (refreshOnUploaded) router.refresh();
      } else {
        update(item.key, { status: "error", errorCode: result.errorCode ?? "generic" });
      }
    } catch {
      update(item.key, { status: "error", errorCode: "generic" });
    }
  }

  function enqueue(batch: UploadItem[]) {
    queue.current = queue.current.then(async () => {
      for (const item of batch) await uploadOne(item);
    });
  }

  const startedInitial = useRef(false);
  useEffect(() => {
    if (startedInitial.current || items.length === 0) return;
    startedInitial.current = true;
    enqueue(items);
    // Tylko przy montowaniu: kolejne pliki idą przez handleSelect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(files: FileList | null) {
    if (!files || files.length === 0 || !canPick) return;
    const batch: UploadItem[] = Array.from(files).map((file) => ({
      key: `file-${nextKey.current++}`,
      file,
      status: "uploading",
    }));
    setItems((current) => [...current, ...batch]);
    enqueue(batch);
    if (inputRef.current) inputRef.current.value = "";
  }

  function retry(item: UploadItem) {
    enqueue([item]);
  }

  function dismiss(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function errorText(item: UploadItem): string {
    const code = item.errorCode ?? "generic";
    // Gość, któremu token wygasł albo nie przeszedł: wskazówka, co zrobić zamiast "brak dostępu".
    if (code === "no_access" && !staff && uploadToken) return labels.tokenExpired;
    return labels.errors[code];
  }

  return (
    <Stack gap={3}>
      {!compact && (
        <Text tone="muted" surface={surface}>
          {labels.intro}
        </Text>
      )}
      <Text tone="muted" surface={surface} className="text-data">
        {labels.limitsHint}
      </Text>
      <p className={`rounded-data border ${line} px-brand-3 py-brand-2 text-data`}>
        {staff ? labels.staffWarning : labels.warning}
      </p>
      {!staff && (
        <div className="flex items-start gap-brand-2">
          <Checkbox id={consentId} surface={surface} checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <Label htmlFor={consentId} surface={surface}>
            {labels.consentLabel}
          </Label>
        </div>
      )}
      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          aria-label={labels.chooseFiles}
          data-testid="inquiry-attachment-input"
          disabled={!canPick}
          onChange={(event) => handleSelect(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          surface={surface}
          disabled={!canPick}
          onClick={() => inputRef.current?.click()}
          className="w-fit"
        >
          <Upload className="size-4" aria-hidden="true" />
          {compact ? labels.addFiles : labels.chooseFiles}
        </Button>
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-brand-2" aria-live="polite">
          {items.map((item) => (
            <li key={item.key} className={`flex flex-col gap-brand-1 rounded-data border ${line} px-brand-3 py-brand-2`}>
              <div className="flex items-center gap-brand-2">
                <FileText className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-body">{item.file.name}</span>
                <span className="shrink-0 text-data">{formatAttachmentSize(item.file.size)}</span>
              </div>
              {item.status === "uploading" && (
                <progress
                  className="h-1.5 w-full"
                  aria-label={`${labels.statusUploading}: ${item.file.name}`}
                  {...(item.progress !== undefined ? { value: Math.round(item.progress * 100), max: 100 } : {})}
                />
              )}
              {item.status === "done" && <span className="text-data text-status-approved">{labels.statusDone}</span>}
              {item.status === "error" && (
                <div className="flex flex-wrap items-center gap-brand-2">
                  <span className="text-data text-status-blocked" role="alert">
                    {labels.statusError}: {errorText(item)}
                  </span>
                  <Button type="button" variant="secondary" surface={surface} size="sm" onClick={() => retry(item)}>
                    {labels.retry}
                  </Button>
                  <Button type="button" variant="secondary" surface={surface} size="sm" onClick={() => dismiss(item.key)}>
                    {labels.dismiss}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}
