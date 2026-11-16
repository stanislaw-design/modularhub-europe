"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { canProducerSeeInquiryAttachments } from "@/lib/db/inquiry-attachment-access";
import { getPgErrorMessage } from "@/lib/db/pg-error";
import { getClientIdForUser, getProducerIdForUser } from "@/lib/db/queries";
import { bulkProductInquiry, inquiryAttachment, projectRequest } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import {
  ATTACHMENT_MAX_ACTIVE_BYTES,
  ATTACHMENT_MAX_ACTIVE_FILES,
  ATTACHMENT_MAX_FILE_BYTES,
  ATTACHMENT_URL_TTL_SECONDS,
  DEFAULT_GUEST_UPLOAD_DAILY_BYTES,
  extensionForMimeType,
  sanitizeAttachmentFilename,
  type AttachmentErrorCode,
  type InquiryKind,
} from "@/lib/inquiry-attachment-specs";
import { verifyUploadToken } from "@/lib/inquiry-attachment-token";
import { captureError, trackEvent } from "@/lib/observability";
import { validateInquiryAttachment } from "@/lib/storage/inquiry-attachment-validation";
import {
  createIntent,
  discardIntentObject,
  guestPendingBytes,
  loadIntent,
  pendingForTarget,
  rejectIntent,
  supersedeSameUpload,
  UPLOAD_URL_TTL_SECONDS,
} from "@/lib/storage/direct-upload";
import {
  buildSignedDownloadUrl,
  buildSignedUploadUrl,
  copyPrivateObject,
  headPrivateObject,
  PrivateObjectTooLargeError,
  readPrivateObjectBytes,
} from "@/lib/storage/private-r2-client";

// Spec 0070 część D (AC-28 do AC-34): pliki inwestora dołączone do zapytania
// (project_request i bulk_product_inquiry). Granicą bezpieczeństwa jest wyzwalacz
// w bazie (drizzle/0059: limity i stan zapytania pod blokadą doradczą); akcje
// sprawdzają te same warunki przed zapisem tylko po to, żeby błąd był czytelny.

export interface AttachmentActionResult {
  ok: boolean;
  error?: string;
  errorCode?: AttachmentErrorCode;
  attachmentId?: string;
}

const ERROR_TEXT: Record<AttachmentErrorCode, string> = {
  no_access: "Nie masz dostępu do tego zapytania.",
  consent_required: "Potwierdź, że w plikach nie ma Twoich danych kontaktowych.",
  invalid_type: "Dozwolone są tylko pliki PDF, JPEG, PNG lub WebP.",
  too_large: "Plik jest większy niż 20 MB.",
  file_rejected: "Ten plik nie został przyjęty.",
  limit_count: "Zapytanie ma już 10 plików. Usuń jeden, żeby dodać kolejny.",
  limit_size: "Łączny rozmiar plików przekroczyłby 60 MB.",
  limit_stored: "Zapytanie osiągnęło twardy limit liczby lub rozmiaru plików.",
  closed: "Pliki tego zapytania nie mogą być już zmieniane.",
  guest_daily_limit: "Wgrywanie plików jest chwilowo niedostępne. Spróbuj później albo napisz do nas.",
  not_uploaded: "Plik nie dotarł do magazynu. Spróbuj ponownie.",
  expired: "Wgrywanie wygasło. Dodaj plik jeszcze raz.",
  upload_failed: "Nie udało się wysłać pliku. Sprawdź połączenie i spróbuj ponownie.",
  storage_failed: "Nie udało się wgrać pliku do magazynu. Spróbuj ponownie.",
  not_found: "Nie znaleziono pliku.",
  reason_required: "Podaj powód ukrycia pliku.",
  generic: "Nie udało się zapisać pliku. Spróbuj ponownie.",
};

function fail(errorCode: AttachmentErrorCode, error?: string): AttachmentActionResult {
  return { ok: false, errorCode, error: error ?? ERROR_TEXT[errorCode] };
}

const kindSchema = z.enum(["request", "product"]);
const idSchema = z.uuid();

