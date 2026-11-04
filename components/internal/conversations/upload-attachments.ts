import {
  confirmEntryAttachmentAction,
  requestEntryAttachmentUploadAction,
} from "@/app/[locale]/internal/conversations/actions";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_PER_ENTRY, ATTACHMENT_MIME_TYPES } from "@/lib/conversations/constants";

// Wgrywanie załączników wpisu z przeglądarki (spec 0080 AC-14): akcja podpisuje adres, plik leci
// prosto do prywatnego R2 metodą PUT (omija limit ciała żądania Vercela), akcja potwierdzająca
// sprawdza rozmiar i sygnaturę. Pliki idą po kolei, żeby limit pięciu na wpis był sprawdzany uczciwie.

export const ATTACHMENT_ACCEPT = ATTACHMENT_MIME_TYPES.join(",");

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Tania kontrola przed wysłaniem. Serwer i tak sprawdza rozmiar i sygnaturę pliku jeszcze raz. */
export function checkFilesBeforeUpload(files: File[], alreadyAttached: number): string | null {
  if (alreadyAttached + files.length > ATTACHMENT_MAX_PER_ENTRY) {
    return `Wpis może mieć najwyżej ${ATTACHMENT_MAX_PER_ENTRY} plików (już ma ${alreadyAttached}).`;
  }
  for (const file of files) {
    if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      return `Plik „${file.name}” ma niedozwolony typ. Dozwolone są PDF, JPEG, PNG i WebP.`;
    }
    if (file.size === 0) return `Plik „${file.name}” jest pusty.`;
    if (file.size > ATTACHMENT_MAX_BYTES) return `Plik „${file.name}” jest większy niż 20 MB.`;
  }
  return null;
}

/** Zwraca komunikat o pierwszej porażce albo `null`, gdy wszystkie pliki zostały dodane. */
export async function uploadEntryAttachments(entryId: string, files: File[]): Promise<string | null> {
  for (const file of files) {
    const declaration = { filename: file.name, mimeType: file.type as (typeof ATTACHMENT_MIME_TYPES)[number], sizeBytes: file.size };
    const requested = await requestEntryAttachmentUploadAction(entryId, declaration);
    if (!requested.ok) return `Plik „${file.name}”: ${requested.error}`;

    let response: Response;
    try {
      response = await fetch(requested.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    } catch {
      return `Plik „${file.name}” nie został wysłany. Sprawdź połączenie i spróbuj ponownie.`;
    }
    if (!response.ok) return `Plik „${file.name}” nie został wysłany (błąd ${response.status}).`;

    const confirmed = await confirmEntryAttachmentAction(entryId, requested.key, declaration);
    if (!confirmed.ok) return `Plik „${file.name}”: ${confirmed.error}`;
  }
  return null;
}
