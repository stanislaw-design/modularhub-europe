import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { crmEntry, crmEntryAttachment } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { detectImageMimeType } from "@/lib/storage/document-validation";
import {
  buildSignedDownloadUrl,
  buildSignedUploadUrl,
  deletePrivateObject,
  headPrivateObjectSize,
  readPrivateObjectHead,
} from "@/lib/storage/private-r2-client";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_PER_ENTRY } from "./constants";
import type { Actor, Result } from "./mutations";
import { attachmentDeclarationSchema, uuidSchema, type AttachmentDeclaration } from "./schemas";

// Załączniki wpisów dziennika (spec 0080 AC-14). Plik leci z przeglądarki prosto do prywatnego R2
// przez krótko ważny podpisany adres do zapisu (omija limit ciała żądania funkcji Vercela), a dopiero
// `confirmEntryAttachment` sprawdza rozmiar i sygnaturę i dodaje wiersz. Klucze w R2 są nieprzejrzyste
// (bez nazw firm i osób). Plik ma "server-only" i nigdy "use server".

const UPLOAD_TTL_SECONDS = 300;
const DOWNLOAD_TTL_SECONDS = 120;
const KEY_PREFIX = "crm-entry-attachments/";
const KEY_PATTERN = /^crm-entry-attachments\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** Nazwa pliku do wyświetlania i nagłówka: bez ścieżki, znaków sterujących i cudzysłowu. */
export function sanitizeAttachmentFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 200);
  return cleaned || "plik";
}

async function liveEntryExists(entryId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: crmEntry.id })
    .from(crmEntry)
    .where(and(eq(crmEntry.id, entryId), isNull(crmEntry.deletedAt)))
    .limit(1);
  return Boolean(row);
}

async function countAttachments(entryId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(crmEntryAttachment)
    .where(and(eq(crmEntryAttachment.entryId, entryId), isNull(crmEntryAttachment.deletedAt)));
  return row?.total ?? 0;
}

/** Krok 1: podpisany adres do zapisu. Nic nie trafia do bazy, dopóki plik nie zostanie potwierdzony. */
export async function requestEntryAttachmentUpload(
  _actor: Actor,
  entryId: string,
  declaration: AttachmentDeclaration,
): Promise<Result<{ key: string; uploadUrl: string }>> {
  if (!uuidSchema.safeParse(entryId).success) return fail("Nie znaleziono wpisu");
  const parsed = attachmentDeclarationSchema.safeParse(declaration);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowy plik");
  if (!(await liveEntryExists(entryId))) return fail("Nie znaleziono wpisu");
  if ((await countAttachments(entryId)) >= ATTACHMENT_MAX_PER_ENTRY) {
    return fail(`Wpis ma już ${ATTACHMENT_MAX_PER_ENTRY} plików, to maksimum.`);
  }
  const key = `${KEY_PREFIX}${crypto.randomUUID()}`;
  const uploadUrl = await buildSignedUploadUrl(key, UPLOAD_TTL_SECONDS, parsed.data.mimeType);
  return { ok: true, key, uploadUrl };
}

async function discardObject(key: string): Promise<void> {
  try {
    await deletePrivateObject(key);
  } catch (error) {
    // Sierota w kubełku jest znanym kosztem (Follow-up: sprzątanie), nie powodem do przewrócenia akcji.
    captureError(error, { path: "conversations:discardAttachmentObject" });
  }
}

/**
 * Krok 2: potwierdzenie. Sprawdza obecność obiektu, rozmiar (z HEAD, nie z deklaracji) i sygnaturę
 * pierwszych bajtów, a limit pięciu plików jest w samym INSERT. Przy każdej porażce obiekt jest usuwany.
 */
