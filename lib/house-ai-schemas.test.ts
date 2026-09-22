import { describe, expect, it } from "vitest";
import { houseAiCandidateSchema } from "./house-ai-schemas";

const baseCandidate = {
  id: "candidate-1",
  fieldPath: "product.name",
  entityKey: null,
  parentEntityKey: null,
  sourceCandidateId: null,
  rawValue: "Dom 98",
  normalizedValue: "Dom 98",
  normalizationMetadata: null,
  origin: "extracted",
  confidence: "high",
  ocrConfidence: 0.97,
  evidence: [{ id: "evidence-1", documentName: "oferta.pdf", evidenceType: "source", pageNumber: 1, excerpt: "Dom 98" }],
} as const;

describe("houseAiCandidateSchema", () => {
  it("accepts extracted values with a page and excerpt", () => {
    expect(houseAiCandidateSchema.safeParse(baseCandidate).success).toBe(true);
  });

  it("rejects extracted values without source evidence", () => {
    expect(houseAiCandidateSchema.safeParse({ ...baseCandidate, evidence: [] }).success).toBe(false);
  });

  it("requires translated values to point at a source candidate and carry no copied evidence", () => {
    expect(houseAiCandidateSchema.safeParse({ ...baseCandidate, origin: "translated", sourceCandidateId: "candidate-pl", evidence: [] }).success).toBe(true);
    expect(houseAiCandidateSchema.safeParse({ ...baseCandidate, origin: "translated", sourceCandidateId: null, evidence: [] }).success).toBe(false);
  });
});
