import { describe, expect, it } from "vitest";
import { getHouseAiReviewFixture } from "@/lib/data/house-ai-import";
import { deriveHouseAiConfidence, getHouseAiIdentityKey, getHouseAiReviewGate, houseAiCandidatesConflict } from "./house-ai-rules";

describe("house AI deterministic rules", () => {
  it("uses field tolerances after normalization", () => {
    expect(houseAiCandidatesConflict("product.floorAreaM2", 98.4, 98.49)).toBe(false);
    expect(houseAiCandidatesConflict("product.floorAreaM2", 98.4, 98.6)).toBe(true);
    expect(houseAiCandidatesConflict("variants[].priceMinCents", 10000, 10001)).toBe(false);
  });

  it("derives confidence rather than trusting a model score", () => {
    expect(deriveHouseAiConfidence({ origin: "extracted", ocrConfidence: 0.95, sourceEvidenceCount: 1, domainValid: true, hasConflict: false })).toBe("high");
    expect(deriveHouseAiConfidence({ origin: "inferred", ocrConfidence: 0.99, sourceEvidenceCount: 2, domainValid: true, hasConflict: false })).toBe("medium");
    expect(deriveHouseAiConfidence({ origin: "extracted", ocrConfidence: 0.49, sourceEvidenceCount: 1, domainValid: true, hasConflict: false })).toBeNull();
  });

  it("keeps repeated fields separate by entity and parent identity", () => {
    expect(getHouseAiIdentityKey({ fieldPath: "variants[].priceMinCents", entityKey: "variant-a", parentEntityKey: null }))
      .not.toBe(getHouseAiIdentityKey({ fieldPath: "variants[].priceMinCents", entityKey: "variant-b", parentEntityKey: null }));
    expect(getHouseAiIdentityKey({ fieldPath: "variants[].costItems[].label", entityKey: "cost-1", parentEntityKey: "variant-a" }))
      .not.toBe(getHouseAiIdentityKey({ fieldPath: "variants[].costItems[].label", entityKey: "cost-1", parentEntityKey: "variant-b" }));
  });

  it("keeps conflict, low confidence and partial document issues as independent blockers", async () => {
    const fixture = await getHouseAiReviewFixture("review");
    const gate = getHouseAiReviewGate({ status: "review_ready", candidates: fixture.fields.flatMap((field) => field.candidates), decisions: [], documentIssues: fixture.documentIssues, conflictingIdentityKeys: fixture.conflictingIdentityKeys });
    expect(gate.isApplyReady).toBe(false);
    expect(gate.blockCodes).toEqual(expect.arrayContaining(["UNRESOLVED_CONFLICT", "LOW_CONFIDENCE_UNREVIEWED", "DOCUMENT_ISSUE_UNACKNOWLEDGED"]));
  });

  it("does not treat values from different variants as one conflict", () => {
    const basic = getHouseAiIdentityKey({ fieldPath: "variants[].variantLabel", entityKey: "variant-basic", parentEntityKey: null });
    const allIn = getHouseAiIdentityKey({ fieldPath: "variants[].variantLabel", entityKey: "variant-all-in", parentEntityKey: null });

    expect(basic).not.toBe(allIn);
    expect(getHouseAiReviewGate({
      status: "review_ready",
      candidates: [],
      decisions: [],
      documentIssues: [],
      conflictingIdentityKeys: [],
    })).toEqual({ isApplyReady: true, blockCodes: [] });
  });
});
