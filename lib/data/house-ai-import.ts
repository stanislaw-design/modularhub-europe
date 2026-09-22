import { houseAiCandidateSchema, houseAiDecisionSchema, houseAiDocumentIssueSchema } from "@/lib/house-ai-schemas";
import { HOUSE_AI_REVIEW_FIXTURES, type HouseAiReviewFixture } from "./fixtures/house-ai-import";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  aiAdditionalObservation,
  aiCandidateEvidence,
  aiDocumentAcknowledgement,
  aiDocumentIssue,
  aiExtractionSession,
  aiFieldCandidate,
  aiFieldDecision,
  aiFieldSnapshot,
  aiSourceDocument,
} from "@/lib/db/schema";
import { HOUSE_AI_FIELD_PATHS, type HouseAiFieldPath } from "@/lib/house-ai-field-catalog";

export type HouseAiFixtureScenario = keyof typeof HOUSE_AI_REVIEW_FIXTURES;

export async function getHouseAiReviewFixture(scenario: HouseAiFixtureScenario = "review"): Promise<HouseAiReviewFixture> {
  const fixture = structuredClone(HOUSE_AI_REVIEW_FIXTURES[scenario]);
  fixture.fields.forEach((field) => field.candidates.forEach((candidate) => houseAiCandidateSchema.parse(candidate)));
  fixture.decisions.forEach((decision) => houseAiDecisionSchema.parse(decision));
  fixture.documentIssues.forEach((issue) => houseAiDocumentIssueSchema.parse(issue));
  return fixture;
}

const HOUSE_AI_PATH_SET = new Set<string>(HOUSE_AI_FIELD_PATHS);

