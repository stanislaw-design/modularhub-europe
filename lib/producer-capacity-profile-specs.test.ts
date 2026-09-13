import { describe, expect, it } from "vitest";
import {
  certificationsSchema,
  completionStandardsSupportedSchema,
  COMPLETION_STANDARDS,
  leadTimeTierSchema,
  leadTimeTiersSchema,
  pastProjectReferencesSchema,
} from "./producer-capacity-profile-specs";

describe("leadTimeTierSchema / leadTimeTiersSchema", () => {
  it("accepts a valid {units, weeks} tier", () => {
    expect(leadTimeTierSchema.safeParse({ units: 10, weeks: 8 }).success).toBe(true);
  });

  it("rejects a non-integer units value", () => {
    expect(leadTimeTierSchema.safeParse({ units: 10.5, weeks: 8 }).success).toBe(false);
  });

  it("rejects zero or negative units/weeks", () => {
    expect(leadTimeTierSchema.safeParse({ units: 0, weeks: 8 }).success).toBe(false);
    expect(leadTimeTierSchema.safeParse({ units: 10, weeks: -1 }).success).toBe(false);
  });

  it("rejects a tier missing a required field", () => {
    expect(leadTimeTierSchema.safeParse({ units: 10 }).success).toBe(false);
  });

  it("accepts an empty list of tiers (the default)", () => {
    expect(leadTimeTiersSchema.safeParse([]).success).toBe(true);
  });

  it("accepts multiple ascending tiers", () => {
    const result = leadTimeTiersSchema.safeParse([
      { units: 10, weeks: 8 },
      { units: 50, weeks: 14 },
      { units: 100, weeks: 20 },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects a list containing one invalid tier", () => {
    const result = leadTimeTiersSchema.safeParse([{ units: 10, weeks: 8 }, { units: -5, weeks: 8 }]);
    expect(result.success).toBe(false);
  });
});

describe("completionStandardsSupportedSchema", () => {
  it.each(COMPLETION_STANDARDS)("accepts each known completion standard value: %s", (standard) => {
    expect(completionStandardsSupportedSchema.safeParse([standard]).success).toBe(true);
  });

  it("rejects a value outside the fixed set", () => {
    expect(completionStandardsSupportedSchema.safeParse(["luksusowy"]).success).toBe(false);
  });

  it("accepts an empty array", () => {
    expect(completionStandardsSupportedSchema.safeParse([]).success).toBe(true);
  });
});

describe("certificationsSchema / pastProjectReferencesSchema", () => {
  it("accepts a list of non-empty strings", () => {
    expect(certificationsSchema.safeParse(["ISO 9001", "CE"]).success).toBe(true);
    expect(pastProjectReferencesSchema.safeParse(["Osiedle Zielone Wzgórze"]).success).toBe(true);
  });

  it("rejects a blank string entry (whitespace only)", () => {
    expect(certificationsSchema.safeParse(["   "]).success).toBe(false);
  });

  it("accepts an empty list", () => {
    expect(certificationsSchema.safeParse([]).success).toBe(true);
    expect(pastProjectReferencesSchema.safeParse([]).success).toBe(true);
  });
});
