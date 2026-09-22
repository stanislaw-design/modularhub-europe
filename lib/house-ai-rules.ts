import { getHouseAiField, type HouseAiFieldPath, type HouseAiOrigin } from "@/lib/house-ai-field-catalog";
import type { HouseAiCandidate, HouseAiDecision, HouseAiDocumentIssue } from "@/lib/house-ai-schemas";

export type HouseAiReviewBlockCode =
  | "SESSION_NOT_REVIEWABLE"
  | "UNRESOLVED_CONFLICT"
  | "LOW_CONFIDENCE_UNREVIEWED"
  | "DOCUMENT_ISSUE_UNACKNOWLEDGED"
  | "PRODUCT_FIELD_CHANGED"
  | "TRANSLATION_PENDING"
  | "TRANSLATION_FAILED"
  | "INVALID_ENTITY_GRAPH"
  | "SCHEMA_VERSION_MISMATCH"
  | "DECISION_VALIDATION_ERROR";

export function getHouseAiIdentityKey(input: {
  fieldPath: string;
  entityKey: string | null;
  parentEntityKey: string | null;
}): string {
  return JSON.stringify([input.fieldPath, input.entityKey, input.parentEntityKey]);
}

export function normalizeHouseAiValue(path: HouseAiFieldPath, value: unknown): unknown {
  const field = getHouseAiField(path);
  if (typeof value === "string") return value.normalize("NFC").trim().replace(/\s+/g, " ");
  if (field.valueKind === "integer" || field.valueKind === "currency-cents") return Math.round(Number(value));
  if (field.valueKind === "number") return Number(value);
  return value;
}

export function houseAiCandidatesConflict(path: HouseAiFieldPath, left: unknown, right: unknown): boolean {
  const field = getHouseAiField(path);
  const normalizedLeft = normalizeHouseAiValue(path, left);
  const normalizedRight = normalizeHouseAiValue(path, right);
  if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
    return Math.abs(normalizedLeft - normalizedRight) > (field.tolerance ?? 0);
  }
  return normalizedLeft !== normalizedRight;
}

export function deriveHouseAiConfidence(input: {
  origin: HouseAiOrigin;
  ocrConfidence: number;
  sourceEvidenceCount: number;
  domainValid: boolean;
  hasConflict: boolean;
}): "high" | "medium" | "low" | null {
  if (input.ocrConfidence < 0.5) return null;
  if (input.hasConflict || !input.domainValid || input.ocrConfidence < 0.75) return "low";
  if (input.origin !== "extracted") return "medium";
  if (input.ocrConfidence >= 0.9 && input.sourceEvidenceCount === 1) return "high";
  if (input.ocrConfidence >= 0.8 && input.sourceEvidenceCount >= 2) return "high";
  return "medium";
}

export function getHouseAiReviewGate(input: {
  status: "uploading" | "queued" | "scanning" | "extracting" | "normalizing" | "processing" | "review_ready" | "applying" | "applied" | "cancel_requested" | "cancelled" | "failed";
  candidates: HouseAiCandidate[];
  decisions: HouseAiDecision[];
  documentIssues: HouseAiDocumentIssue[];
  conflictingIdentityKeys: string[];
}): { isApplyReady: boolean; blockCodes: HouseAiReviewBlockCode[] } {
  const decisionsByIdentity = new Set(input.decisions.map(getHouseAiIdentityKey));
  const blockCodes = new Set<HouseAiReviewBlockCode>();
  if (input.status !== "review_ready") blockCodes.add("SESSION_NOT_REVIEWABLE");
  if (input.conflictingIdentityKeys.some((key) => !decisionsByIdentity.has(key))) blockCodes.add("UNRESOLVED_CONFLICT");
  if (input.candidates.some((candidate) => candidate.confidence === "low" && !decisionsByIdentity.has(getHouseAiIdentityKey(candidate)))) {
    blockCodes.add("LOW_CONFIDENCE_UNREVIEWED");
  }
  if (input.documentIssues.some((issue) => !issue.acknowledged)) blockCodes.add("DOCUMENT_ISSUE_UNACKNOWLEDGED");
  return { isApplyReady: blockCodes.size === 0, blockCodes: [...blockCodes] };
}
