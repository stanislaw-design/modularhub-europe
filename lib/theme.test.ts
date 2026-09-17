import { describe, expect, it } from "vitest";
import { isTheme, THEME_COOKIE_MAX_AGE, THEME_COOKIE_NAME } from "./theme";

describe("isTheme", () => {
  it("accepts \"light\" and \"dark\"", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
  });

  it("rejects undefined (no cookie present)", () => {
    expect(isTheme(undefined)).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isTheme("")).toBe(false);
  });

  it("rejects a \"system\" value (spec 0043 AC-5: no third state)", () => {
    expect(isTheme("system")).toBe(false);
  });

  it("rejects a mismatched case or garbage cookie value without throwing", () => {
    expect(isTheme("Dark")).toBe(false);
    expect(isTheme("light ")).toBe(false);
    expect(isTheme("<script>")).toBe(false);
  });
});

describe("THEME_COOKIE_NAME / THEME_COOKIE_MAX_AGE", () => {
  it("exposes the fixed cookie name and a roughly one year lifetime", () => {
    expect(THEME_COOKIE_NAME).toBe("theme");
    expect(THEME_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });
});
