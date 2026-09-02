import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveEnvironment } from "./environment";

describe("resolveEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports production for VERCEL_ENV=production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(resolveEnvironment()).toBe("production");
  });

  it("reports staging for a preview deployment, until Custom Environments is live (AC-2)", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(resolveEnvironment()).toBe("staging");
  });

  it("falls back to the client-exposed VERCEL_ENV when the server one is unset", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(resolveEnvironment()).toBe("production");
  });

  it("defaults to development locally and in CI, where nothing is set (AC-2)", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    expect(resolveEnvironment()).toBe("development");
  });
});
