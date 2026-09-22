import { and, asc, eq, sql } from "drizzle-orm";
import { aiExtractionSession, aiSourceDocument, document, product } from "@/lib/db/schema";

export const HOUSE_IMPORT_MAX_ATTEMPTS = 3;
export const HOUSE_IMPORT_LEASE_TIMEOUT_SECONDS = 180;

export type HouseImportWorkerSafeErrorCode =
  | "AI_IMPORT_RETRIES_EXHAUSTED"
  | "AI_IMPORT_SOURCE_READ_FAILED"
  | "AI_IMPORT_LEASE_LOST"
  | "AZURE_DOCUMENT_ANALYSIS_FAILED"
  | "AZURE_DOCUMENT_ANALYSIS_TIMEOUT"
  | "AZURE_DOCUMENT_RESULT_INVALID"
  | "AZURE_OPENAI_REQUEST_FAILED"
  | "AZURE_OPENAI_RESPONSE_INVALID"
  | "HOUSE_PROJECT_EXTRACTION_PERSISTENCE_REJECTED"
  | "HOUSE_IMPORT_WORKER_FAILED";

export interface HouseImportLeaseDocument {
  sourceDocumentId: string;
  r2Key: string;
  sortOrder: number;
}

export interface HouseImportLease {
  sessionId: string;
  attemptToken: number;
  documents: readonly HouseImportLeaseDocument[];
}

export type HouseImportLeaseClaim =
  | { kind: "claimed"; lease: HouseImportLease }
  | { kind: "skip"; reason: "terminal" | "cancelled" | "lease_busy" | "not_found" | "retries_exhausted" };

export type HouseImportLeaseControl = "active" | "cancel_requested" | "lost";

type ClaimedRow = { session_id: string; attempt_token: number };

function rowsFromExecute<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (typeof result === "object" && result !== null && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? rows as T[] : [];
  }
  return [];
}

export async function claimHouseImportLease(sessionId: string): Promise<HouseImportLeaseClaim> {
  const { db } = await import("@/lib/db/client");
  const claimed = await db.execute(sql`
    WITH claimable AS (
      SELECT session.id
      FROM ai_extraction_session session
      INNER JOIN product draft ON draft.id = session.product_id
      WHERE session.id = ${sessionId}::uuid
        AND draft.deleted_at IS NULL
        AND session.attempt_count < ${HOUSE_IMPORT_MAX_ATTEMPTS}
        AND (
          session.status = 'queued'
          OR (
            session.status IN ('extracting', 'normalizing')
            AND (
              session.last_heartbeat_at IS NULL
              OR session.last_heartbeat_at < now() - (${HOUSE_IMPORT_LEASE_TIMEOUT_SECONDS} * interval '1 second')
            )
          )
        )
      FOR UPDATE OF session SKIP LOCKED
    )
    UPDATE ai_extraction_session session
    SET status = 'extracting',
        current_stage = 'document_intelligence',
        progress = 15,
        attempt_count = session.attempt_count + 1,
        last_heartbeat_at = now(),
        started_at = COALESCE(session.started_at, now()),
        safe_error_code = NULL
    FROM claimable
    WHERE session.id = claimable.id
    RETURNING session.id AS session_id, session.attempt_count AS attempt_token
  `);
  const [row] = rowsFromExecute<ClaimedRow>(claimed);
  if (row) {
    const documents = await db
      .select({
        sourceDocumentId: aiSourceDocument.id,
        r2Key: document.r2Key,
        sortOrder: aiSourceDocument.sortOrder,
      })
      .from(aiSourceDocument)
      .innerJoin(document, eq(document.id, aiSourceDocument.documentId))
      .where(eq(aiSourceDocument.sessionId, sessionId))
      .orderBy(asc(aiSourceDocument.sortOrder));
    return {
      kind: "claimed",
      lease: {
        sessionId: row.session_id,
        attemptToken: Number(row.attempt_token),
        documents,
      },
    };
  }

  const [session] = await db
    .select({
      status: aiExtractionSession.status,
      attemptCount: aiExtractionSession.attemptCount,
      lastHeartbeatAt: aiExtractionSession.lastHeartbeatAt,
      productDeletedAt: product.deletedAt,
    })
    .from(aiExtractionSession)
    .innerJoin(product, eq(product.id, aiExtractionSession.productId))
    .where(eq(aiExtractionSession.id, sessionId));
  if (!session) return { kind: "skip", reason: "not_found" };
  if (session.status === "cancel_requested" || session.productDeletedAt) {
    await db
      .update(aiExtractionSession)
      .set({ status: "cancelled", completedAt: new Date(), lastHeartbeatAt: null })
      .where(and(
        eq(aiExtractionSession.id, sessionId),
        eq(aiExtractionSession.attemptCount, session.attemptCount),
        sql`${aiExtractionSession.status} IN (
          'uploading', 'queued', 'scanning', 'extracting', 'normalizing', 'cancel_requested'
        )`,
      ));
    return { kind: "skip", reason: "cancelled" };
  }
  if (["review_ready", "applied", "cancelled", "failed"].includes(session.status)) {
    return { kind: "skip", reason: "terminal" };
  }
  const heartbeatExpired = !session.lastHeartbeatAt
    || session.lastHeartbeatAt.getTime() < Date.now() - HOUSE_IMPORT_LEASE_TIMEOUT_SECONDS * 1_000;
  if (session.attemptCount >= HOUSE_IMPORT_MAX_ATTEMPTS
    && (session.status === "queued" || heartbeatExpired)) {
    await db
      .update(aiExtractionSession)
      .set({
        status: "failed",
        safeErrorCode: "AI_IMPORT_RETRIES_EXHAUSTED",
        completedAt: new Date(),
        lastHeartbeatAt: null,
      })
      .where(and(
        eq(aiExtractionSession.id, sessionId),
        eq(aiExtractionSession.attemptCount, session.attemptCount),
      ));
    return { kind: "skip", reason: "retries_exhausted" };
  }
  return { kind: "skip", reason: "lease_busy" };
}

