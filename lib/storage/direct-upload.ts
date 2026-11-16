import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captureError } from "@/lib/observability";
import { deletePrivateObject } from "./private-r2-client";

// Spec 0085: zamiary bezpośredniego wgrania pliku do prywatnego R2. Plik leci z przeglądarki pod
// kluczem tymczasowym `uploads/<uuid>`, a dopiero potwierdzenie kopiuje go na klucz ostateczny.
// Ten plik ma "server-only" i nigdy "use server" (nie jest akcją, tylko kodem domenowym).

export const UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const INTENT_TTL_MS = 60 * 60 * 1000;
// Okno, w którym rozpoczęte, niezużyte wgranie liczy się do limitów (adres nadal działa).
export const PENDING_WINDOW_MINUTES = 15;
export const TEMP_KEY_PREFIX = "uploads/";

export type IntentPurpose = "inquiry_attachment" | "project_quote_pdf";
export type IntentActorKind = "staff" | "client" | "guest" | "producer";

export interface IntentTarget {
  projectRequestId?: string;
  bulkProductInquiryId?: string;
  projectQuoteId?: string;
}

export interface UploadIntentRow {
  id: string;
  purpose: IntentPurpose;
  projectRequestId: string | null;
  bulkProductInquiryId: string | null;
  projectQuoteId: string | null;
  actorKind: IntentActorKind;
  actorUserId: string | null;
  r2Key: string;
  mimeType: string;
  declaredSizeBytes: number;
  filename: string;
  consentConfirmed: boolean;
  expiresAt: Date;
  consumedAt: Date | null;
  purgedAt: Date | null;
  expired: boolean;
}

function targetMatch(target: IntentTarget) {
  if (target.projectRequestId) return sql`"project_request_id" = ${target.projectRequestId}`;
  if (target.bulkProductInquiryId) return sql`"bulk_product_inquiry_id" = ${target.bulkProductInquiryId}`;
  return sql`"project_quote_id" = ${target.projectQuoteId ?? null}`;
}

// Rozpoczęte i jeszcze niezużyte wgrania celu z ostatnich 15 minut (AC-3).
export async function pendingForTarget(target: IntentTarget): Promise<{ count: number; bytes: number }> {
  const result = await db.execute<{ count: string; bytes: string }>(sql`
    SELECT count(*)::text AS count, COALESCE(sum("declared_size_bytes"), 0)::text AS bytes
    FROM "upload_intent"
    WHERE ${targetMatch(target)} AND "consumed_at" IS NULL AND "purged_at" IS NULL
      AND "created_at" > now() - make_interval(mins => ${PENDING_WINDOW_MINUTES})
  `);
  return { count: Number(result.rows[0]?.count ?? 0), bytes: Number(result.rows[0]?.bytes ?? 0) };
}

// Bajty rozpoczętych wgrań gości z ostatnich 15 minut: dolicza się do dziennego limitu gościa (AC-3).
export async function guestPendingBytes(): Promise<number> {
  const result = await db.execute<{ bytes: string }>(sql`
    SELECT COALESCE(sum("declared_size_bytes"), 0)::text AS bytes FROM "upload_intent"
    WHERE "actor_kind" = 'guest' AND "purpose" = 'inquiry_attachment'
      AND "consumed_at" IS NULL AND "purged_at" IS NULL
      AND "created_at" > now() - make_interval(mins => ${PENDING_WINDOW_MINUTES})
  `);
  return Number(result.rows[0]?.bytes ?? 0);
}

async function deleteQuietly(key: string, path: string): Promise<void> {
  try {
    await deletePrivateObject(key);
  } catch (error) {
    captureError(error, { path });
  }
}

export interface CreateIntentInput {
  purpose: IntentPurpose;
  target: IntentTarget;
  actorKind: IntentActorKind;
  actorUserId: string | null;
  mimeType: string;
  declaredSizeBytes: number;
  filename: string;
  consentConfirmed: boolean;
}

