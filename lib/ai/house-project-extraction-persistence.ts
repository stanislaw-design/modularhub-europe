import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  type HouseProjectExtractionCandidate,
  type HouseProjectExtractionIssue,
} from "@/lib/ai/house-project-extraction";
import { HOUSE_AI_FIELD_PATHS } from "@/lib/house-ai-field-catalog";
import { deriveHouseAiConfidence, getHouseAiIdentityKey } from "@/lib/house-ai-rules";

const jsonPrimitiveSchema = z.union([z.string(), z.number().finite(), z.boolean()]);
const rawValueSchema = z.union([
  jsonPrimitiveSchema,
  z.object({
    amount: z.string().min(1),
    currency: z.string().regex(/^[A-Z]{3}$/),
    taxBasis: z.literal("net"),
  }).strict(),
]);
const normalizationMetadataSchema = z.object({
  kind: z.literal("fx"),
  provider: z.literal("ECB"),
  series: z.string().min(1),
  sourceAmount: z.string().min(1),
  sourceCurrency: z.string().regex(/^[A-Z]{3}$/),
  targetCurrency: z.literal("EUR"),
  rate: z.string().min(1),
  rateDate: z.iso.date(),
  retrievedAt: z.iso.datetime(),
  rounding: z.literal("HALF_UP_2"),
}).strict();
const persistenceCandidateSchema = z.object({
  fieldPath: z.enum(HOUSE_AI_FIELD_PATHS),
  entityKey: z.string().min(1).max(120).nullable(),
  parentEntityKey: z.string().min(1).max(120).nullable(),
  rawValue: rawValueSchema,
  normalizedValue: jsonPrimitiveSchema,
  normalizationMetadata: normalizationMetadataSchema.nullable(),
  origin: z.enum(["extracted", "inferred", "generated"]),
  confidence: z.enum(["high", "medium", "low"]),
  ocrConfidence: z.number().min(0.5).max(1),
  evidence: z.array(z.object({
    pageNumber: z.number().int().positive(),
    excerpt: z.string().min(1).max(160),
  }).strict()),
}).strict();
const persistenceIssueSchema = z.object({
  code: z.enum([
    "VARIANT_ASSIGNMENT_REQUIRED",
    "PRICE_CURRENCY_AMBIGUOUS",
    "PRICE_NET_STATUS_AMBIGUOUS",
    "FX_RATE_UNAVAILABLE",
    "ORIGIN_NOT_ALLOWED",
    "AZURE_DOCUMENT_ANALYSIS_FAILED",
    "AZURE_DOCUMENT_ANALYSIS_TIMEOUT",
    "AZURE_DOCUMENT_RESULT_INVALID",
  ]),
  fieldPath: z.enum(HOUSE_AI_FIELD_PATHS).optional(),
  entityKey: z.string().min(1).max(120).nullable().optional(),
  parentEntityKey: z.string().min(1).max(120).nullable().optional(),
  evidencePages: z.array(z.number().int().positive()),
}).strict();
const persistenceInputSchema = z.object({
  sessionId: z.string().uuid(),
  expectedAttemptCount: z.number().int().positive().nullable().default(null),
  documents: z.array(z.object({
    sourceDocumentId: z.string().uuid(),
    candidates: z.array(persistenceCandidateSchema),
    issues: z.array(persistenceIssueSchema),
  }).strict()).min(1).superRefine((documents, context) => {
    const seen = new Set<string>();
    documents.forEach((document, index) => {
      if (seen.has(document.sourceDocumentId)) {
        context.addIssue({
          code: "custom",
          message: "sourceDocumentId must be unique",
          path: [index, "sourceDocumentId"],
        });
      }
      seen.add(document.sourceDocumentId);
    });
  }),
}).strict();

export interface HouseProjectExtractionDocumentResult {
  sourceDocumentId: string;
  candidates: readonly HouseProjectExtractionCandidate[];
  issues: readonly HouseProjectPersistenceIssue[];
}

