import { describe, expect, it } from "vitest";
import { parseCompareProjectIds } from "./compare";

describe("parseCompareProjectIds", () => {
  it("returns 2 to 3 deduped ids from a comma separated string", () => {
    expect(parseCompareProjectIds("a,b")).toEqual(["a", "b"]);
    expect(parseCompareProjectIds("a,b,c")).toEqual(["a", "b", "c"]);
    expect(parseCompareProjectIds("a,b,a")).toEqual(["a", "b"]);
  });

  it("returns null when fewer than 2 ids remain (spec 0044 AC-5)", () => {
    expect(parseCompareProjectIds(undefined)).toBeNull();
    expect(parseCompareProjectIds("")).toBeNull();
    expect(parseCompareProjectIds("a")).toBeNull();
    expect(parseCompareProjectIds("a,a")).toBeNull();
  });

  it("returns null when more than 3 ids are given (spec 0044 AC-6, max three columns)", () => {
    expect(parseCompareProjectIds("a,b,c,d")).toBeNull();
  });

  it("returns null for a string[] param (repeated ?products=), same shape guard as inquiry", () => {
    expect(parseCompareProjectIds(["a", "b"])).toBeNull();
  });
});
