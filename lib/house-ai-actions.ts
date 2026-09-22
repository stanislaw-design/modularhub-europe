"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  aiDocumentAcknowledgement,
  aiDocumentIssue,
  aiExtractionSession,
} from "@/lib/db/schema";
import { HOUSE_AI_FIELD_PATHS } from "@/lib/house-ai-field-catalog";
import type { HouseAiReviewBlockCode } from "@/lib/house-ai-rules";
import { captureError } from "@/lib/observability/errors";
import { requireProducerActor } from "@/lib/producer-actor";

const decisionInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    fieldPath: z.enum(HOUSE_AI_FIELD_PATHS),
    entityKey: z.string().min(1).nullable(),
    parentEntityKey: z.string().min(1).nullable(),
    selectedCandidateId: z.string().uuid().nullable(),
    finalValue: z.unknown().refine((value) => value !== undefined, "Wartość decyzji jest wymagana."),
    decisionType: z.enum(["accepted", "manual", "rejected", "not_applicable", "keep_current", "overwrite_changed"]),
    expectedFieldVersion: z.number().int().nonnegative(),
    expectedDecisionRevision: z.number().int().nonnegative(),
    comparedValueHash: z.string().min(1).nullable().default(null),
  })
  .strict();

const sessionIdSchema = z.string().uuid();
const issueInputSchema = z.object({ sessionId: z.string().uuid(), issueId: z.string().uuid() }).strict();

export interface HouseAiActionResult {
  ok: boolean;
  error?: string;
  fieldVersion?: number;
  decisionRevision?: number;
  blockCodes?: HouseAiReviewBlockCode[];
}

const GENERIC_ERROR = "Nie udało się zapisać zmiany. Odśwież stronę i spróbuj ponownie.";
const NOT_FOUND_ERROR = "Nie znaleziono tej sesji importu.";

type DecisionFunctionRow = {
  decision_id: string;
  field_version: number;
  decision_revision: number;
};

function rowsFromExecute<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (typeof result === "object" && result !== null && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

export async function saveAiFieldDecision(input: unknown): Promise<HouseAiActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsed = decisionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowa decyzja pola." };
  const value = parsed.data;

  try {
    const result = await db.execute(sql`
      SELECT * FROM save_ai_field_decision(
        ${value.sessionId}::uuid,
        ${actor.producerId}::uuid,
        ${actor.userId}::text,
        ${value.fieldPath}::text,
        ${value.entityKey}::text,
        ${value.parentEntityKey}::text,
        ${value.selectedCandidateId}::uuid,
        ${JSON.stringify(value.finalValue)}::jsonb,
        ${value.decisionType}::text,
        ${value.expectedFieldVersion}::integer,
        ${value.expectedDecisionRevision}::integer,
        ${value.comparedValueHash}::text
      )
    `);
    const [row] = rowsFromExecute<DecisionFunctionRow>(result);
    if (!row) return { ok: false, error: GENERIC_ERROR };
    return {
      ok: true,
      fieldVersion: Number(row.field_version),
      decisionRevision: Number(row.decision_revision),
    };
  } catch {
    // Błąd sterownika może zawierać parametry SQL, w tym wartość pola z PDF.
    // Do obserwowalności trafia wyłącznie bezpieczny kod operacji.
    captureError(new Error("HOUSE_AI_DECISION_WRITE_FAILED"), { path: "saveAiFieldDecision", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function acknowledgeAiDocumentIssue(input: unknown): Promise<HouseAiActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsed = issueInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: NOT_FOUND_ERROR };

  const [ownedIssue] = await db
    .select({ id: aiDocumentIssue.id })
    .from(aiDocumentIssue)
    .innerJoin(aiExtractionSession, eq(aiExtractionSession.id, aiDocumentIssue.sessionId))
    .where(
      and(
        eq(aiDocumentIssue.id, parsed.data.issueId),
        eq(aiDocumentIssue.sessionId, parsed.data.sessionId),
        eq(aiExtractionSession.producerId, actor.producerId),
      ),
    );
  if (!ownedIssue) return { ok: false, error: NOT_FOUND_ERROR };

  try {
    await db
      .insert(aiDocumentAcknowledgement)
      .values({
        sessionId: parsed.data.sessionId,
        documentIssueId: parsed.data.issueId,
        acknowledgedByUserId: actor.userId,
      })
      .onConflictDoNothing({
        target: [aiDocumentAcknowledgement.sessionId, aiDocumentAcknowledgement.documentIssueId],
      });
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "acknowledgeAiDocumentIssue", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function cancelAiExtraction(sessionId: string): Promise<HouseAiActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsedId = sessionIdSchema.safeParse(sessionId);
  if (!parsedId.success) return { ok: false, error: NOT_FOUND_ERROR };

  const [updated] = await db
    .update(aiExtractionSession)
    .set({ status: "cancel_requested" })
    .where(
      and(
        eq(aiExtractionSession.id, parsedId.data),
        eq(aiExtractionSession.producerId, actor.producerId),
        inArray(aiExtractionSession.status, ["queued", "scanning", "extracting", "normalizing"]),
      ),
    )
    .returning({ id: aiExtractionSession.id });
  return updated ? { ok: true } : { ok: false, error: NOT_FOUND_ERROR };
}

export async function retryAiExtraction(sessionId: string): Promise<HouseAiActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsedId = sessionIdSchema.safeParse(sessionId);
  if (!parsedId.success) return { ok: false, error: NOT_FOUND_ERROR };

  const [updated] = await db
    .update(aiExtractionSession)
    .set({
      status: "queued",
      currentStage: "queue",
      safeErrorCode: null,
      attemptCount: 0,
      lastHeartbeatAt: null,
    })
    .where(
      and(
        eq(aiExtractionSession.id, parsedId.data),
        eq(aiExtractionSession.producerId, actor.producerId),
        eq(aiExtractionSession.status, "failed"),
      ),
    )
    .returning({ id: aiExtractionSession.id });
  return updated ? { ok: true } : { ok: false, error: NOT_FOUND_ERROR };
}

export async function getAiReviewGate(sessionId: string): Promise<HouseAiActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: NOT_FOUND_ERROR };
  const parsedId = sessionIdSchema.safeParse(sessionId);
  if (!parsedId.success) return { ok: false, error: NOT_FOUND_ERROR };

  const [owned] = await db
    .select({ id: aiExtractionSession.id })
    .from(aiExtractionSession)
    .where(and(eq(aiExtractionSession.id, parsedId.data), eq(aiExtractionSession.producerId, actor.producerId)));
  if (!owned) return { ok: false, error: NOT_FOUND_ERROR };

  try {
    const result = await db.execute(sql`SELECT get_ai_review_gate(${parsedId.data}::uuid) AS block_codes`);
    const [row] = rowsFromExecute<{ block_codes: HouseAiReviewBlockCode[] }>(result);
    return { ok: true, blockCodes: row?.block_codes ?? [] };
  } catch (error) {
    captureError(error, { path: "getAiReviewGate", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}
