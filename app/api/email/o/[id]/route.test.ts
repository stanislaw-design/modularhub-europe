import { beforeEach, describe, expect, it, vi } from "vitest";

const recordMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/email-events", () => ({ recordEmailEvent: recordMock }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { GET, HEAD } from "./route";

const ID = "11111111-1111-4111-8111-111111111111";
const call = (handler: typeof GET, id: string, method = "GET") =>
  handler(new Request(`https://modularhubeurope.pl/api/email/o/${id}`, { method, headers: { "user-agent": "UA", "x-forwarded-for": "203.0.113.5, 10.0.0.1" } }), {
    params: Promise.resolve({ id }),
  });

// Spec 0079 AC-21: pikselka zawsze zwraca gif 1x1 i nie jest cache'owana.
describe("GET /api/email/o/[id]", () => {
  beforeEach(() => {
    recordMock.mockReset().mockResolvedValue(true);
  });

  it("returns a 1x1 gif and records the open with the first forwarded address", async () => {
    const response = await call(GET, ID);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/gif");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(20);
    expect(recordMock).toHaveBeenCalledWith({ messageId: ID, kind: "opened", method: "GET", userAgent: "UA", ip: "203.0.113.5" });
  });

  it("still returns the gif for an unknown or malformed id, without touching the database", async () => {
    const response = await call(GET, "not-a-uuid");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/gif");
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("still returns the gif when recording fails", async () => {
    recordMock.mockRejectedValue(new Error("db down"));
    expect((await call(GET, ID)).status).toBe(200);
  });

  it("passes HEAD through so the rule can mark it automatic", async () => {
    await call(HEAD, ID, "HEAD");
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({ method: "HEAD" }));
  });
});