// ---------------------------------------------------------------------------
// Zapytanie nadrzędne i rola wywołującego
// ---------------------------------------------------------------------------

interface ParentState {
  clientId: string | null;
  status: string;
  selectedQuoteId: string | null;
  deadlineAt: Date;
  summaryPublishedAt: Date | null;
}

async function loadParent(kind: InquiryKind, inquiryId: string): Promise<ParentState | null> {
  if (kind === "request") {
    const [row] = await db
      .select({
        clientId: projectRequest.clientId,
        status: projectRequest.status,
        selectedQuoteId: projectRequest.selectedQuoteId,
        deadlineAt: projectRequest.deadlineAt,
        summaryPublishedAt: projectRequest.summaryPublishedAt,
      })
      .from(projectRequest)
      .where(eq(projectRequest.id, inquiryId));
    return row ?? null;
  }
  const [row] = await db
    .select({
      clientId: bulkProductInquiry.clientId,
      status: bulkProductInquiry.status,
      selectedQuoteId: bulkProductInquiry.selectedQuoteId,
      deadlineAt: bulkProductInquiry.deadlineAt,
      summaryPublishedAt: bulkProductInquiry.summaryPublishedAt,
    })
    .from(bulkProductInquiry)
    .where(eq(bulkProductInquiry.id, inquiryId));
  return row ?? null;
}

// AC-28, AC-33: klient i gość zmieniają pliki tylko, gdy zapytanie jest aktywne, bez
// wyboru oferty, przed terminem i przed publikacją podsumowania. Admin zawsze.
function isLockedForOwner(parent: ParentState, now: Date): boolean {
  if (parent.status !== "open" && parent.status !== "quoted" && parent.status !== "published") return true;
  if (parent.selectedQuoteId) return true;
  if (parent.deadlineAt.getTime() < now.getTime()) return true;
  return parent.summaryPublishedAt !== null;
}

type Actor = { kind: "staff"; userId: string } | { kind: "client"; userId: string } | { kind: "guest" };

async function resolveActor(
  kind: InquiryKind,
  inquiryId: string,
  parent: ParentState,
  uploadToken: string | undefined,
): Promise<Actor | null> {
  const session = await auth();
  if (session?.user.role === "admin") return { kind: "staff", userId: session.user.id };
  if (session?.user.role === "client" && parent.clientId) {
    const clientId = await getClientIdForUser(session.user.id);
    if (clientId && clientId === parent.clientId) return { kind: "client", userId: session.user.id };
  }
  if (verifyUploadToken(uploadToken, kind, inquiryId)) return { kind: "guest" };
  return null;
}

function mapTriggerError(error: unknown): AttachmentErrorCode | null {
  const message = getPgErrorMessage(error) ?? "";
  if (message.includes("inquiry_attachment_closed")) return "closed";
  if (message.includes("inquiry_attachment_limit_count")) return "limit_count";
  if (message.includes("inquiry_attachment_limit_size")) return "limit_size";
  if (message.includes("inquiry_attachment_limit_stored")) return "limit_stored";
  return null;
}

async function guestBytesLast24h(): Promise<number> {
  const result = await db.execute<{ total: string | null }>(sql`
    SELECT COALESCE(sum("size_bytes"), 0)::text AS total FROM "inquiry_attachment"
    WHERE "uploaded_by_kind" = 'guest' AND "created_at" > now() - interval '24 hours'
  `);
  return Number(result.rows[0]?.total ?? 0);
}