export interface PersistHouseProjectExtractionInput {
  sessionId: string;
  expectedAttemptCount?: number | null;
  documents: readonly HouseProjectExtractionDocumentResult[];
}

export interface HouseProjectPersistenceIssue {
  code: HouseProjectExtractionIssue["code"]
    | "AZURE_DOCUMENT_ANALYSIS_FAILED"
    | "AZURE_DOCUMENT_ANALYSIS_TIMEOUT"
    | "AZURE_DOCUMENT_RESULT_INVALID";
  fieldPath?: HouseProjectExtractionIssue["fieldPath"];
  entityKey?: string | null;
  parentEntityKey?: string | null;
  evidencePages: readonly number[];
}

export interface ConsolidatedHouseProjectCandidate extends HouseProjectExtractionCandidate {
  id: string;
  evidence: ReadonlyArray<{
    sourceDocumentId: string;
    pageNumber: number;
    excerpt: string;
  }>;
}

export interface PreparedHouseProjectExtractionPersistence {
  sessionId: string;
  expectedAttemptCount: number | null;
  sourceDocumentIds: readonly string[];
  candidates: readonly ConsolidatedHouseProjectCandidate[];
  issues: ReadonlyArray<{
    sourceDocumentId: string;
    code: HouseProjectPersistenceIssue["code"];
    pageFrom: number | null;
    pageTo: number | null;
  }>;
  conflictCount: number;
}

export interface PersistHouseProjectExtractionResult {
  alreadyPersisted: boolean;
  candidateCount: number;
  evidenceCount: number;
  issueCount: number;
  conflictCount: number;
}

const confidenceRank = { low: 0, medium: 1, high: 2 } as const;
const originRank = { generated: 0, inferred: 1, extracted: 2 } as const;

function candidatePreference(candidate: HouseProjectExtractionCandidate): readonly number[] {
  return [originRank[candidate.origin], confidenceRank[candidate.confidence], candidate.ocrConfidence];
}

function isPreferredCandidate(
  candidate: HouseProjectExtractionCandidate,
  current: HouseProjectExtractionCandidate,
): boolean {
  const next = candidatePreference(candidate);
  const previous = candidatePreference(current);
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] !== previous[index]) return next[index] > previous[index];
  }
  return false;
}

function normalizedValueKey(value: unknown): string {
  return JSON.stringify(value);
}

function evidenceKey(evidence: {
  sourceDocumentId: string;
  pageNumber: number;
  excerpt: string;
}): string {
  return JSON.stringify([evidence.sourceDocumentId, evidence.pageNumber, evidence.excerpt]);
}

