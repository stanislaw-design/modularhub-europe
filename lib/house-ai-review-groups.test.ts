import { describe, expect, it } from "vitest";
import type { HouseAiReviewField } from "@/lib/data/fixtures/house-ai-import";
import type { HouseAiCandidate } from "@/lib/house-ai-schemas";
import { groupHouseAiReviewFields } from "./house-ai-review-groups";

function field(
  fieldPath: HouseAiCandidate["fieldPath"],
  entityKey: string,
  parentEntityKey: string | null = null,
): HouseAiReviewField {
  return {
    fieldPath,
    currentValue: "",
    candidates: [{
      id: crypto.randomUUID(),
      fieldPath,
      entityKey,
      parentEntityKey,
      sourceCandidateId: null,
      rawValue: "value",
      normalizedValue: "value",
      normalizationMetadata: null,
      origin: "extracted",
      confidence: "high",
      ocrConfidence: 0.95,
      evidence: [],
    }],
  };
}

describe("groupHouseAiReviewFields", () => {
  it("groups every root and dependent field under its owning variant", () => {
    const result = groupHouseAiReviewFields([
      field("product.name", "ignored"),
      field("variants[].scopeSummary", "variant-all-in"),
      field("variants[].variantLabel", "variant-basic"),
      field("variants[].priceMinCents", "variant-basic"),
      field("variants[].variantLabel", "variant-all-in"),
      field("variants[].costItems[].label", "transport", "variant-all-in"),
    ]);

    expect(result.standaloneFields.map((item) => item.fieldPath)).toEqual(["product.name"]);
    expect(result.roomGroups).toEqual([]);
    expect(result.variantGroups).toHaveLength(2);
    expect(result.variantGroups[0]).toMatchObject({
      entityKey: "variant-all-in",
      fields: [
        { fieldPath: "variants[].variantLabel" },
        { fieldPath: "variants[].scopeSummary" },
        { fieldPath: "variants[].costItems[].label" },
      ],
    });
    expect(result.variantGroups[1]).toMatchObject({
      entityKey: "variant-basic",
      fields: [
        { fieldPath: "variants[].variantLabel" },
        { fieldPath: "variants[].priceMinCents" },
      ],
    });
  });

  it("keeps every room as a separate group with its own fields", () => {
    const result = groupHouseAiReviewFields([
      field("rooms[].areaM2", "page-3-room-1"),
      field("rooms[].name", "page-7-room-1"),
      field("rooms[].name", "page-3-room-1"),
      field("rooms[].areaM2", "page-7-room-1"),
    ]);

    expect(result.standaloneFields).toEqual([]);
    expect(result.roomGroups).toMatchObject([
      {
        entityKey: "page-3-room-1",
        fields: [{ fieldPath: "rooms[].name" }, { fieldPath: "rooms[].areaM2" }],
      },
      {
        entityKey: "page-7-room-1",
        fields: [{ fieldPath: "rooms[].name" }, { fieldPath: "rooms[].areaM2" }],
      },
    ]);
  });
});
