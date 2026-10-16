import { ATTACHMENT_MAX_FILE_BYTES, type AttachmentErrorCode } from "@/lib/inquiry-attachment-specs";
import { detectImageMimeType } from "./document-validation";
import { validateDocumentPdf } from "./document-pdf-validation";

// Spec 0070 AC-28: dozwolone typy plików inwestora to PDF, JPEG, PNG i WebP,
// rozpoznawane po sygnaturze bajtów, nie po rozszerzeniu ani nagłówku
// przeglądarki. Obraz nazwany ".pdf" zapisze się jako obraz, a plik bez
// dozwolonej sygnatury jest odrzucany.
export type InquiryAttachmentMimeType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

export type InquiryAttachmentValidation =
  | { ok: true; mimeType: InquiryAttachmentMimeType }
  | { ok: false; errorCode: AttachmentErrorCode; error: string };

export function validateInquiryAttachment(bytes: Uint8Array): InquiryAttachmentValidation {
  if (bytes.byteLength === 0) {
    return { ok: false, errorCode: "invalid_type", error: "Plik jest pusty." };
  }
  if (bytes.byteLength > ATTACHMENT_MAX_FILE_BYTES) {
    return { ok: false, errorCode: "too_large", error: "Plik jest większy niż 20 MB." };
  }

  const header = Buffer.from(bytes.subarray(0, 5)).toString("latin1");
  if (header === "%PDF-") {
    const pdf = validateDocumentPdf(bytes, ATTACHMENT_MAX_FILE_BYTES, { rejectActiveContent: true });
    if (!pdf.ok) {
      return { ok: false, errorCode: "file_rejected", error: pdf.error ?? "Nieprawidłowy plik PDF." };
    }
    return { ok: true, mimeType: "application/pdf" };
  }

  const imageType = detectImageMimeType(bytes);
  if (imageType) return { ok: true, mimeType: imageType };

  return { ok: false, errorCode: "invalid_type", error: "Dozwolone są tylko pliki PDF, JPEG, PNG lub WebP." };
}