export function prepareHouseProjectExtractionPersistence(
  input: PersistHouseProjectExtractionInput,
): PreparedHouseProjectExtractionPersistence {
  const parsed = persistenceInputSchema.parse(input);
  const candidatesByIdentity = new Map<
    string,
    Map<string, {
      candidate: HouseProjectExtractionCandidate;
      evidence: Map<string, ConsolidatedHouseProjectCandidate["evidence"][number]>;
      minimumOcrConfidence: number;
    }>
  >();

  for (const document of parsed.documents) {
    for (const candidate of document.candidates) {
      const identityKey = getHouseAiIdentityKey(candidate);
      const candidatesByValue = candidatesByIdentity.get(identityKey) ?? new Map();
      const valueKey = normalizedValueKey(candidate.normalizedValue);
      const existing = candidatesByValue.get(valueKey);
      const evidence = existing?.evidence ?? new Map();
      for (const item of candidate.evidence) {
        const persistedEvidence = { sourceDocumentId: document.sourceDocumentId, ...item };
        evidence.set(evidenceKey(persistedEvidence), persistedEvidence);
      }
      candidatesByValue.set(valueKey, {
        candidate: existing && !isPreferredCandidate(candidate, existing.candidate)
          ? existing.candidate
          : candidate,
        evidence,
        minimumOcrConfidence: Math.min(existing?.minimumOcrConfidence ?? 1, candidate.ocrConfidence),
      });
      candidatesByIdentity.set(identityKey, candidatesByValue);
    }
  }

  let conflictCount = 0;
  const candidates: ConsolidatedHouseProjectCandidate[] = [];
  for (const candidatesByValue of candidatesByIdentity.values()) {
    const hasConflict = candidatesByValue.size > 1;
    if (hasConflict) conflictCount += 1;
    for (const value of candidatesByValue.values()) {
      const confidence = deriveHouseAiConfidence({
        origin: value.candidate.origin,
        ocrConfidence: value.minimumOcrConfidence,
        sourceEvidenceCount: value.evidence.size,
        domainValid: true,
        hasConflict,
      });
      candidates.push({
        ...value.candidate,
        id: randomUUID(),
        confidence: confidence ?? "low",
        ocrConfidence: value.minimumOcrConfidence,
        evidence: [...value.evidence.values()].sort((left, right) =>
          left.sourceDocumentId.localeCompare(right.sourceDocumentId)
          || left.pageNumber - right.pageNumber
          || left.excerpt.localeCompare(right.excerpt)),
      });
    }
  }

  return {
    sessionId: parsed.sessionId,
    expectedAttemptCount: parsed.expectedAttemptCount,
    sourceDocumentIds: parsed.documents.map((document) => document.sourceDocumentId),
    candidates,
    issues: parsed.documents.flatMap((document) => document.issues.map((issue) => {
      const pages = [...new Set(issue.evidencePages)].sort((left, right) => left - right);
      return {
        sourceDocumentId: document.sourceDocumentId,
        code: issue.code,
        pageFrom: pages.at(0) ?? null,
        pageTo: pages.at(-1) ?? null,
      };
    })),
    conflictCount,
  };
}

type PersistenceRow = {
  session_id: string;
  already_persisted: boolean;
  candidate_count: number;
  evidence_count: number;
  issue_count: number;
};

function rowsFromExecute<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (typeof result === "object" && result !== null && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? rows as T[] : [];
  }
  return [];
}

