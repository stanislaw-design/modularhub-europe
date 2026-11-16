import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cleanupMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage/direct-upload", () => ({ runUploadsCleanup: cleanupMock }));

import { GET } from "./route";

const ORIGINAL_ENV = { ...process.env };
const call = (authorization?: string) =>
  GET(new Request("https://modularhubeurope.pl/api/cron/uploads-cleanup", { headers: authorization ? { authorization } : {} }));

// Spec 0085 AC-9: godzinne zadanie czyszczące, Bearer CRON_SECRET jak pozostałe zadania.
describe("GET /api/cron/uploads-cleanup", () => {
  const counters = { purgedIntents: 2, purgedStaleKeys: 1, purgedDeletedAttachments: 3, deletedRows: 4, errors: 0 };

  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    cleanupMock.mockReset().mockResolvedValue(counters);
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns the counters for the right secret", async () => {
    const response = await call("Bearer cron-secret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(counters);
  });

  it("refuses a wrong or missing secret, and every call when no secret is set", async () => {
    expect((await call("Bearer nope")).status).toBe(401);
    expect((await call()).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await call("Bearer cron-secret")).status).toBe(401);
    expect(cleanupMock).not.toHaveBeenCalled();
  });
});