// Ponowna prośba o ten sam plik (ten sam wywołujący, cel, nazwa i rozmiar) unieważnia poprzedni
// niezużyty zamiar i usuwa jego obiekt, więc ponowienie nie zajmuje drugiego miejsca w limicie.
// Wołane PRZED liczeniem limitów, żeby ponowienie nie liczyło się podwójnie.
export async function supersedeSameUpload(input: CreateIntentInput): Promise<void> {
  const actorMatch =
    input.actorKind === "guest" ? sql`"actor_kind" = 'guest'` : sql`"actor_user_id" = ${input.actorUserId}`;
  const result = await db.execute<{ r2_key: string }>(sql`
    UPDATE "upload_intent" SET "consumed_at" = now(), "purged_at" = now()
    WHERE "purpose" = ${input.purpose} AND ${targetMatch(input.target)} AND ${actorMatch}
      AND "filename" = ${input.filename} AND "declared_size_bytes" = ${input.declaredSizeBytes}
      AND "consumed_at" IS NULL AND "purged_at" IS NULL
    RETURNING "r2_key"
  `);
  for (const row of result.rows) await deleteQuietly(row.r2_key, "direct-upload:supersede");
}

export async function createIntent(input: CreateIntentInput): Promise<{ id: string; r2Key: string; expiresAt: Date }> {
  const id = randomUUID();
  const r2Key = `${TEMP_KEY_PREFIX}${randomUUID()}`;
  const expiresAt = new Date(Date.now() + INTENT_TTL_MS);
  await db.execute(sql`
    INSERT INTO "upload_intent" (
      "id", "purpose", "project_request_id", "bulk_product_inquiry_id", "project_quote_id",
      "actor_kind", "actor_user_id", "r2_key", "mime_type", "declared_size_bytes", "filename",
      "consent_confirmed", "expires_at"
    ) VALUES (
      ${id}, ${input.purpose}, ${input.target.projectRequestId ?? null}, ${input.target.bulkProductInquiryId ?? null},
      ${input.target.projectQuoteId ?? null}, ${input.actorKind}, ${input.actorUserId}, ${r2Key}, ${input.mimeType},
      ${input.declaredSizeBytes}, ${input.filename}, ${input.consentConfirmed}, ${expiresAt.toISOString()}
    )
  `);
  return { id, r2Key, expiresAt };
}

export async function loadIntent(intentId: string): Promise<UploadIntentRow | null> {
  const result = await db.execute<{
    id: string;
    purpose: IntentPurpose;
    project_request_id: string | null;
    bulk_product_inquiry_id: string | null;
    project_quote_id: string | null;
    actor_kind: IntentActorKind;
    actor_user_id: string | null;
    r2_key: string;
    mime_type: string;
    declared_size_bytes: number;
    filename: string;
    consent_confirmed: boolean;
    expires_at: string | Date;
    consumed_at: string | Date | null;
    purged_at: string | Date | null;
    expired: boolean;
  }>(sql`SELECT *, ("expires_at" <= now()) AS expired FROM "upload_intent" WHERE "id" = ${intentId}`);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    purpose: row.purpose,
    projectRequestId: row.project_request_id,
    bulkProductInquiryId: row.bulk_product_inquiry_id,
    projectQuoteId: row.project_quote_id,
    actorKind: row.actor_kind,
    actorUserId: row.actor_user_id,
    r2Key: row.r2_key,
    mimeType: row.mime_type,
    declaredSizeBytes: Number(row.declared_size_bytes),
    filename: row.filename,
    consentConfirmed: row.consent_confirmed,
    expiresAt: new Date(row.expires_at),
    consumedAt: row.consumed_at ? new Date(row.consumed_at) : null,
    purgedAt: row.purged_at ? new Date(row.purged_at) : null,
    expired: row.expired,
  };
}

// Plik niezgodny: usuwa obiekt tymczasowy, a zamiar zostaje zużyty i oczyszczony (AC-5).
export async function rejectIntent(intent: Pick<UploadIntentRow, "id" | "r2Key">): Promise<void> {
  await deleteQuietly(intent.r2Key, "direct-upload:reject");
  await db.execute(sql`
    UPDATE "upload_intent" SET "consumed_at" = COALESCE("consumed_at", now()), "purged_at" = now()
    WHERE "id" = ${intent.id}
  `);
}

