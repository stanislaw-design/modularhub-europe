// Spec 0070 część D (AC-28 do AC-34): stałe i czyste funkcje wspólne dla akcji
// serwerowych, wyzwalacza w bazie (drizzle/0059, te same liczby) i interfejsu.
// Plik nie importuje niczego serwerowego, więc komponenty klienckie mogą z niego
// korzystać (limity w opisie pola, filtr typów w polu wyboru pliku).

export type InquiryKind = "request" | "product";

// Limity na zapytanie (AC-28). Wyzwalacz w bazie ma te same wartości w bajtach.
export const ATTACHMENT_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_MAX_ACTIVE_FILES = 10;
export const ATTACHMENT_MAX_ACTIVE_BYTES = 60 * 1024 * 1024;
export const ATTACHMENT_MAX_STORED_FILES = 30;
export const ATTACHMENT_MAX_STORED_BYTES = 150 * 1024 * 1024;

export const ATTACHMENT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";

// Token wgrywania gościa (AC-29): dwie godziny od złożenia zapytania.
export const UPLOAD_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

// Podpisany link do pobrania ważny 10 minut (AC-30).
export const ATTACHMENT_URL_TTL_SECONDS = 10 * 60;

// Dzienny globalny limit bajtów od gości (Security model). Zmienna opcjonalna.
export const DEFAULT_GUEST_UPLOAD_DAILY_BYTES = 500 * 1024 * 1024;

// Kody błędów akcji plików. Interfejs tłumaczy je na cztery języki, polski tekst w
// polu `error` akcji jest tylko zapasem.
export type AttachmentErrorCode =
  | "no_access"
  | "consent_required"
  | "invalid_type"
  | "too_large"
  | "file_rejected"
  | "limit_count"
  | "limit_size"
  | "limit_stored"
  | "closed"
  | "guest_daily_limit"
  | "storage_failed"
  | "not_found"
  | "reason_required"
  | "generic";

export const MAX_FILENAME_LENGTH = 120;

// AC-30: nazwa pliku bez znaków sterujących i ścieżek, do 120 znaków. Zachowuje
// rozszerzenie przy skracaniu, żeby plik dało się otworzyć pod właściwym typem.
export function sanitizeAttachmentFilename(raw: string): string {
  // Ścieżka: tylko ostatni segment po / lub \ (także zakodowane przeglądarką ścieżki
  // typu "C:\\Users\\x\\plik.pdf" i "../../plik.pdf").
  const lastSegment = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = lastSegment
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, "")
    // Znaki, które psują nagłówek pobrania albo system plików.
    .replace(/["<>:|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    // Kropki na początku robiłyby z nazwy plik ukryty albo ".." .
    .replace(/^\.+/, "");
  if (!cleaned) return "plik";
  if (cleaned.length <= MAX_FILENAME_LENGTH) return cleaned;

  const dot = cleaned.lastIndexOf(".");
  const extension = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : "";
  return cleaned.slice(0, MAX_FILENAME_LENGTH - extension.length) + extension;
}

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
