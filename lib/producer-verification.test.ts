import { beforeEach, describe, expect, it, vi } from "vitest";
import { isVerificationSubmitted, markVerificationSubmitted } from "./producer-verification";

const STORAGE_KEY = "producent:weryfikacja-firmy:zlozone";

beforeEach(() => {
  window.localStorage.clear();
});

describe("isVerificationSubmitted", () => {
  it("returns false for a project with nothing stored yet", () => {
    expect(isVerificationSubmitted("prj-karpaty-alpine-104")).toBe(false);
  });

  it("returns true once the project id is present in the stored list", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["prj-karpaty-alpine-104"]));

    expect(isVerificationSubmitted("prj-karpaty-alpine-104")).toBe(true);
  });

  it("returns false for a different project id in a non-empty stored list", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["prj-karpaty-alpine-104"]));

    expect(isVerificationSubmitted("prj-modulor-family-90")).toBe(false);
  });

  it("returns false, not a thrown error, when the stored value is corrupt JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-json{");

    expect(isVerificationSubmitted("prj-karpaty-alpine-104")).toBe(false);
  });

  it("returns false when the stored value is valid JSON but not an array", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));

    expect(isVerificationSubmitted("prj-karpaty-alpine-104")).toBe(false);
  });

  it("ignores non-string entries in a malformed stored array instead of throwing", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["prj-karpaty-alpine-104", 42, null]));

    expect(isVerificationSubmitted("prj-karpaty-alpine-104")).toBe(true);
  });
});

describe("markVerificationSubmitted", () => {
  it("adds the project id so a later isVerificationSubmitted check returns true", () => {
    markVerificationSubmitted("prj-karpaty-alpine-104");

    expect(isVerificationSubmitted("prj-karpaty-alpine-104")).toBe(true);
  });

  it("does not affect other project ids already stored", () => {
    markVerificationSubmitted("prj-karpaty-alpine-104");
    markVerificationSubmitted("prj-modulor-family-90");

    expect(isVerificationSubmitted("prj-karpaty-alpine-104")).toBe(true);
    expect(isVerificationSubmitted("prj-modulor-family-90")).toBe(true);
  });

  it("is idempotent: marking the same project id twice does not duplicate it", () => {
    markVerificationSubmitted("prj-karpaty-alpine-104");
    markVerificationSubmitted("prj-karpaty-alpine-104");

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toEqual(["prj-karpaty-alpine-104"]);
  });

  it("fails soft, without throwing, when localStorage.setItem throws", () => {
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => markVerificationSubmitted("prj-karpaty-alpine-104")).not.toThrow();

    setItemSpy.mockRestore();
  });
});