// Usuwa obiekt, ale zostawia zamiar do ponowienia (np. zamknięte zapytanie przy potwierdzeniu).
export async function discardIntentObject(intent: Pick<UploadIntentRow, "r2Key">): Promise<void> {
  await deleteQuietly(intent.r2Key, "direct-upload:discard");
}

export interface UploadsCleanupResult {
  purgedIntents: number;
  purgedStaleKeys: number;
  purgedDeletedAttachments: number;
  deletedRows: number;
  errors: number;
}

// Zadanie czyszczące (AC-9). Błąd jednego obiektu nie przerywa pętli i trafia do Sentry; powtórne
// uruchomienie jest bezpieczne (zajęcie wiersza jest warunkowe, usuwanie z R2 idempotentne).
export async function runUploadsCleanup(): Promise<UploadsCleanupResult> {
  const result: UploadsCleanupResult = {
    purgedIntents: 0,
    purgedStaleKeys: 0,
    purgedDeletedAttachments: 0,
    deletedRows: 0,
    errors: 0,
  };

  // 1. Niezużyte zamiary wygasłe od ponad 15 minut: najpierw zajmujemy wiersz, potem usuwamy obiekt;
  //    przy błędzie usunięcia cofamy `purged_at`, żeby następne uruchomienie ponowiło.
  const claimed = await db.execute<{ id: string; r2_key: string }>(sql`
    UPDATE "upload_intent" SET "purged_at" = now()
    WHERE "consumed_at" IS NULL AND "purged_at" IS NULL AND "expires_at" < now() - interval '15 minutes'
    RETURNING "id", "r2_key"
  `);
  for (const row of claimed.rows) {
    try {
      await deletePrivateObject(row.r2_key);
      result.purgedIntents += 1;
    } catch (error) {
      result.errors += 1;
      captureError(error, { path: "uploads-cleanup:intent" });
      await db.execute(sql`UPDATE "upload_intent" SET "purged_at" = NULL WHERE "id" = ${row.id}`);
    }
  }

  // 2. Klucze tymczasowe wszystkich zamiarów starszych niż godzina, niezależnie od stanu (sprząta
  //    ponowny PUT po potwierdzeniu). Usuwanie jest idempotentne.
  const stale = await db.execute<{ r2_key: string }>(sql`
    SELECT "r2_key" FROM "upload_intent" WHERE "created_at" < now() - interval '1 hour' AND "created_at" > now() - interval '7 days'
  `);
  for (const row of stale.rows) {
    try {
      await deletePrivateObject(row.r2_key);
      result.purgedStaleKeys += 1;
    } catch (error) {
      result.errors += 1;
      captureError(error, { path: "uploads-cleanup:stale-key" });
    }
  }

  // 3. Pliki zapytań skasowane ponad 30 dni temu (spec 0070 zadanie 17): usuwamy obiekt i ustawiamy purged_at.
  const deleted = await db.execute<{ id: string; r2_key: string }>(sql`
    SELECT "id", "r2_key" FROM "inquiry_attachment"
    WHERE "deleted_at" < now() - interval '30 days' AND "purged_at" IS NULL
  `);
  for (const row of deleted.rows) {
    try {
      await deletePrivateObject(row.r2_key);
      await db.execute(sql`UPDATE "inquiry_attachment" SET "purged_at" = now() WHERE "id" = ${row.id} AND "purged_at" IS NULL`);
      result.purgedDeletedAttachments += 1;
    } catch (error) {
      result.errors += 1;
      captureError(error, { path: "uploads-cleanup:attachment" });
    }
  }

  // 4. Wiersze zamiarów zużyte lub oczyszczone starsze niż 7 dni.
  const removed = await db.execute(sql`
    DELETE FROM "upload_intent"
    WHERE ("consumed_at" IS NOT NULL OR "purged_at" IS NOT NULL) AND "created_at" < now() - interval '7 days'
  `);
  result.deletedRows = removed.rowCount ?? 0;

  return result;
}
