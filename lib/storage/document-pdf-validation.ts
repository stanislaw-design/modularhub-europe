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

export interface DocumentPdfValidationOptions {
  // Spec 0070 AC-28: PDF od anonimowego gościa dodatkowo odrzuca /JavaScript, /JS i
  // /Launch. To heurystyka na surowych bajtach, nie ochrona przed celowo przygotowanym
  // plikiem (nazwa w skompresowanym strumieniu albo zapisana z #xx ją obejdzie).
  // /OpenAction nie jest odrzucane, bo występuje w zwykłych PDF z CAD i edytorów.
  // Domyślnie wyłączone, żeby PDF oferty (0063) i specyfikacji (0049) zachowały
  // dzisiejsze zachowanie.
  rejectActiveContent?: boolean;
}

// maxBytes (spec 0063 AC-4): opcjonalny, domyślnie zostaje dzisiejsze 10 MB
// dla każdego dotychczasowego wołającego; PDF wyceny (lib/project-quote-actions.ts)
// przekazuje własny, wyższy limit 20 MB.
export function validateDocumentPdf(
  bytes: Uint8Array,
  maxBytes: number = MAX_DOCUMENT_PDF_BYTES,
  options: DocumentPdfValidationOptions = {},
): DocumentPdfValidationResult {
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
  if (options.rejectActiveContent && /\/(JavaScript|JS|Launch)\b/.test(source)) {
    return { ok: false, error: "Pliki PDF z aktywną zawartością (skrypty) nie są obsługiwane." };
  }

  return { ok: true };
}
