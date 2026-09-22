"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, gte, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { enqueueHouseImportSession } from "@/lib/ai/house-import-service-bus";
import { db } from "@/lib/db/client";
import { aiExtractionSession, aiSourceDocument, document, product } from "@/lib/db/schema";
import { buildAiProductDraftValues } from "@/lib/house-ai-import-contract";
import { captureError } from "@/lib/observability/errors";
import { requireProducerActor } from "@/lib/producer-actor";
import {
  createAiSourcePdfUploadUrl,
  deleteAiSourcePdf,
  downloadAiSourcePdf,
  inspectAiSourcePdf,
} from "@/lib/storage/ai-private-r2-client";
import {
  MAX_AI_SOURCE_PDF_FILES,
  MAX_AI_SOURCE_PDF_PAGES,
  validateAiSourcePdf,
  validateAiSourceUploadMetadata,
} from "@/lib/storage/ai-source-pdf-validation";

const activeStatuses = [
  "uploading",
  "queued",
  "scanning",
  "extracting",
  "normalizing",
  "applying",
  "cancel_requested",
] as const;

const sourceUploadInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    filename: z.string(),
    sizeBytes: z.number(),
    contentType: z.string(),
  })
  .strict();
const finalizeUploadInputSchema = z
  .object({ sessionId: z.string().uuid(), sourceDocumentId: z.string().uuid() })
  .strict();
const startExtractionInputSchema = z
  .object({ sessionId: z.string().uuid(), declarationConfirmed: z.literal(true) })
  .strict();

export interface HouseAiImportActionResult {
  ok: boolean;
  error?: string;
  productId?: string;
  sessionId?: string;
  sourceDocumentId?: string;
  uploadUrl?: string;
  uploadHeaders?: { "Content-Type": "application/pdf" };
  pageCount?: number;
}

const NOT_FOUND_ERROR = "Nie znaleziono tej sesji importu.";
const GENERIC_ERROR = "Nie udało się przygotować importu. Spróbuj ponownie.";

function modelIdentifier(): string {
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  const snapshot = process.env.AZURE_OPENAI_MODEL_SNAPSHOT?.trim();
  if (!deployment || !snapshot) throw new Error("HOUSE_AI_MODEL_CONFIG_MISSING");
  return `${deployment}@${snapshot}`;
}

async function discardRejectedUpload(documentId: string, key: string): Promise<void> {
  await db.update(document).set({ deletedAt: new Date() }).where(eq(document.id, documentId));
  try {
    await deleteAiSourcePdf(key);
  } catch {
    // Retencja usuwa osierocony obiekt. Nie ujawniamy szczegółów klucza w logach.
  }
}

