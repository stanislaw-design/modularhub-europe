import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deleteMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/email-events", () => ({ deleteExpiredEmailEvents: deleteMock }));

import { GET } from "./route";

const ORIGINAL_ENV = { ...process.env };
const call = (authorization?: string) =>
  GET(new Request("https://modularhubeurope.pl/api/cron/email-events-retention", { headers: authorization ? { authorization } : {} }));

// Spec 0079 AC-23: cron retencji, Bearer CRON_SECRET jak large-orders-reminders.
describe("GET /api/cron/email-events-retention", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    deleteMock.mockReset().mockResolvedValue(4);
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns the number of deleted rows for the right secret", async () => {
    const response = await call("Bearer cron-secret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 4 });
  });

  it("refuses a wrong or missing secret", async () => {
    expect((await call("Bearer nope")).status).toBe(401);
    expect((await call()).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await call("Bearer cron-secret")).status).toBe(401);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
