import { describe, expect, it } from "vitest";
import { productComplianceAssessmentInputSchema } from "@/lib/product-compliance-assessment-specs";

const valid = { countryCode: "NL", rule: "bbl", status: "conditional", reason: "Wymaga kwaliteitsborgera" };

describe("productComplianceAssessmentInputSchema", () => {
  it("accepts a complete assessment", () => {
    expect(productComplianceAssessmentInputSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an unknown status", () => {
    expect(productComplianceAssessmentInputSchema.safeParse({ ...valid, status: "maybe" }).success).toBe(false);
  });

  it("rejects an unknown country", () => {
    expect(productComplianceAssessmentInputSchema.safeParse({ ...valid, countryCode: "FR" }).success).toBe(false);
  });

  it("rejects an empty reason", () => {
    expect(productComplianceAssessmentInputSchema.safeParse({ ...valid, reason: " " }).success).toBe(false);
  });
});