export async function createAiProductDraft(): Promise<HouseAiImportActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };

  const [active] = await db
    .select({ id: aiExtractionSession.id, productId: aiExtractionSession.productId, status: aiExtractionSession.status })
    .from(aiExtractionSession)
    .where(and(
      eq(aiExtractionSession.producerId, actor.producerId),
      inArray(aiExtractionSession.status, [...activeStatuses]),
    ))
    .limit(1);
  if (active?.status === "uploading") {
    return { ok: true, sessionId: active.id, productId: active.productId };
  }
  if (active) {
    return { ok: false, error: "Masz już aktywną analizę. Poczekaj na jej zakończenie." };
  }

  // AC-24 (spec 0047) wymaga limitu 5 analiz na producenta w kroczącym oknie 24h,
  // docelowo zawsze włączonego. Na czas testów solo (tylko jeden producent korzysta
  // z kreatora) limit jest wyłączony przez zmienną środowiskową; przywrócić przed
  // pilotażem/rollout ("Utwardzenie i rollout" w docs/scope/produkcja.md).
  if (process.env.HOUSE_AI_IMPORT_DAILY_LIMIT_DISABLED !== "1") {
    const dailyLimit = Number(process.env.HOUSE_AI_IMPORT_DAILY_LIMIT ?? "5");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1_000);
    const [recent] = await db
      .select({ value: count() })
      .from(aiExtractionSession)
      .where(and(
        eq(aiExtractionSession.producerId, actor.producerId),
        gte(aiExtractionSession.createdAt, since),
      ));
    if ((recent?.value ?? 0) >= dailyLimit) {
      return { ok: false, error: `Osiągnięto limit ${dailyLimit} analiz w ciągu 24 godzin.` };
    }
  }

  const productId = randomUUID();
  const sessionId = randomUUID();
  try {
    const values = buildAiProductDraftValues({
      productId,
      sessionId,
      producerId: actor.producerId,
      userId: actor.userId,
      model: modelIdentifier(),
    });
    await db.batch([
      db.insert(product).values(values.product),
      db.insert(aiExtractionSession).values(values.session),
    ]);
    return { ok: true, productId, sessionId };
  } catch {
    captureError(new Error("HOUSE_AI_DRAFT_CREATE_FAILED"), { path: "createAiProductDraft", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function createAiSourceUpload(input: unknown): Promise<HouseAiImportActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsedInput = sourceUploadInputSchema.safeParse(input);
  if (!parsedInput.success) return { ok: false, error: "Nieprawidłowe dane pliku PDF." };
  // aiSourceUploadMetadataSchema jest .strict() i nie zna `sessionId`; przekazanie
  // pełnego parsedInput.data (z sessionId) odrzuca każdy plik, niezależnie od jego
  // faktycznego rozmiaru czy typu — stąd mylący komunikat o 25 MB.
  const metadata = validateAiSourceUploadMetadata({
    filename: parsedInput.data.filename,
    sizeBytes: parsedInput.data.sizeBytes,
    contentType: parsedInput.data.contentType,
  });
  if (!metadata.ok) return metadata;

  const [session] = await db
    .select({ id: aiExtractionSession.id, productId: aiExtractionSession.productId })
    .from(aiExtractionSession)
    .where(and(
      eq(aiExtractionSession.id, parsedInput.data.sessionId),
      eq(aiExtractionSession.producerId, actor.producerId),
      eq(aiExtractionSession.status, "uploading"),
    ));
  if (!session) return { ok: false, error: NOT_FOUND_ERROR };

  const [sourceCount] = await db
    .select({ value: count() })
    .from(document)
    .where(and(
      eq(document.productId, session.productId),
      eq(document.purpose, "ai_source_pdf"),
      isNull(document.deletedAt),
    ));
  if ((sourceCount?.value ?? 0) >= MAX_AI_SOURCE_PDF_FILES) {
    return { ok: false, error: "Jedna analiza może zawierać najwyżej pięć plików PDF." };
  }

  const documentId = randomUUID();
  const key = `quarantine/${actor.producerId}/${session.id}/${documentId}.pdf`;
  try {
    const signed = await createAiSourcePdfUploadUrl(key);
    await db.insert(document).values({
      id: documentId,
      r2Key: key,
      filename: metadata.value.safeFilename,
      mimeType: metadata.value.contentType,
      sizeBytes: metadata.value.sizeBytes,
      purpose: "ai_source_pdf",
      ownerUserId: actor.userId,
      productId: session.productId,
      producerId: actor.producerId,
    });
    return {
      ok: true,
      sessionId: session.id,
      productId: session.productId,
      sourceDocumentId: documentId,
      uploadUrl: signed.url,
      uploadHeaders: signed.headers,
    };
  } catch {
    captureError(new Error("HOUSE_AI_UPLOAD_RESERVATION_FAILED"), { path: "createAiSourceUpload", userId: actor.userId });
    return { ok: false, error: "Nie udało się przygotować prywatnego uploadu." };
  }
}

export async function discardAiSourceUpload(input: unknown): Promise<HouseAiImportActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsed = finalizeUploadInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: NOT_FOUND_ERROR };

  const [owned] = await db
    .select({ id: document.id, key: document.r2Key })
    .from(document)
    .innerJoin(aiExtractionSession, and(
      eq(aiExtractionSession.id, parsed.data.sessionId),
      eq(aiExtractionSession.productId, document.productId),
    ))
    .where(and(
      eq(document.id, parsed.data.sourceDocumentId),
      eq(document.purpose, "ai_source_pdf"),
      eq(document.producerId, actor.producerId),
      eq(aiExtractionSession.producerId, actor.producerId),
      eq(aiExtractionSession.status, "uploading"),
      isNull(document.deletedAt),
    ));
  if (!owned) return { ok: false, error: NOT_FOUND_ERROR };

  const [finalized] = await db
    .select({ id: aiSourceDocument.id })
    .from(aiSourceDocument)
    .where(and(
      eq(aiSourceDocument.sessionId, parsed.data.sessionId),
      eq(aiSourceDocument.documentId, owned.id),
    ));
  if (finalized) return { ok: false, error: "Zatwierdzonego dokumentu nie można porzucić." };

  await discardRejectedUpload(owned.id, owned.key);
  return { ok: true };
}