function guestDailyLimitBytes(): number {
  const configured = Number(process.env.GUEST_UPLOAD_DAILY_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_GUEST_UPLOAD_DAILY_BYTES;
}

// ---------------------------------------------------------------------------
// Wgrywanie (AC-28, AC-29, AC-34)
// ---------------------------------------------------------------------------

export interface UploadInquiryAttachmentAuth {
  uploadToken?: string;
  confirmedNoContactData?: boolean;
}

export interface InquiryAttachmentDeclaration {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface RequestInquiryAttachmentUploadResult extends AttachmentActionResult {
  intentId?: string;
  uploadUrl?: string;
  expiresAt?: string;
}

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

const declarationSchema = z.object({
  filename: z.string().min(1).max(500),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
});

async function activeAttachmentTotals(kind: InquiryKind, inquiryId: string): Promise<{ count: number; bytes: number }> {
  const link = kind === "request" ? inquiryAttachment.projectRequestId : inquiryAttachment.bulkProductInquiryId;
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      bytes: sql<number>`COALESCE(sum(${inquiryAttachment.sizeBytes}), 0)::float8`,
    })
    .from(inquiryAttachment)
    .where(and(eq(link, inquiryId), sql`${inquiryAttachment.deletedAt} IS NULL`));
  return { count: row?.count ?? 0, bytes: Number(row?.bytes ?? 0) };
}

// Krok 1 (spec 0085 AC-2, AC-3): wydaje podpisany adres do zapisu pod kluczem tymczasowym. Sprawdza
// to samo, co dawniej wgranie (uprawnienia, zgodę, stan zapytania, typ, rozmiar i limity), ale
// limity liczy razem z wgraniami rozpoczętymi w ostatnich 15 minutach. Wiersza pliku jeszcze nie ma.
export async function requestInquiryAttachmentUpload(
  kind: InquiryKind,
  inquiryId: string,
  declaration: InquiryAttachmentDeclaration,
  authInput: UploadInquiryAttachmentAuth = {},
): Promise<RequestInquiryAttachmentUploadResult> {
  const parsedKind = kindSchema.safeParse(kind);
  const parsedId = idSchema.safeParse(inquiryId);
  const parsedDeclaration = declarationSchema.safeParse(declaration);
  if (!parsedKind.success || !parsedId.success || !parsedDeclaration.success) return fail("no_access");

  try {
    const parent = await loadParent(parsedKind.data, parsedId.data);
    if (!parent) return fail("no_access");

    const actor = await resolveActor(parsedKind.data, parsedId.data, parent, authInput.uploadToken);
    if (!actor) return fail("no_access");

    if (actor.kind !== "staff" && authInput.confirmedNoContactData !== true) return fail("consent_required");
    if (actor.kind !== "staff" && isLockedForOwner(parent, new Date())) return fail("closed");

    const { mimeType, sizeBytes } = parsedDeclaration.data;
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) return fail("invalid_type");
    if (sizeBytes < 1) return fail("invalid_type", "Plik jest pusty.");
    if (sizeBytes > ATTACHMENT_MAX_FILE_BYTES) return fail("too_large");

    const filename = sanitizeAttachmentFilename(parsedDeclaration.data.filename);
    const target = parsedKind.data === "request" ? { projectRequestId: parsedId.data } : { bulkProductInquiryId: parsedId.data };
    const intentInput = {
      purpose: "inquiry_attachment" as const,
      target,
      actorKind: actor.kind,
      actorUserId: actor.kind === "guest" ? null : actor.userId,
      mimeType,
      declaredSizeBytes: sizeBytes,
      filename,
      consentConfirmed: actor.kind !== "staff",
    };

    // Ponowna prośba o ten sam plik nie zajmuje drugiego miejsca w limicie (AC-3).
    await supersedeSameUpload(intentInput);

    const [active, pending] = await Promise.all([
      activeAttachmentTotals(parsedKind.data, parsedId.data),
      pendingForTarget(target),
    ]);
    if (active.count + pending.count + 1 > ATTACHMENT_MAX_ACTIVE_FILES) return fail("limit_count");
    if (active.bytes + pending.bytes + sizeBytes > ATTACHMENT_MAX_ACTIVE_BYTES) return fail("limit_size");

    if (actor.kind === "guest") {
      const used = (await guestBytesLast24h()) + (await guestPendingBytes());
      if (used + sizeBytes > guestDailyLimitBytes()) {
        captureError(new Error("Dzienny limit wgrywania plików przez gości został przekroczony."), {
          path: "requestInquiryAttachmentUpload:guestDailyLimit",
        });
        return fail("guest_daily_limit");
      }
    }

    const intent = await createIntent(intentInput);
    let uploadUrl: string;
    try {
      uploadUrl = await buildSignedUploadUrl(intent.r2Key, UPLOAD_URL_TTL_SECONDS, mimeType, sizeBytes);
    } catch (error) {
      captureError(error, { path: "requestInquiryAttachmentUpload:sign" });
      await rejectIntent({ id: intent.id, r2Key: intent.r2Key });
      return fail("storage_failed");
    }
    return {
      ok: true,
      intentId: intent.id,
      uploadUrl,
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    };
  } catch (error) {
    captureError(error, { path: "requestInquiryAttachmentUpload" });
    return fail("generic");
  }
}

