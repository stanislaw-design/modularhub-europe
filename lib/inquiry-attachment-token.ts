import { createHmac, timingSafeEqual } from "node:crypto";
import { UPLOAD_TOKEN_TTL_MS, type InquiryKind } from "@/lib/inquiry-attachment-specs";

// Spec 0070 AC-29: token wgrywania gościa bez konta. HMAC-SHA256 z rodzaju, id
// zapytania i chwili wygaśnięcia. Klucz jest wyprowadzony z AUTH_SECRET z osobnym
// prefiksem celu, więc ten sam sekret nie podpisuje tokenów innego rodzaju.
// Token żyje tylko w stanie komponentu i w odpowiedzi akcji, nigdy w adresie URL.
const KEY_PURPOSE = "modularhub:inquiry-attachment-upload:v1";

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET nie jest ustawione");
  return createHmac("sha256", secret).update(KEY_PURPOSE).digest();
}

function sign(kind: InquiryKind, inquiryId: string, expiresAtMs: number): string {
  return createHmac("sha256", deriveKey()).update(`${kind}:${inquiryId}:${expiresAtMs}`).digest("hex");
}

export function createUploadToken(kind: InquiryKind, inquiryId: string, now: Date = new Date()): string {
  const expiresAtMs = now.getTime() + UPLOAD_TOKEN_TTL_MS;
  return `${expiresAtMs}.${sign(kind, inquiryId, expiresAtMs)}`;
}

// Porównanie w stałym czasie. Każdy błąd (zły format, zły podpis, minął termin,
// brak sekretu) to po prostu "nieważny".
export function verifyUploadToken(
  token: string | undefined,
  kind: InquiryKind,
  inquiryId: string,
  now: Date = new Date(),
): boolean {
  if (!token) return false;
  const separator = token.indexOf(".");
  if (separator <= 0) return false;

  const expiresAtMs = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs < now.getTime()) return false;

  try {
    const expected = Buffer.from(sign(kind, inquiryId, expiresAtMs), "hex");
    const actual = Buffer.from(signature, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