export async function heartbeatHouseImportLease(lease: HouseImportLease): Promise<HouseImportLeaseControl> {
  const { db } = await import("@/lib/db/client");
  const [heartbeat] = await db
    .update(aiExtractionSession)
    .set({ lastHeartbeatAt: new Date() })
    .where(and(
      eq(aiExtractionSession.id, lease.sessionId),
      eq(aiExtractionSession.attemptCount, lease.attemptToken),
      sql`${aiExtractionSession.status} IN ('extracting', 'normalizing')`,
    ))
    .returning({ id: aiExtractionSession.id });
  if (heartbeat) return "active";

  const [session] = await db
    .select({ status: aiExtractionSession.status, attemptCount: aiExtractionSession.attemptCount })
    .from(aiExtractionSession)
    .where(eq(aiExtractionSession.id, lease.sessionId));
  if (session?.status === "cancel_requested" && session.attemptCount === lease.attemptToken) {
    return "cancel_requested";
  }
  return "lost";
}

export async function advanceHouseImportLease(
  lease: HouseImportLease,
  update: {
    status: "extracting" | "normalizing";
    currentStage: "document_intelligence" | "model_extraction" | "normalization";
    progress: number;
  },
): Promise<HouseImportLeaseControl> {
  const { db } = await import("@/lib/db/client");
  const [advanced] = await db
    .update(aiExtractionSession)
    .set({ ...update, lastHeartbeatAt: new Date() })
    .where(and(
      eq(aiExtractionSession.id, lease.sessionId),
      eq(aiExtractionSession.attemptCount, lease.attemptToken),
      sql`${aiExtractionSession.status} IN ('extracting', 'normalizing')`,
    ))
    .returning({ id: aiExtractionSession.id });
  if (advanced) return "active";
  return heartbeatHouseImportLease(lease);
}

export async function updateHouseImportSourceDocument(
  lease: HouseImportLease,
  sourceDocumentId: string,
  update: { ocrStatus: "processing" | "ready" | "failed"; detectedLanguage?: string | null },
): Promise<HouseImportLeaseControl> {
  const { db } = await import("@/lib/db/client");
  const result = await db.execute(sql`
    UPDATE ai_source_document source
    SET ocr_status = ${update.ocrStatus}::ai_ocr_status,
        detected_language = COALESCE(${update.detectedLanguage ?? null}::text, source.detected_language)
    WHERE source.id = ${sourceDocumentId}::uuid
      AND source.session_id = ${lease.sessionId}::uuid
      AND EXISTS (
        SELECT 1
        FROM ai_extraction_session session
        WHERE session.id = source.session_id
          AND session.attempt_count = ${lease.attemptToken}
          AND session.status IN ('extracting', 'normalizing')
      )
    RETURNING source.id
  `);
  if (rowsFromExecute<{ id: string }>(result).length > 0) return "active";
  return heartbeatHouseImportLease(lease);
}

export async function cancelHouseImportLease(lease: HouseImportLease): Promise<void> {
  const { db } = await import("@/lib/db/client");
  await db
    .update(aiExtractionSession)
    .set({ status: "cancelled", completedAt: new Date(), lastHeartbeatAt: null })
    .where(and(
      eq(aiExtractionSession.id, lease.sessionId),
      eq(aiExtractionSession.attemptCount, lease.attemptToken),
      eq(aiExtractionSession.status, "cancel_requested"),
    ));
}

export async function failHouseImportLease(
  lease: HouseImportLease,
  safeErrorCode: HouseImportWorkerSafeErrorCode,
  retryable: boolean,
): Promise<"retry" | "failed" | "lost"> {
  const { db } = await import("@/lib/db/client");
  const shouldRetry = retryable && lease.attemptToken < HOUSE_IMPORT_MAX_ATTEMPTS;
  const [updated] = await db
    .update(aiExtractionSession)
    .set(shouldRetry
      ? {
          status: "queued",
          currentStage: "queue",
          progress: 5,
          safeErrorCode,
          lastHeartbeatAt: null,
        }
      : {
          status: "failed",
          safeErrorCode: retryable ? "AI_IMPORT_RETRIES_EXHAUSTED" : safeErrorCode,
          completedAt: new Date(),
          lastHeartbeatAt: null,
        })
    .where(and(
      eq(aiExtractionSession.id, lease.sessionId),
      eq(aiExtractionSession.attemptCount, lease.attemptToken),
      sql`${aiExtractionSession.status} IN ('extracting', 'normalizing')`,
    ))
    .returning({ id: aiExtractionSession.id });
  if (!updated) return "lost";
  return shouldRetry ? "retry" : "failed";
}