export async function persistHouseProjectExtraction(
  input: PersistHouseProjectExtractionInput,
): Promise<PersistHouseProjectExtractionResult> {
  const { db } = await import("@/lib/db/client");
  const prepared = prepareHouseProjectExtractionPersistence(input);
  const candidateRows = prepared.candidates.map((candidate) => ({
    id: candidate.id,
    fieldPath: candidate.fieldPath,
    entityKey: candidate.entityKey,
    parentEntityKey: candidate.parentEntityKey,
    rawValue: candidate.rawValue,
    normalizedValue: candidate.normalizedValue,
    normalizationMetadata: candidate.normalizationMetadata,
    origin: candidate.origin,
    confidence: candidate.confidence,
  }));
  const evidenceRows = prepared.candidates.flatMap((candidate) => candidate.evidence.map((evidence) => ({
    candidateId: candidate.id,
    sourceDocumentId: evidence.sourceDocumentId,
    evidenceType: "source" as const,
    pageNumber: evidence.pageNumber,
    excerpt: evidence.excerpt,
  })));

  const result = await db.execute(sql`
    WITH input_documents AS (
      SELECT id
      FROM jsonb_to_recordset(${JSON.stringify(prepared.sourceDocumentIds.map((id) => ({ id })))}::jsonb)
        AS document_input(id uuid)
    ),
    valid_documents AS (
      SELECT source.id
      FROM ai_source_document source
      INNER JOIN input_documents input ON input.id = source.id
      WHERE source.session_id = ${prepared.sessionId}::uuid
    ),
    claimed_session AS (
      UPDATE ai_extraction_session session
      SET status = 'review_ready',
          current_stage = 'review',
          progress = 100,
          safe_error_code = NULL,
          last_heartbeat_at = NULL,
          completed_at = now()
      WHERE session.id = ${prepared.sessionId}::uuid
        AND session.status = 'normalizing'
        AND (${prepared.expectedAttemptCount}::integer IS NULL
          OR session.attempt_count = ${prepared.expectedAttemptCount}::integer)
        AND (SELECT count(*) FROM valid_documents) = ${prepared.sourceDocumentIds.length}
      RETURNING session.id
    ),
    candidate_input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(candidateRows)}::jsonb) AS candidate(
        id uuid,
        "fieldPath" text,
        "entityKey" text,
        "parentEntityKey" text,
        "rawValue" jsonb,
        "normalizedValue" jsonb,
        "normalizationMetadata" jsonb,
        origin ai_candidate_origin,
        confidence ai_confidence
      )
    ),
    inserted_candidates AS (
      INSERT INTO ai_field_candidate (
        id, session_id, field_path, entity_key, parent_entity_key, raw_value,
        normalized_value, normalization_metadata, origin, confidence
      )
      SELECT candidate.id, claimed.id, candidate."fieldPath", candidate."entityKey",
        candidate."parentEntityKey", candidate."rawValue", candidate."normalizedValue",
        candidate."normalizationMetadata", candidate.origin, candidate.confidence
      FROM candidate_input candidate
      CROSS JOIN claimed_session claimed
      RETURNING id
    ),
    evidence_input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(evidenceRows)}::jsonb) AS evidence(
        "candidateId" uuid,
        "sourceDocumentId" uuid,
        "evidenceType" ai_evidence_type,
        "pageNumber" integer,
        excerpt text
      )
    ),
    inserted_evidence AS (
      INSERT INTO ai_candidate_evidence (
        candidate_id, source_document_id, evidence_type, page_number, excerpt
      )
      SELECT evidence."candidateId", evidence."sourceDocumentId", evidence."evidenceType",
        evidence."pageNumber", evidence.excerpt
      FROM evidence_input evidence
      INNER JOIN inserted_candidates candidate ON candidate.id = evidence."candidateId"
      INNER JOIN valid_documents document ON document.id = evidence."sourceDocumentId"
      RETURNING id
    ),
    issue_input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(prepared.issues)}::jsonb) AS issue(
        "sourceDocumentId" uuid,
        code text,
        "pageFrom" integer,
        "pageTo" integer
      )
    ),
    inserted_issues AS (
      INSERT INTO ai_document_issue (
        session_id, source_document_id, page_from, page_to, issue_code, stage
      )
      SELECT claimed.id, issue."sourceDocumentId", issue."pageFrom", issue."pageTo",
        issue.code, 'normalization'::ai_document_issue_stage
      FROM issue_input issue
      CROSS JOIN claimed_session claimed
      INNER JOIN valid_documents document ON document.id = issue."sourceDocumentId"
      RETURNING id
    ),
    persisted AS (
      SELECT claimed.id AS session_id,
        false AS already_persisted,
        (SELECT count(*)::integer FROM inserted_candidates) AS candidate_count,
        (SELECT count(*)::integer FROM inserted_evidence) AS evidence_count,
        (SELECT count(*)::integer FROM inserted_issues) AS issue_count
      FROM claimed_session claimed
    )
    SELECT * FROM persisted
    UNION ALL
    SELECT session.id, true, 0, 0, 0
    FROM ai_extraction_session session
    WHERE session.id = ${prepared.sessionId}::uuid
      AND session.status = 'review_ready'
      AND NOT EXISTS (SELECT 1 FROM claimed_session)
  `);
  const [row] = rowsFromExecute<PersistenceRow>(result);
  if (!row) {
    throw new Error("HOUSE_PROJECT_EXTRACTION_PERSISTENCE_REJECTED");
  }

  return {
    alreadyPersisted: row.already_persisted,
    candidateCount: Number(row.candidate_count),
    evidenceCount: Number(row.evidence_count),
    issueCount: Number(row.issue_count),
    conflictCount: prepared.conflictCount,
  };
}
