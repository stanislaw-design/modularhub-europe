import { describe, expect, it } from "vitest";
import { getPgErrorCode } from "./pg-error";

// /debug (spec 0037 /check verify): drizzle-orm/neon-http wraps every failing
// query in a DrizzleQueryError whose own `.code` is undefined; the real
// Postgres SQLSTATE sits at `error.cause.code`. This regression test locks in
// the exact shape that caused isBulkRequestEmailLimitError/isUniqueViolation
// to silently never match (confirmed empirically against a real thrown error
// during /debug).
describe("getPgErrorCode", () => {
  it("reads the SQLSTATE from error.cause.code (the real DrizzleQueryError shape)", () => {
    const wrapped = { query: "insert into ...", params: [], cause: { code: "P0001" } };
    expect(getPgErrorCode(wrapped)).toBe("P0001");
  });

  it("reads a unique violation code (23505) from error.cause.code", () => {
    const wrapped = { cause: { code: "23505" } };
    expect(getPgErrorCode(wrapped)).toBe("23505");
  });

  it("falls back to error.code when there is no cause (an unwrapped driver error)", () => {
    expect(getPgErrorCode({ code: "23505" })).toBe("23505");
  });

  it("prefers error.cause.code over a top-level error.code when both are present", () => {
    expect(getPgErrorCode({ code: "OTHER", cause: { code: "P0001" } })).toBe("P0001");
  });

  it("returns undefined when neither error nor its cause carries a code", () => {
    expect(getPgErrorCode({ cause: { message: "boom" } })).toBeUndefined();
    expect(getPgErrorCode({ message: "boom" })).toBeUndefined();
  });

  it("returns undefined for a non-object error (string, number, null, undefined)", () => {
    expect(getPgErrorCode("boom")).toBeUndefined();
    expect(getPgErrorCode(42)).toBeUndefined();
    expect(getPgErrorCode(null)).toBeUndefined();
    expect(getPgErrorCode(undefined)).toBeUndefined();
  });

  it("returns undefined when cause.code is not a string (e.g. a number or nested object)", () => {
    expect(getPgErrorCode({ cause: { code: 500 } })).toBeUndefined();
  });

  it("returns undefined for a real Error instance with no code anywhere", () => {
    expect(getPgErrorCode(new Error("plain failure"))).toBeUndefined();
  });
});
