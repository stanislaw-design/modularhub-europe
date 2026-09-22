import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HouseProjectExtractionCandidate } from "@/lib/ai/house-project-extraction";

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));

vi.mock("@/lib/db/client", () => ({
  db: { execute: executeMock },
}));

import {
  persistHouseProjectExtraction,
  prepareHouseProjectExtractionPersistence,
  type PersistHouseProjectExtractionInput,
} from "@/lib/ai/house-project-extraction-persistence";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const DOCUMENT_A_ID = "00000000-0000-4000-8000-000000000002";
const DOCUMENT_B_ID = "00000000-0000-4000-8000-000000000003";

function candidate(
  normalizedValue: string | number | boolean,
  overrides: Partial<HouseProjectExtractionCandidate> = {},
): HouseProjectExtractionCandidate {
  return {
    fieldPath: "product.floorAreaM2",
    entityKey: null,
    parentEntityKey: null,
    rawValue: normalizedValue,
    normalizedValue,
    normalizationMetadata: null,
    origin: "extracted",
    confidence: "high",
    ocrConfidence: 0.96,
    evidence: [{ pageNumber: 3, excerpt: `Powierzchnia ${normalizedValue} m2` }],
    ...overrides,
  };
}

function input(
  documents: PersistHouseProjectExtractionInput["documents"],
): PersistHouseProjectExtractionInput {
  return { sessionId: SESSION_ID, documents };
}

describe("house project extraction persistence", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("merges identical values for one full field identity and preserves every distinct evidence", () => {
    const prepared = prepareHouseProjectExtractionPersistence(input([
      { sourceDocumentId: DOCUMENT_A_ID, candidates: [candidate(67.57)], issues: [] },
      {
        sourceDocumentId: DOCUMENT_B_ID,
        candidates: [candidate(67.57, {
          confidence: "medium",
          ocrConfidence: 0.83,
          evidence: [{ pageNumber: 8, excerpt: "P.u. 67,57 m2" }],
        })],
        issues: [],
      },
    ]));

    expect(prepared.candidates).toHaveLength(1);
    expect(prepared.candidates[0]).toMatchObject({
      normalizedValue: 67.57,
      confidence: "high",
    });
    expect(prepared.candidates[0]?.evidence).toEqual([
      {
        sourceDocumentId: DOCUMENT_A_ID,
        pageNumber: 3,
        excerpt: "Powierzchnia 67.57 m2",
      },
      {
        sourceDocumentId: DOCUMENT_B_ID,
        pageNumber: 8,
        excerpt: "P.u. 67,57 m2",
      },
    ]);
    expect(prepared.conflictCount).toBe(0);
  });

  it("keeps different values as low confidence conflict candidates for manual selection", () => {
    const prepared = prepareHouseProjectExtractionPersistence(input([{
      sourceDocumentId: DOCUMENT_A_ID,
      candidates: [candidate(67.57), candidate(72.1)],
      issues: [],
    }]));

    expect(prepared.candidates.map((item) => item.normalizedValue)).toEqual([67.57, 72.1]);
    expect(prepared.candidates.every((item) => item.confidence === "low")).toBe(true);
    expect(prepared.conflictCount).toBe(1);
  });

  it("does not merge equal values belonging to another entity or parent entity", () => {
    const prepared = prepareHouseProjectExtractionPersistence(input([{
      sourceDocumentId: DOCUMENT_A_ID,
      candidates: [
        candidate("Fundament", {
          fieldPath: "variants[].costItems[].label",
          entityKey: "cost-1",
          parentEntityKey: "variant-a",
        }),
        candidate("Fundament", {
          fieldPath: "variants[].costItems[].label",
          entityKey: "cost-1",
          parentEntityKey: "variant-b",
        }),
      ],
      issues: [],
    }]));

    expect(prepared.candidates).toHaveLength(2);
    expect(prepared.candidates.map((item) => item.parentEntityKey)).toEqual(["variant-a", "variant-b"]);
    expect(prepared.conflictCount).toBe(0);
  });

  it("deduplicates repeated evidence for an identical candidate", () => {
    const repeated = candidate("NORD 68", {
      fieldPath: "product.name",
      evidence: [{ pageNumber: 1, excerpt: "NORD 68" }],
    });
    const prepared = prepareHouseProjectExtractionPersistence(input([{
      sourceDocumentId: DOCUMENT_A_ID,
      candidates: [repeated, repeated],
      issues: [],
    }]));

    expect(prepared.candidates).toHaveLength(1);
    expect(prepared.candidates[0]?.evidence).toHaveLength(1);
  });

  it("writes candidates, evidence, issues and the review ready transition in one database statement", async () => {
    executeMock.mockResolvedValue({
      rows: [{
        session_id: SESSION_ID,
        already_persisted: false,
        candidate_count: 1,
        evidence_count: 1,
        issue_count: 1,
      }],
    });

    const result = await persistHouseProjectExtraction(input([{
      sourceDocumentId: DOCUMENT_A_ID,
      candidates: [candidate(67.57)],
      issues: [{
        code: "ORIGIN_NOT_ALLOWED",
        fieldPath: "technical.ventilation",
        entityKey: null,
        parentEntityKey: null,
        evidencePages: [5],
      }],
    }]));

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      alreadyPersisted: false,
      candidateCount: 1,
      evidenceCount: 1,
      issueCount: 1,
      conflictCount: 0,
    });
  });

  it("treats a completed review ready session as an idempotent retry", async () => {
    executeMock.mockResolvedValue({
      rows: [{
        session_id: SESSION_ID,
        already_persisted: true,
        candidate_count: 0,
        evidence_count: 0,
        issue_count: 0,
      }],
    });

    await expect(persistHouseProjectExtraction(input([{
      sourceDocumentId: DOCUMENT_A_ID,
      candidates: [],
      issues: [],
    }]))).resolves.toMatchObject({ alreadyPersisted: true });
  });

  it("rejects an invalid state transition or a source document outside the session", async () => {
    executeMock.mockResolvedValue({ rows: [] });

    await expect(persistHouseProjectExtraction(input([{
      sourceDocumentId: DOCUMENT_A_ID,
      candidates: [],
      issues: [],
    }]))).rejects.toThrow("HOUSE_PROJECT_EXTRACTION_PERSISTENCE_REJECTED");
  });
});