// Krok 2 (spec 0085 AC-4 do AC-7, AC-14): potwierdza wgranie. Stała kolejność: uprawnienia i
// powiązanie zamiaru, HEAD, zawartość i ETag, kopia na klucz ostateczny (If-Match na ETag
// zwalidowanej wersji), a na końcu jedno polecenie SQL zużywa zamiar i wstawia wiersz pliku.
export async function confirmInquiryAttachment(
  intentId: string,
  authInput: { uploadToken?: string } = {},
): Promise<AttachmentActionResult> {
  if (!idSchema.safeParse(intentId).success) return fail("no_access");

  try {
    const intent = await loadIntent(intentId);
    if (!intent || intent.purpose !== "inquiry_attachment" || intent.consumedAt || intent.purgedAt) return fail("no_access");
    const kind: InquiryKind = intent.projectRequestId ? "request" : "product";
    const inquiryId = (intent.projectRequestId ?? intent.bulkProductInquiryId)!;

    const parent = await loadParent(kind, inquiryId);
    if (!parent) return fail("no_access");
    const actor = await resolveActor(kind, inquiryId, parent, authInput.uploadToken);
    if (!actor || actor.kind !== intent.actorKind) return fail("no_access");
    if (actor.kind !== "guest" && actor.userId !== intent.actorUserId) return fail("no_access");
    if (actor.kind !== "staff" && !intent.consentConfirmed) return fail("consent_required");
    if (intent.expired) return fail("expired");

    if (actor.kind !== "staff" && isLockedForOwner(parent, new Date())) {
      await rejectIntent(intent);
      return fail("closed");
    }

    // HEAD: brak obiektu to nie błąd, tylko "jeszcze nie wgrano", zamiar zostaje do ponowienia.
    const head = await headPrivateObject(intent.r2Key);
    if (!head) return fail("not_uploaded");
    if (head.size !== intent.declaredSizeBytes || head.size > ATTACHMENT_MAX_FILE_BYTES) {
      await rejectIntent(intent);
      return fail("file_rejected");
    }

    // Twardy limit przy pobraniu: nie ufamy samemu HEAD (AC-4). Cały plik trafia do walidacji (AC-5).
    let bytes: Buffer;
    let etag: string | null;
    try {
      ({ bytes, etag } = await readPrivateObjectBytes(intent.r2Key, intent.declaredSizeBytes));
    } catch (error) {
      if (error instanceof PrivateObjectTooLargeError) {
        await rejectIntent(intent);
        return fail("file_rejected");
      }
      throw error;
    }
    if (bytes.byteLength !== intent.declaredSizeBytes) {
      await rejectIntent(intent);
      return fail("file_rejected");
    }
    const validation = validateInquiryAttachment(bytes);
    if (!validation.ok || validation.mimeType !== intent.mimeType) {
      await rejectIntent(intent);
      return fail("file_rejected");
    }

    const finalKey = `inquiry-attachments/${randomUUID()}${extensionForMimeType(validation.mimeType)}`;
    try {
      await copyPrivateObject(intent.r2Key, finalKey, etag, validation.mimeType);
    } catch (error) {
      captureError(error, { path: "confirmInquiryAttachment:copy" });
      return fail("storage_failed");
    }

    const attachmentId = randomUUID();
    const parentTable = kind === "request" ? "project_request" : "bulk_product_inquiry";
    const statement = db.execute<{ id: string }>(sql`
      WITH c AS (
        UPDATE "upload_intent" SET "consumed_at" = now()
        WHERE "id" = ${intent.id} AND "consumed_at" IS NULL AND "expires_at" > now()
        RETURNING "id"
      ),
      ins AS (
        INSERT INTO "inquiry_attachment" (
          "id", "project_request_id", "bulk_product_inquiry_id", "r2_key", "filename", "mime_type",
          "size_bytes", "uploaded_by_kind", "uploaded_by_user_id"
        )
        SELECT ${attachmentId}::uuid, ${intent.projectRequestId}::uuid, ${intent.bulkProductInquiryId}::uuid, ${finalKey},
          ${intent.filename}, ${validation.mimeType}, ${bytes.byteLength}, ${actor.kind}, ${actor.kind === "guest" ? null : actor.userId}
        FROM c
        RETURNING "id"
      ),
      touch AS (
        UPDATE ${sql.identifier(parentTable)} SET "attachments_changed_at" = now()
        WHERE "id" = ${inquiryId} AND EXISTS (SELECT 1 FROM ins)
        RETURNING "id"
      )
      SELECT "id" FROM ins
    `);

    let inserted: boolean;
    try {
      const result = actor.kind === "staff" ? (await withAdminActor(actor.userId, [statement]))[0] : await statement;
      inserted = (result.rows?.length ?? 0) > 0;
    } catch (error) {
      // Wyzwalacz cofnął też zużycie zamiaru (AC-7): usuwamy kopię, zamiar zostaje do ponowienia.
      await discardIntentObject({ r2Key: finalKey });
      const code = mapTriggerError(error);
      if (code) return fail(code);
      captureError(error, { path: "confirmInquiryAttachment:insert" });
      return fail("generic");
    }
    if (!inserted) {
      // Przegrany wyścig albo zamiar wygasł między sprawdzeniem a zapisem: kopia jest niepotrzebna.
      await discardIntentObject({ r2Key: finalKey });
      return fail("expired");
    }

    await discardIntentObject(intent);
    trackEvent(
      "inquiry_attachment_uploaded",
      { kind, sizeBytes: bytes.byteLength, mimeType: validation.mimeType, uploadedBy: actor.kind },
      actor.kind === "guest" ? inquiryId : actor.userId,
    );
    return { ok: true, attachmentId };
  } catch (error) {
    captureError(error, { path: "confirmInquiryAttachment" });
    return fail("generic");
  }
}

