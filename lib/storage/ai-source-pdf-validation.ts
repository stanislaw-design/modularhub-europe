import { createHash } from "node:crypto";
import { z } from "zod";

export const MAX_AI_SOURCE_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_AI_SOURCE_PDF_FILES = 5;
export const MAX_AI_SOURCE_PDF_PAGES = 200;

export const aiSourceUploadMetadataSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    sizeBytes: z.number().int().positive().max(MAX_AI_SOURCE_PDF_BYTES),
    contentType: z.literal("application/pdf"),
  })
  .strict();

export interface AiSourcePdfValidationResult {
  ok: boolean;
  error?: string;
  pageCount?: number;
  pdfKind?: "text" | "scan" | "mixed";
  sha256?: string;
}

export function sanitizeAiSourceFilename(filename: string): string {
  const leaf = filename.replaceAll("\\", "/").split("/").at(-1) ?? "document.pdf";
  const cleaned = leaf.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "document.pdf").slice(0, 180);
}

export function validateAiSourceUploadMetadata(input: unknown):
  | { ok: true; value: z.infer<typeof aiSourceUploadMetadataSchema> & { safeFilename: string } }
  | { ok: false; error: string } {
  const parsed = aiSourceUploadMetadataSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Plik musi być dokumentem PDF o rozmiarze do 25 MB." };
  }
  const safeFilename = sanitizeAiSourceFilename(parsed.data.filename);
  if (!safeFilename.toLocaleLowerCase("pl").endsWith(".pdf")) {
    return { ok: false, error: "Dozwolone są wyłącznie pliki z rozszerzeniem PDF." };
  }
  return { ok: true, value: { ...parsed.data, safeFilename } };
}

function countPdfPages(source: string): number {
  const pageObjects = source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  const declaredCounts = [...source.matchAll(/\/Count\s+(\d{1,4})\b/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0 && value <= MAX_AI_SOURCE_PDF_PAGES);
  return Math.max(pageObjects, ...declaredCounts, 0);
}

function detectPdfKind(source: string): "text" | "scan" | "mixed" {
  const hasTextOperators = /(?:^|\s)BT(?:\s|$)/m.test(source) && /(?:^|\s)ET(?:\s|$)/m.test(source);
  const hasImages = /\/Subtype\s*\/Image\b/.test(source);
  if (hasTextOperators && hasImages) return "mixed";
  return hasTextOperators ? "text" : "scan";
}

export function validateAiSourcePdf(bytes: Uint8Array): AiSourcePdfValidationResult {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_AI_SOURCE_PDF_BYTES) {
    return { ok: false, error: "Plik PDF jest pusty albo większy niż 25 MB." };
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

  const pageCount = countPdfPages(source);
  if (pageCount < 1) {
    return { ok: false, error: "Nie udało się potwierdzić liczby stron dokumentu PDF." };
  }
  if (pageCount > MAX_AI_SOURCE_PDF_PAGES) {
    return { ok: false, error: "Dokument przekracza limit 200 stron." };
  }

  return {
    ok: true,
    pageCount,
    pdfKind: detectPdfKind(source),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
