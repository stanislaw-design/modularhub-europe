// Walidacja pliku PDF specyfikacji produktu (spec 0049 AC-6, AC-11): mniejszy
// odpowiednik lib/storage/ai-source-pdf-validation.ts, bez części właściwych
// tylko prywatnej kwarantannie sesji importu AI (ClamAV, liczba stron,
// deduplikacja SHA 256, wykrywanie skanu) — ten plik trafia od razu do
// publicznego magazynu R2, tak jak zdjęcia i rzuty (spec 0031).
export const MAX_DOCUMENT_PDF_BYTES = 10 * 1024 * 1024;

export interface DocumentPdfValidationResult {
  ok: boolean;
  error?: string;
}

// maxBytes (spec 0063 AC-4): opcjonalny, domyślnie zostaje dzisiejsze 10 MB
// dla każdego dotychczasowego wołającego; PDF wyceny (lib/project-quote-actions.ts)
// przekazuje własny, wyższy limit 20 MB.
export function validateDocumentPdf(bytes: Uint8Array, maxBytes: number = MAX_DOCUMENT_PDF_BYTES): DocumentPdfValidationResult {
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
    return { ok: false, error: `Plik PDF jest pusty albo większy niż ${Math.floor(maxBytes / (1024 * 1024))} MB.` };
  }
  const header = Buffer.from(bytes.subarray(0, 8)).toString("latin1");
  if (!header.startsWith("%PDF-")) {
    return { ok: false, error: "Zawartość pliku nie ma prawidłowej sygnatury PDF." };
  }

  const source = Buffer.from(bytes).toString("latin1");
  const tail = source.slice(-2_048);
  if (!tail.includes("%%EOF")) {
    return { ok: false, error: "Plik PDF jest niekompletny albo uszkodzony." };
  }
  if (/\/Encrypt\b/.test(source)) {
    return { ok: false, error: "Zaszyfrowane lub chronione hasłem pliki PDF nie są obsługiwane." };
  }

  return { ok: true };
}