// ---------------------------------------------------------------------------
// Zmiana stanu pliku (usunięcie, ukrycie, przywrócenie)
// ---------------------------------------------------------------------------

// Jedno polecenie SQL zmienia wiersz pliku i attachments_changed_at zapytania
// nadrzędnego (data modifying CTE), więc zmiana i znacznik nie rozjadą się nawet
// przy błędzie w połowie. Zwraca true, gdy wiersz spełnił warunek i został zmieniony.
async function mutateAttachment(args: {
  attachmentId: string;
  set: SQL;
  where: SQL;
  adminUserId?: string;
}): Promise<boolean> {
  const statement = db.execute<{ id: string }>(sql`
    WITH upd AS (
      UPDATE "inquiry_attachment" a SET ${args.set}
      WHERE a."id" = ${args.attachmentId} AND ${args.where}
      RETURNING a."id", a."project_request_id", a."bulk_product_inquiry_id"
    ),
    touch_request AS (
      UPDATE "project_request" SET "attachments_changed_at" = now()
      WHERE "id" IN (SELECT "project_request_id" FROM upd) RETURNING "id"
    ),
    touch_inquiry AS (
      UPDATE "bulk_product_inquiry" SET "attachments_changed_at" = now()
      WHERE "id" IN (SELECT "bulk_product_inquiry_id" FROM upd) RETURNING "id"
    )
    SELECT "id" FROM upd
  `);
  const result = args.adminUserId ? (await withAdminActor(args.adminUserId, [statement]))[0] : (await db.batch([statement]))[0];
  return (result.rows?.length ?? 0) > 0;
}

