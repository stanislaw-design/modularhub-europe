import { z } from "zod";
import { PRODUCT_FAMILIES } from "@/lib/product-technical-specs";
import { getPgErrorCode } from "@/lib/db/pg-error";

// Duże zamówienia B2B (spec 0037). families jest jsonb na project_request
// (AC-1, AC-12), walidowane tu na granicy aplikacji, ten sam wzorzec co
// lib/product-technical-specs.ts (spec 0022); egzekwowane też przez CHECK
// project_request_families_not_empty w bazie (obrona w głąb, na wypadek
// wstawienia z pominięciem tej walidacji).
export const projectRequestFamiliesSchema = z
  .array(z.enum(PRODUCT_FAMILIES))
  .min(1, "Wybierz przynajmniej jedną rodzinę produktu.");

// Powielone ręcznie z lib/db/schema.ts (projectTypeEnum).
export const PROJECT_TYPES = [
  "resort",
  "holiday-park",
  "housing-development",
  "student-housing",
  "senior-living",
  "workforce-accommodation",
  "other",
] as const;

// Znormalizowany e mail (małe litery, przycięty) przed każdym zapisem/odczytem
// porównawczym na project_request/bulk_product_inquiry (AC-7, AC-10, spec
// 0037 Key invariants) — jedno miejsce, żeby submitProjectRequest,
// submitBulkProductInquiry i linkRequestsToClientOnLogin nigdy nie rozjechały się.
export function normalizeContactEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const BULK_REQUEST_EMAIL_LIMIT_ERROR =
  "Masz już 3 nierozstrzygnięte zgłoszenia na ten adres e mail. Poczekaj na odpowiedź albo zamknij jedno z nich, zanim wyślesz kolejne.";

// SQLSTATE P0001 to trigger enforce_bulk_request_email_limit()
// (drizzle/0014_bulk_request_limit_and_audit.sql), zawsze z tym jednym
// komunikatem — odróżnia limit od każdego innego błędu zapisu. getPgErrorCode
// (nie samo error.code, patrz lib/db/pg-error.ts) odpakowuje prawdziwy kod
// spod DrizzleQueryError.cause — bez tego ta funkcja nigdy nie dopasowywała
// (/debug, /check verify spec 0037: czwarte zgłoszenie było poprawnie
// blokowane w bazie, ale użytkownik widział ogólny błąd zamiast tego komunikatu).
export function isBulkRequestEmailLimitError(error: unknown): boolean {
  return getPgErrorCode(error) === "P0001";
}