function isHouseAiFieldPath(value: string): value is HouseAiFieldPath {
  return HOUSE_AI_PATH_SET.has(value);
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function stageLabel(stage: (typeof aiExtractionSession.$inferSelect)["currentStage"]): string {
  return {
    upload: "Oczekiwanie na dokumenty",
    queue: "Analiza czeka w kolejce",
    security_scan: "Sprawdzamy bezpieczeństwo dokumentów",
    document_intelligence: "Rozpoznajemy układ i tekst dokumentów",
    model_extraction: "Porządkujemy dane projektu",
    normalization: "Sprawdzamy i normalizujemy wartości",
    review: "Wynik gotowy do przeglądu",
    apply: "Zapisujemy zaakceptowane dane",
  }[stage];
}

export async function getHouseAiImportReview(
  sessionId: string,
  producerId: string,
): Promise<HouseAiReviewFixture | null> {
  const [session] = await db
    .select()
    .from(aiExtractionSession)
    .where(and(eq(aiExtractionSession.id, sessionId), eq(aiExtractionSession.producerId, producerId)));
  if (!session) return null;

  const [documents, candidateRows, snapshotRows, decisionRows, issueRows, acknowledgements, observationRows] =
    await Promise.all([
      db.select().from(aiSourceDocument).where(eq(aiSourceDocument.sessionId, sessionId)).orderBy(asc(aiSourceDocument.sortOrder)),
      db.select().from(aiFieldCandidate).where(eq(aiFieldCandidate.sessionId, sessionId)).orderBy(asc(aiFieldCandidate.createdAt)),
      db.select().from(aiFieldSnapshot).where(eq(aiFieldSnapshot.sessionId, sessionId)),
      db.select().from(aiFieldDecision).where(eq(aiFieldDecision.sessionId, sessionId)).orderBy(asc(aiFieldDecision.decidedAt)),
      db.select().from(aiDocumentIssue).where(eq(aiDocumentIssue.sessionId, sessionId)),
      db.select().from(aiDocumentAcknowledgement).where(eq(aiDocumentAcknowledgement.sessionId, sessionId)),
      db.select().from(aiAdditionalObservation).where(eq(aiAdditionalObservation.sessionId, sessionId)),
    ]);

  const candidateIds = candidateRows.map((candidate) => candidate.id);
  const evidenceRows = candidateIds.length
    ? await db.select().from(aiCandidateEvidence).where(inArray(aiCandidateEvidence.candidateId, candidateIds))
    : [];
  const documentsById = new Map(documents.map((item) => [item.id, item]));
  const evidenceByCandidate = new Map<string, typeof evidenceRows>();
  for (const evidence of evidenceRows) {
    const list = evidenceByCandidate.get(evidence.candidateId) ?? [];
    list.push(evidence);
    evidenceByCandidate.set(evidence.candidateId, list);
  }

  const candidates = candidateRows.flatMap((candidate) => {
    if (!isHouseAiFieldPath(candidate.fieldPath)) return [];
    return [houseAiCandidateSchema.parse({
      id: candidate.id,
      fieldPath: candidate.fieldPath,
      entityKey: candidate.entityKey,
      parentEntityKey: candidate.parentEntityKey,
      sourceCandidateId: candidate.sourceCandidateId,
      rawValue: candidate.rawValue,
      normalizedValue: candidate.normalizedValue,
      normalizationMetadata: candidate.normalizationMetadata,
      origin: candidate.origin,
      confidence: candidate.confidence,
      ocrConfidence: null,
      evidence: (evidenceByCandidate.get(candidate.id) ?? []).map((evidence) => ({
        id: evidence.id,
        documentName: documentsById.get(evidence.sourceDocumentId)?.safeFilename ?? "Dokument źródłowy",
        evidenceType: evidence.evidenceType,
        pageNumber: evidence.pageNumber,
        excerpt: evidence.excerpt,
      })),
    })];
  });

  const identityKey = (value: { fieldPath: string; entityKey: string | null; parentEntityKey: string | null }) =>
    JSON.stringify([value.fieldPath, value.entityKey, value.parentEntityKey]);
  const snapshotsByIdentity = new Map(snapshotRows.map((snapshot) => [identityKey(snapshot), snapshot.snapshotValue]));
  const fieldsByIdentity = new Map<string, HouseAiReviewFixture["fields"][number]>();
  for (const candidate of candidates) {
    const key = identityKey(candidate);
    const field = fieldsByIdentity.get(key) ?? {
      fieldPath: candidate.fieldPath,
      currentValue: displayValue(snapshotsByIdentity.get(key)),
      candidates: [],
    };
    field.candidates.push(candidate);
    fieldsByIdentity.set(key, field);
  }

  const latestDecisions = new Map<string, HouseAiReviewFixture["decisions"][number]>();
  for (const decision of decisionRows) {
    if (!isHouseAiFieldPath(decision.fieldPath)) continue;
    latestDecisions.set(identityKey(decision), houseAiDecisionSchema.parse({
      fieldPath: decision.fieldPath,
      entityKey: decision.entityKey,
      parentEntityKey: decision.parentEntityKey,
      selectedCandidateId: decision.selectedCandidateId,
      finalValue: decision.finalValue,
      decisionType: decision.decisionType,
      version: decision.version,
    }));
  }

  const acknowledgedIssueIds = new Set(acknowledgements.map((item) => item.documentIssueId));
  const normalizedValues = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    const key = identityKey(candidate);
    const values = normalizedValues.get(key) ?? new Set<string>();
    values.add(JSON.stringify(candidate.normalizedValue));
    normalizedValues.set(key, values);
  }

  return {
    sessionId: session.id,
    decisionRevision: session.decisionRevision,
    status: session.status,
    progress: session.progress,
    currentStage: stageLabel(session.currentStage),
    documents: documents.map((item) => ({
      id: item.id,
      name: item.safeFilename,
      pages: item.pageCount,
      language: item.detectedLanguage?.toUpperCase() ?? "—",
    })),
    fields: [...fieldsByIdentity.values()],
    decisions: [...latestDecisions.values()],
    documentIssues: issueRows.map((issue) => houseAiDocumentIssueSchema.parse({
      id: issue.id,
      documentName: documentsById.get(issue.sourceDocumentId)?.safeFilename ?? "Dokument źródłowy",
      pageFrom: issue.pageFrom,
      pageTo: issue.pageTo,
      issueCode: issue.issueCode,
      acknowledged: acknowledgedIssueIds.has(issue.id),
    })),
    conflictingIdentityKeys: [...normalizedValues.entries()]
      .filter(([, values]) => values.size > 1)
      .map(([key]) => key),
    additionalObservations: observationRows.map((observation) => ({
      id: observation.id,
      label: observation.label,
      value: observation.value,
      documentName: documentsById.get(observation.sourceDocumentId)?.safeFilename ?? "Dokument źródłowy",
      pageNumber: observation.pageNumber,
    })),
  };
}