// Stan zapytania, od którego zależy zmiana pliku przez klienta lub gościa (AC-33),
// sprawdzany w samym UPDATE, nie tylko w odczycie przed nim.
const OWNER_CAN_CHANGE_SQL = sql`(
  EXISTS (
    SELECT 1 FROM "project_request" r
    WHERE r."id" = a."project_request_id" AND r."status" IN ('open', 'quoted', 'published')
      AND r."selected_quote_id" IS NULL AND r."deadline_at" >= now() AND r."summary_published_at" IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM "bulk_product_inquiry" b
    WHERE b."id" = a."bulk_product_inquiry_id" AND b."status" IN ('open', 'quoted', 'published')
      AND b."selected_quote_id" IS NULL AND b."deadline_at" >= now() AND b."summary_published_at" IS NULL
  )
)`;

interface AttachmentRef {
  kind: InquiryKind;
  inquiryId: string;
  uploadedByKind: string;
  deletedAt: Date | null;
  hiddenAt: Date | null;
  purgedAt: Date | null;
}

async function loadAttachmentRef(attachmentId: string): Promise<AttachmentRef | null> {
  const [row] = await db
    .select({
      projectRequestId: inquiryAttachment.projectRequestId,
      bulkProductInquiryId: inquiryAttachment.bulkProductInquiryId,
      uploadedByKind: inquiryAttachment.uploadedByKind,
      deletedAt: inquiryAttachment.deletedAt,
      hiddenAt: inquiryAttachment.hiddenAt,
      purgedAt: inquiryAttachment.purgedAt,
    })
    .from(inquiryAttachment)
    .where(eq(inquiryAttachment.id, attachmentId));
  if (!row) return null;
  const kind: InquiryKind = row.projectRequestId ? "request" : "product";
  const inquiryId = (row.projectRequestId ?? row.bulkProductInquiryId)!;
  return { kind, inquiryId, uploadedByKind: row.uploadedByKind, deletedAt: row.deletedAt, hiddenAt: row.hiddenAt, purgedAt: row.purgedAt };
}

// AC-33: usuwa klient-właściciel, gość z ważnym tokenem (tylko pliki `guest` tego
// samego zapytania, żeby mógł cofnąć pomyłkę) albo admin (zawsze). Usunięcie jest
// miękkie (deleted_at), obiekt w R2 znika po 30 dniach w zadaniu czyszczącym.
export async function deleteInquiryAttachment(
  attachmentId: string,
  authInput: { uploadToken?: string } = {},
): Promise<AttachmentActionResult> {
  if (!idSchema.safeParse(attachmentId).success) return fail("not_found");

  try {
    const ref = await loadAttachmentRef(attachmentId);
    if (!ref || ref.deletedAt) return fail("not_found");
    const parent = await loadParent(ref.kind, ref.inquiryId);
    if (!parent) return fail("not_found");

    const actor = await resolveActor(ref.kind, ref.inquiryId, parent, authInput.uploadToken);
    if (!actor) return fail("not_found");
    if (actor.kind === "guest" && ref.uploadedByKind !== "guest") return fail("not_found");
    if (actor.kind !== "staff" && isLockedForOwner(parent, new Date())) return fail("closed");

    const changed =
      actor.kind === "staff"
        ? await mutateAttachment({
            attachmentId,
            set: sql`"deleted_at" = now(), "deleted_by_kind" = 'staff'`,
            where: sql`a."deleted_at" IS NULL`,
            adminUserId: actor.userId,
          })
        : await mutateAttachment({
            attachmentId,
            set: sql`"deleted_at" = now(), "deleted_by_kind" = 'client'`,
            where: sql`a."deleted_at" IS NULL AND ${OWNER_CAN_CHANGE_SQL}${
              actor.kind === "guest" ? sql` AND a."uploaded_by_kind" = 'guest'` : sql``
            }`,
          });
    if (!changed) return fail("closed");
    return { ok: true, attachmentId };
  } catch (error) {
    captureError(error, { path: "deleteInquiryAttachment" });
    return fail("generic");
  }
}

