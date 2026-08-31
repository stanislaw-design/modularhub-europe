import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("lib/db/client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws a clear error when DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;

    await expect(import("./client")).rejects.toThrow(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local and fill it in.",
    );
  });

  it("throws the same clear error when DATABASE_URL is an empty string", async () => {
    process.env.DATABASE_URL = "";

    await expect(import("./client")).rejects.toThrow("DATABASE_URL is not set");
  });

  it("creates a query capable Drizzle client when DATABASE_URL is set", async () => {
    process.env.DATABASE_URL =
      "postgresql://neondb_owner:secret@ep-test-123.eu-central-1.aws.neon.tech/neondb?sslmode=require";

    const { db } = await import("./client");

    expect(db).toBeDefined();
    expect(typeof db.select).toBe("function");
    expect(typeof db.execute).toBe("function");
  });
});
