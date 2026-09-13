import { describe, expect, it } from "vitest";
import { PRODUCT_FAMILIES } from "@/lib/product-technical-specs";
import {
  BULK_REQUEST_EMAIL_LIMIT_ERROR,
  isBulkRequestEmailLimitError,
  normalizeContactEmail,
  projectRequestFamiliesSchema,
  PROJECT_TYPES,
} from "./project-request-specs";

describe("normalizeContactEmail", () => {
  it("lower cases the email", () => {
    expect(normalizeContactEmail("Investor@Example.com")).toBe("investor@example.com");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeContactEmail("  investor@example.com  ")).toBe("investor@example.com");
  });

  it("is idempotent: normalizing twice gives the same result", () => {
    const once = normalizeContactEmail(" Investor@Example.com ");
    expect(normalizeContactEmail(once)).toBe(once);
  });
});

describe("projectRequestFamiliesSchema", () => {
  it("accepts a single valid family", () => {
    expect(projectRequestFamiliesSchema.safeParse(["dom"]).success).toBe(true);
  });

  it("accepts all three product families at once", () => {
    expect(projectRequestFamiliesSchema.safeParse([...PRODUCT_FAMILIES]).success).toBe(true);
  });

  it("rejects an empty array (AC-12: families must not be empty)", () => {
    const result = projectRequestFamiliesSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("rejects a value outside the known product families", () => {
    const result = projectRequestFamiliesSchema.safeParse(["sauna-de-lux"]);
    expect(result.success).toBe(false);
  });

  it("rejects a non-array value", () => {
    expect(projectRequestFamiliesSchema.safeParse("dom").success).toBe(false);
  });
});

describe("PROJECT_TYPES", () => {
  it("has exactly the seven values declared on projectTypeEnum in lib/db/schema.ts", () => {
    expect(PROJECT_TYPES).toEqual([
      "resort",
      "holiday-park",
      "housing-development",
      "student-housing",
      "senior-living",
      "workforce-accommodation",
      "other",
    ]);
  });
});

// /debug regression: this used to check error.code directly and never
// matched a real DrizzleQueryError (see lib/db/pg-error.test.ts for the root
// cause fixture).
describe("isBulkRequestEmailLimitError", () => {
  it("matches a real DrizzleQueryError-shaped P0001 error (the trigger's SQLSTATE)", () => {
    expect(isBulkRequestEmailLimitError({ cause: { code: "P0001" } })).toBe(true);
  });

  it("does not match an unrelated Postgres error code", () => {
    expect(isBulkRequestEmailLimitError({ cause: { code: "23505" } })).toBe(false);
  });

  it("does not match a non-error value", () => {
    expect(isBulkRequestEmailLimitError(null)).toBe(false);
    expect(isBulkRequestEmailLimitError(undefined)).toBe(false);
  });
});

describe("BULK_REQUEST_EMAIL_LIMIT_ERROR", () => {
  it("is a non-empty, human readable message (not a generic fallback)", () => {
    expect(BULK_REQUEST_EMAIL_LIMIT_ERROR.length).toBeGreaterThan(10);
    expect(BULK_REQUEST_EMAIL_LIMIT_ERROR).toMatch(/3/);
  });
});