// AC-32: ukrycie przez admina z obowiązkowym powodem, audyt przez withAdminActor.
// Producent traci dostęp przy następnym odczycie (link wydany wcześniej wygasa w
// najwyżej 10 minut).
export async function hideInquiryAttachment(attachmentId: string, reason: string): Promise<AttachmentActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return fail("no_access", "Musisz być zalogowany jako administrator.");
  if (!idSchema.safeParse(attachmentId).success) return fail("not_found");
  const trimmed = reason.trim();
  if (!trimmed) return fail("reason_required");

  try {
    const changed = await mutateAttachment({
      attachmentId,
      set: sql`"hidden_at" = now(), "hidden_reason" = ${trimmed}, "hidden_by_user_id" = ${session.user.id}`,
      where: sql`a."hidden_at" IS NULL AND a."deleted_at" IS NULL AND a."purged_at" IS NULL`,
      adminUserId: session.user.id,
    });
    return changed ? { ok: true, attachmentId } : fail("not_found");
  } catch (error) {
    captureError(error, { path: "hideInquiryAttachment" });
    return fail("generic");
  }
}

export async function unhideInquiryAttachment(attachmentId: string): Promise<AttachmentActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return fail("no_access", "Musisz być zalogowany jako administrator.");
  if (!idSchema.safeParse(attachmentId).success) return fail("not_found");

  try {
    const changed = await mutateAttachment({
      attachmentId,
      set: sql`"hidden_at" = NULL, "hidden_reason" = NULL, "hidden_by_user_id" = NULL`,
      where: sql`a."hidden_at" IS NOT NULL AND a."deleted_at" IS NULL AND a."purged_at" IS NULL`,
      adminUserId: session.user.id,
    });
    return changed ? { ok: true, attachmentId } : fail("not_found");
  } catch (error) {
    captureError(error, { path: "unhideInquiryAttachment" });
    return fail("generic");
  }
}

// ---------------------------------------------------------------------------
// Odczyt i pobranie (AC-30, AC-31)
// ---------------------------------------------------------------------------

export interface InquiryAttachmentItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  // Tylko dla admina i właściciela zapytania (producent nie dostaje plików ukrytych ani usuniętych).
  hidden: boolean;
  hiddenReason: string | null;
  deleted: boolean;
  // Tylko dla admina: kto wgrał.
  uploadedByKind: "client" | "guest" | "staff" | null;
}

type Viewer = { role: "admin" } | { role: "client" } | { role: "producer" };

// Kto patrzy i czy ma prawo do plików tego zapytania. null = brak uprawnień (dla
// producenta nie do odróżnienia od nieistniejącego zapytania, AC-31).
async function resolveViewer(kind: InquiryKind, inquiryId: string, parent: ParentState): Promise<Viewer | null> {
  const session = await auth();
  if (!session) return null;
  if (session.user.role === "admin") return { role: "admin" };
  if (session.user.role === "client") {
    const clientId = await getClientIdForUser(session.user.id);
    return clientId && parent.clientId && clientId === parent.clientId ? { role: "client" } : null;
  }
  if (session.user.role === "producer") {
    const producerId = await getProducerIdForUser(session.user.id);
    if (!producerId) return null;
    return (await canProducerSeeInquiryAttachments(producerId, kind, inquiryId)) ? { role: "producer" } : null;
  }
  return null;
}

function isVisibleTo(
  viewer: Viewer,
  row: { hiddenAt: Date | null; deletedAt: Date | null; purgedAt: Date | null },
): boolean {
  if (viewer.role === "admin") return row.purgedAt === null;
  if (row.deletedAt) return false;
  if (viewer.role === "producer") return row.hiddenAt === null;
  return true;
}

