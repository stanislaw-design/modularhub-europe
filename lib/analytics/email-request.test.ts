import { describe, expect, it } from "vitest";
import { clientIpFrom, isUuid } from "./email-request";

// Spec 0079 AC-21: id z adresu trasy pikselki i kliknięcia musi być uuid, zanim dotkniemy bazy.
describe("isUuid", () => {
  it("accepts a v4 uuid in any letter case", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid("AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA")).toBe(true);
  });

  it("rejects empty, malformed and injected values", () => {
    for (const value of ["", "not-a-uuid", "11111111-1111-4111-8111-11111111111", "11111111-1111-4111-8111-111111111111'; drop table email_message;--", " 11111111-1111-4111-8111-111111111111"]) {
      expect(isUuid(value)).toBe(false);
    }
  });
});

describe("clientIpFrom", () => {
  it("takes the first address of x-forwarded-for", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip, then null", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIpFrom(new Headers())).toBeNull();
  });
});
