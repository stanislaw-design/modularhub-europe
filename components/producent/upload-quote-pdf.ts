import { confirmProjectQuotePdfUpload, requestProjectQuotePdfUpload, type QuotePdfErrorCode } from "@/lib/project-quote-actions";
import { putFileToSignedUrl } from "@/lib/storage/direct-upload-client";

export type QuotePdfUploadErrorCode = QuotePdfErrorCode | "upload_failed";

export type QuotePdfUploadResult =
  | { ok: true; documentId: string }
  | { ok: false; errorCode: QuotePdfUploadErrorCode };

// Potwierdzenie ponawiamy do 2 razy przy błędach, które mogą być chwilowe (spec 0085 AC-11).
const CONFIRM_RETRY_CODES: QuotePdfErrorCode[] = ["generic", "not_uploaded"];
const CONFIRM_MAX_RETRIES = 2;

// PDF oferty (spec 0085 AC-8, AC-11): prośba o adres, PUT prosto do R2 i potwierdzenie. Wspólne dla
// QuoteForm (wgranie zaraz po złożeniu oferty) i ProjectQuotePdfUploadStep (ponowienie lub podmiana).
// Rozróżnia odmowę serwera (kod z akcji), błąd wysyłki do R2 (`upload_failed`) i błąd potwierdzenia.
export async function uploadQuotePdf(
  quoteId: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<QuotePdfUploadResult> {
  try {
    const requested = await requestProjectQuotePdfUpload(quoteId, { filename: file.name, sizeBytes: file.size });
    if (!requested.ok || !requested.uploadUrl || !requested.intentId) {
      return { ok: false, errorCode: requested.errorCode ?? "generic" };
    }

    const put = await putFileToSignedUrl(requested.uploadUrl, file, "application/pdf", onProgress);
    if (!put.ok) return { ok: false, errorCode: "upload_failed" };

    let result = await confirmProjectQuotePdfUpload(requested.intentId);
    for (let attempt = 0; !result.ok && attempt < CONFIRM_MAX_RETRIES && CONFIRM_RETRY_CODES.includes(result.errorCode ?? "generic"); attempt++) {
      result = await confirmProjectQuotePdfUpload(requested.intentId);
    }
    if (result.ok && result.documentId) return { ok: true, documentId: result.documentId };
    return { ok: false, errorCode: result.errorCode ?? "generic" };
  } catch {
    return { ok: false, errorCode: "generic" };
  }
}