export async function listInquiryAttachments(kind: InquiryKind, inquiryId: string): Promise<InquiryAttachmentItem[]> {
  const parsedKind = kindSchema.safeParse(kind);
  const parsedId = idSchema.safeParse(inquiryId);
  if (!parsedKind.success || !parsedId.success) return [];

  try {
    const parent = await loadParent(parsedKind.data, parsedId.data);
    if (!parent) return [];
    const viewer = await resolveViewer(parsedKind.data, parsedId.data, parent);
    if (!viewer) return [];

    const link = parsedKind.data === "request" ? inquiryAttachment.projectRequestId : inquiryAttachment.bulkProductInquiryId;
    const rows = await db
      .select({
        id: inquiryAttachment.id,
        filename: inquiryAttachment.filename,
        mimeType: inquiryAttachment.mimeType,
        sizeBytes: inquiryAttachment.sizeBytes,
        createdAt: inquiryAttachment.createdAt,
        uploadedByKind: inquiryAttachment.uploadedByKind,
        hiddenAt: inquiryAttachment.hiddenAt,
        hiddenReason: inquiryAttachment.hiddenReason,
        deletedAt: inquiryAttachment.deletedAt,
        purgedAt: inquiryAttachment.purgedAt,
      })
      .from(inquiryAttachment)
      .where(and(eq(link, parsedId.data)))
      .orderBy(asc(inquiryAttachment.createdAt));

    return rows
      .filter((row) => isVisibleTo(viewer, row))
      .map((row) => ({
        id: row.id,
        filename: row.filename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt.toISOString(),
        hidden: viewer.role !== "producer" && row.hiddenAt !== null,
        hiddenReason: viewer.role !== "producer" ? row.hiddenReason : null,
        deleted: viewer.role === "admin" && row.deletedAt !== null,
        uploadedByKind: viewer.role === "admin" ? (row.uploadedByKind as "client" | "guest" | "staff") : null,
      }));
  } catch (error) {
    captureError(error, { path: "listInquiryAttachments" });
    return [];
  }
}

export interface GetInquiryAttachmentUrlResult {
  ok: boolean;
  url?: string;
  error?: string;
  errorCode?: AttachmentErrorCode;
}

// Jedyna droga odczytu pliku. Uprawnienie liczone za każdym wywołaniem; link ważny
// 10 minut, pobranie zawsze jako załącznik, generowany na nowo i nigdy nie zapisywany
// ani logowany. Brak uprawnień, ukryty plik, usunięty plik i brak pliku dają tę samą
// odpowiedź "nie znaleziono".
export async function getInquiryAttachmentUrl(attachmentId: string): Promise<GetInquiryAttachmentUrlResult> {
  if (!idSchema.safeParse(attachmentId).success) return fail("not_found");

  try {
    const [row] = await db
      .select({
        projectRequestId: inquiryAttachment.projectRequestId,
        bulkProductInquiryId: inquiryAttachment.bulkProductInquiryId,
        r2Key: inquiryAttachment.r2Key,
        filename: inquiryAttachment.filename,
        hiddenAt: inquiryAttachment.hiddenAt,
        deletedAt: inquiryAttachment.deletedAt,
        purgedAt: inquiryAttachment.purgedAt,
      })
      .from(inquiryAttachment)
      .where(eq(inquiryAttachment.id, attachmentId));
    if (!row) return fail("not_found");

    const kind: InquiryKind = row.projectRequestId ? "request" : "product";
    const inquiryId = (row.projectRequestId ?? row.bulkProductInquiryId)!;
    const parent = await loadParent(kind, inquiryId);
    if (!parent) return fail("not_found");
    const viewer = await resolveViewer(kind, inquiryId, parent);
    if (!viewer || !isVisibleTo(viewer, row)) return fail("not_found");

    const url = await buildSignedDownloadUrl(row.r2Key, ATTACHMENT_URL_TTL_SECONDS, row.filename);
    return { ok: true, url };
  } catch (error) {
    captureError(error, { path: "getInquiryAttachmentUrl" });
    return fail("generic", "Nie udało się przygotować linku do pliku. Spróbuj ponownie.");
  }
}
