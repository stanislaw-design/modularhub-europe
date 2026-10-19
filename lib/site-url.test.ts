import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

const KEYS = ["NEXT_PUBLIC_SITE_URL", "VERCEL_ENV", "VERCEL_URL"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("getSiteUrl (spec 0073 AC-12)", () => {
  it("uses NEXT_PUBLIC_SITE_URL and strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://modularhub.eu//";
    expect(getSiteUrl()).toBe("https://modularhub.eu");
  });

  it("throws in production when the variable is missing", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "app.vercel.app";
    expect(() => getSiteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("does not throw in production when the variable is set", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://modularhub.eu";
    expect(getSiteUrl()).toBe("https://modularhub.eu");
  });

  it("uses VERCEL_URL on a preview deployment", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "app-git-x.vercel.app";
    expect(getSiteUrl()).toBe("https://app-git-x.vercel.app");
  });

  it("falls back to localhost locally", () => {
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
