import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isCountryResolved, markCountryResolved } from "./gap-closure";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isCountryResolved", () => {
  it("is false for a country never marked resolved", () => {
    expect(isCountryResolved("DE")).toBe(false);
  });

  it("is true after the country was marked resolved", () => {
    markCountryResolved("DE");

    expect(isCountryResolved("DE")).toBe(true);
  });

  it("does not report an unrelated country as resolved", () => {
    markCountryResolved("DE");

    expect(isCountryResolved("NL")).toBe(false);
  });

  it("treats corrupted JSON in storage as no resolved countries (AC-10)", () => {
    window.localStorage.setItem("producent:domykanie-luk:rozwiazane", "{not json");

    expect(isCountryResolved("DE")).toBe(false);
  });

  it("treats a non-array value in storage as no resolved countries (AC-10)", () => {
    window.localStorage.setItem("producent:domykanie-luk:rozwiazane", JSON.stringify({ foo: "bar" }));

    expect(isCountryResolved("DE")).toBe(false);
  });
});

describe("markCountryResolved", () => {
  it("adds the country code to storage under the fixed global key", () => {
    markCountryResolved("DE");

    const raw = window.localStorage.getItem("producent:domykanie-luk:rozwiazane");
    expect(JSON.parse(raw ?? "[]")).toEqual(["DE"]);
  });

  it("accumulates distinct countries across multiple calls", () => {
    markCountryResolved("DE");
    markCountryResolved("NL");

    expect(isCountryResolved("DE")).toBe(true);
    expect(isCountryResolved("NL")).toBe(true);
  });

  it("does not duplicate an already resolved country", () => {
    markCountryResolved("DE");
    markCountryResolved("DE");

    const raw = window.localStorage.getItem("producent:domykanie-luk:rozwiazane");
    expect(JSON.parse(raw ?? "[]")).toEqual(["DE"]);
  });

  it("fails soft when storage write throws (AC-10)", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => markCountryResolved("DE")).not.toThrow();
  });
});
