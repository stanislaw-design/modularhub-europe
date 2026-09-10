import { z } from "zod";

// AC-3: rozszerzenie i deklarowany Content-Type można podrobić, więc dozwolone
// typy są sprawdzane po rzeczywistych pierwszych bajtach pliku (sygnatura),
// nie tylko po nazwie/MIME zgłoszonym przez przeglądarkę.
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export const uploadProductPhotoInputSchema = z.object({
  productId: z.uuid(),
  filename: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_SIZE_BYTES),
});

// Sygnatury (magic bytes) dla JPEG/PNG/WebP, sprawdzone ręcznie: tylko trzy
// formaty w grze, nie uzasadnia nowej zależności (spec 0031 Key invariants).
function matchesSignature(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function detectImageMimeType(bytes: Uint8Array): AllowedImageMimeType | null {
  if (matchesSignature(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matchesSignature(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // WebP: "RIFF" na początku, "WEBP" od bajtu 8 (RIFF <rozmiar 4B> WEBP).
  if (matchesSignature(bytes, [0x52, 0x49, 0x46, 0x46]) && matchesSignature(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export interface FileValidationResult {
  ok: boolean;
  mimeType?: AllowedImageMimeType;
  error?: string;
}

// Walidacja pełnego pliku po stronie serwera (AC-3): rozmiar plus sygnatura
// bajtowa, zawsze przed wgraniem do R2 lub zapisem w bazie.
export function validateProductPhotoFile(bytes: Uint8Array): FileValidationResult {
  if (bytes.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, error: "Plik jest większy niż 10 MB." };
  }
  const mimeType = detectImageMimeType(bytes);
  if (!mimeType) {
    return { ok: false, error: "Dozwolone są tylko pliki JPEG, PNG lub WebP." };
  }
  return { ok: true, mimeType };
}