export async function finalizeAiSourceUpload(input: unknown): Promise<HouseAiImportActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsed = finalizeUploadInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: NOT_FOUND_ERROR };

  const [owned] = await db
    .select({
      documentId: document.id,
      key: document.r2Key,
      declaredSize: document.sizeBytes,
      productId: document.productId,
      safeFilename: document.filename,
      sessionStatus: aiExtractionSession.status,
    })
    .from(document)
    .innerJoin(aiExtractionSession, and(
      eq(aiExtractionSession.id, parsed.data.sessionId),
      eq(aiExtractionSession.productId, document.productId),
    ))
    .where(and(
      eq(document.id, parsed.data.sourceDocumentId),
      eq(document.purpose, "ai_source_pdf"),
      eq(document.producerId, actor.producerId),
      eq(aiExtractionSession.producerId, actor.producerId),
      isNull(document.deletedAt),
    ));
  if (!owned || owned.sessionStatus !== "uploading") return { ok: false, error: NOT_FOUND_ERROR };

  try {
    const object = await inspectAiSourcePdf(owned.key);
    if (object.sizeBytes !== owned.declaredSize || object.contentType !== "application/pdf") {
      await discardRejectedUpload(owned.documentId, owned.key);
      return { ok: false, error: "Wgrany obiekt nie odpowiada zadeklarowanemu plikowi PDF." };
    }
    const bytes = await downloadAiSourcePdf(owned.key);
    const validation = validateAiSourcePdf(bytes);
    if (!validation.ok || !validation.sha256 || !validation.pageCount || !validation.pdfKind) {
      await discardRejectedUpload(owned.documentId, owned.key);
      return { ok: false, error: validation.error ?? "Nieprawidłowy plik PDF." };
    }

    const [duplicate] = await db
      .select({ id: aiSourceDocument.id })
      .from(aiSourceDocument)
      .where(and(
        eq(aiSourceDocument.sessionId, parsed.data.sessionId),
        eq(aiSourceDocument.sha256, validation.sha256),
      ));
    if (duplicate) {
      await discardRejectedUpload(owned.documentId, owned.key);
      return { ok: true, sessionId: parsed.data.sessionId, sourceDocumentId: duplicate.id, pageCount: validation.pageCount };
    }

    const existing = await db
      .select({ pageCount: aiSourceDocument.pageCount, sortOrder: aiSourceDocument.sortOrder })
      .from(aiSourceDocument)
      .where(eq(aiSourceDocument.sessionId, parsed.data.sessionId));
    if (existing.length >= MAX_AI_SOURCE_PDF_FILES) {
      await discardRejectedUpload(owned.documentId, owned.key);
      return { ok: false, error: "Jedna analiza może zawierać najwyżej pięć plików PDF." };
    }
    const totalPages = existing.reduce((sum, item) => sum + item.pageCount, 0) + validation.pageCount;
    if (totalPages > MAX_AI_SOURCE_PDF_PAGES) {
      await discardRejectedUpload(owned.documentId, owned.key);
      return { ok: false, error: "Dokumenty w tej analizie przekraczają łącznie 200 stron." };
    }
    const sortOrder = existing.reduce((highest, item) => Math.max(highest, item.sortOrder), -1) + 1;
    const sourceDocumentId = randomUUID();
    await db.insert(aiSourceDocument).values({
      id: sourceDocumentId,
      sessionId: parsed.data.sessionId,
      documentId: owned.documentId,
      safeFilename: owned.safeFilename,
      sha256: validation.sha256,
      pageCount: validation.pageCount,
      pdfKind: validation.pdfKind,
      ocrStatus: "pending",
      sortOrder,
    });
    return { ok: true, sessionId: parsed.data.sessionId, sourceDocumentId, pageCount: validation.pageCount };
  } catch {
    captureError(new Error("HOUSE_AI_UPLOAD_FINALIZE_FAILED"), { path: "finalizeAiSourceUpload", userId: actor.userId });
    return { ok: false, error: "Nie udało się zweryfikować pliku PDF." };
  }
}

export async function startAiExtraction(input: unknown): Promise<HouseAiImportActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsed = startExtractionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Potwierdź deklarację dotyczącą danych osobowych i sekretów." };
  }

  const [session] = await db
    .select({ id: aiExtractionSession.id, status: aiExtractionSession.status })
    .from(aiExtractionSession)
    .where(and(
      eq(aiExtractionSession.id, parsed.data.sessionId),
      eq(aiExtractionSession.producerId, actor.producerId),
      inArray(aiExtractionSession.status, ["uploading", "queued"]),
    ));
  if (!session) return { ok: false, error: NOT_FOUND_ERROR };

  const sources = await db
    .select({ pageCount: aiSourceDocument.pageCount })
    .from(aiSourceDocument)
    .where(eq(aiSourceDocument.sessionId, session.id));
  const totalPages = sources.reduce((sum, item) => sum + item.pageCount, 0);
  if (sources.length < 1 || sources.length > MAX_AI_SOURCE_PDF_FILES || totalPages > MAX_AI_SOURCE_PDF_PAGES) {
    return { ok: false, error: "Dodaj od jednego do pięciu poprawnych PDF, łącznie do 200 stron." };
  }

  const changedFromUploading = session.status === "uploading";
  if (changedFromUploading) {
    const [updated] = await db
      .update(aiExtractionSession)
      .set({ status: "queued", currentStage: "queue", progress: 5, safeErrorCode: null })
      .where(and(
        eq(aiExtractionSession.id, session.id),
        eq(aiExtractionSession.producerId, actor.producerId),
        eq(aiExtractionSession.status, "uploading"),
      ))
      .returning({ id: aiExtractionSession.id });
    if (!updated) return { ok: false, error: NOT_FOUND_ERROR };
  }

  try {
    await enqueueHouseImportSession(session.id);
    return { ok: true, sessionId: session.id };
  } catch {
    if (changedFromUploading) {
      await db
        .update(aiExtractionSession)
        .set({ status: "uploading", currentStage: "upload", progress: 0 })
        .where(and(eq(aiExtractionSession.id, session.id), eq(aiExtractionSession.status, "queued")));
    }
    captureError(new Error("HOUSE_AI_QUEUE_SEND_FAILED"), { path: "startAiExtraction", userId: actor.userId });
    return { ok: false, error: "Nie udało się uruchomić analizy. Spróbuj ponownie." };
  }
}