export async function confirmEntryAttachment(
  actor: Actor,
  entryId: string,
  key: string,
  declaration: AttachmentDeclaration,
): Promise<Result<{ id: string }>> {
  if (!uuidSchema.safeParse(entryId).success || !KEY_PATTERN.test(key)) return fail("Nieprawidłowy plik");
  const parsed = attachmentDeclarationSchema.safeParse(declaration);
  if (!parsed.success) {
    await discardObject(key);
    return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowy plik");
  }
  const { filename, mimeType, sizeBytes } = parsed.data;

  // Klucz może należeć już do innego załącznika: wtedy to nie nasz obiekt i nie wolno go usuwać.
  const [taken] = await db
    .select({ id: crmEntryAttachment.id })
    .from(crmEntryAttachment)
    .where(eq(crmEntryAttachment.r2Key, key))
    .limit(1);
  if (taken) return fail("Ten plik jest już dodany");

  if (!(await liveEntryExists(entryId))) {
    await discardObject(key);
    return fail("Nie znaleziono wpisu");
  }

  let actualSize: number | null;
  let head: Uint8Array;
  try {
    actualSize = await headPrivateObjectSize(key);
    if (actualSize === null) return fail("Plik nie został wgrany. Spróbuj ponownie.");
    if (actualSize <= 0 || actualSize > ATTACHMENT_MAX_BYTES || actualSize !== sizeBytes) {
      await discardObject(key);
      return fail("Rozmiar pliku nie zgadza się z deklaracją albo przekracza 20 MB.");
    }
    head = await readPrivateObjectHead(key, 16);
  } catch (error) {
    captureError(error, { path: "conversations:confirmEntryAttachment" });
    await discardObject(key);
    return fail("Nie udało się sprawdzić pliku. Spróbuj ponownie.");
  }

  const signatureOk =
    mimeType === "application/pdf"
      ? Buffer.from(head.subarray(0, 5)).toString("latin1") === "%PDF-"
      : detectImageMimeType(head) === mimeType;
  if (!signatureOk) {
    await discardObject(key);
    return fail("Zawartość pliku nie pasuje do jego typu. Dozwolone są PDF, JPEG, PNG i WebP.");
  }

  const id = crypto.randomUUID();
  const safeName = sanitizeAttachmentFilename(filename);
  try {
    // Limit pięciu plików i "wpis nie jest usunięty" sprawdzane w samym zapisie, nie przed nim.
    const result = await db.execute(sql`
      INSERT INTO "crm_entry_attachment" ("id", "entry_id", "r2_key", "filename", "mime_type", "size_bytes", "uploaded_by")
      SELECT ${id}::uuid, ${entryId}::uuid, ${key}, ${safeName}, ${mimeType}, ${actualSize}, ${actor.userId}
      WHERE EXISTS (SELECT 1 FROM "crm_entry" WHERE "id" = ${entryId}::uuid AND "deleted_at" IS NULL)
        AND (SELECT count(*) FROM "crm_entry_attachment" WHERE "entry_id" = ${entryId}::uuid AND "deleted_at" IS NULL) < ${ATTACHMENT_MAX_PER_ENTRY}
    `);
    if ((result.rowCount ?? 0) === 0) {
      await discardObject(key);
      return fail(`Wpis ma już ${ATTACHMENT_MAX_PER_ENTRY} plików, to maksimum.`);
    }
  } catch (error) {
    captureError(error, { path: "conversations:confirmEntryAttachment:insert" });
    await discardObject(key);
    return fail("Nie udało się zapisać pliku. Spróbuj ponownie.");
  }
  return { ok: true, id };
}

/** Miękkie usunięcie wiersza. Obiekt zostaje w kubełku do późniejszego sprzątania (Follow-up spec 0080). */
export async function deleteEntryAttachment(_actor: Actor, attachmentId: string): Promise<Result> {
  if (!uuidSchema.safeParse(attachmentId).success) return fail("Nie znaleziono pliku");
  const updated = await db
    .update(crmEntryAttachment)
    .set({ deletedAt: new Date() })
    .where(and(eq(crmEntryAttachment.id, attachmentId), isNull(crmEntryAttachment.deletedAt)))
    .returning({ id: crmEntryAttachment.id });
  return updated.length ? { ok: true } : fail("Nie znaleziono pliku");
}

export interface EntryAttachmentRow {
  id: string;
  entryId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/** Aktywne załączniki podanych wpisów, pogrupowane po wpisie. Nie podpisuje żadnych adresów. */
export async function listAttachmentsForEntries(entryIds: string[]): Promise<Map<string, EntryAttachmentRow[]>> {
  const result = new Map<string, EntryAttachmentRow[]>();
  if (!entryIds.length) return result;
  const rows = await db
    .select({
      id: crmEntryAttachment.id,
      entryId: crmEntryAttachment.entryId,
      filename: crmEntryAttachment.filename,
      mimeType: crmEntryAttachment.mimeType,
      sizeBytes: crmEntryAttachment.sizeBytes,
    })
    .from(crmEntryAttachment)
    .where(and(inArray(crmEntryAttachment.entryId, entryIds), isNull(crmEntryAttachment.deletedAt)))
    .orderBy(asc(crmEntryAttachment.createdAt));
  for (const row of rows) {
    const list = result.get(row.entryId) ?? [];
    list.push(row);
    result.set(row.entryId, list);
  }
  return result;
}

/**
 * Świeży, krótko ważny adres pobrania (nigdy zapisywany). `null`, gdy załącznik albo jego wpis
 * zostały usunięte; wołający odpowiada wtedy 404.
 */
export async function getAttachmentDownloadUrl(attachmentId: string): Promise<string | null> {
  if (!uuidSchema.safeParse(attachmentId).success) return null;
  const [row] = await db
    .select({ key: crmEntryAttachment.r2Key, filename: crmEntryAttachment.filename, mimeType: crmEntryAttachment.mimeType })
    .from(crmEntryAttachment)
    .innerJoin(crmEntry, eq(crmEntry.id, crmEntryAttachment.entryId))
    .where(and(eq(crmEntryAttachment.id, attachmentId), isNull(crmEntryAttachment.deletedAt), isNull(crmEntry.deletedAt)))
    .limit(1);
  if (!row) return null;
  return buildSignedDownloadUrl(row.key, DOWNLOAD_TTL_SECONDS, row.filename, row.mimeType);
}
