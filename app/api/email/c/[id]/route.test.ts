import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recordMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/email-events", () => ({ recordEmailEvent: recordMock }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { signClickTarget } from "@/lib/notifications/email-tracking-links";
import { GET } from "./route";

const ORIGINAL_ENV = { ...process.env };
const ID = "11111111-1111-4111-8111-111111111111";
const TARGET = "https://modularhubeurope.pl/pl/producer/panel/board/1?utm_source=email";

function call(params: Record<string, string>, id = ID) {
  const url = new URL(`https://modularhubeurope.pl/api/email/c/${id}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return GET(new Request(url, { headers: { "user-agent": "UA" } }), { params: Promise.resolve({ id }) });
}

// Spec 0079 AC-21: przekierowanie tylko przy poprawnym podpisie i hoście serwisu.
describe("GET /api/email/c/[id]", () => {
  beforeEach(() => {
    process.env.EMAIL_TRACKING_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://modularhubeurope.pl";
    recordMock.mockReset().mockResolvedValue(true);
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("redirects with 302 to a correctly signed own address and records the click", async () => {
    const response = await call({ u: TARGET, s: signClickTarget(ID, new URL(TARGET).href) });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(new URL(TARGET).href);
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({ messageId: ID, kind: "clicked", targetUrl: new URL(TARGET).href }));
  });

  it("answers 400 and does not redirect for a bad signature, a swapped address or a foreign host", async () => {
    const good = signClickTarget(ID, new URL(TARGET).href);
    const bad: Record<string, string>[] = [
      { u: TARGET, s: "0".repeat(64) },
      { u: "https://modularhubeurope.pl/pl/internal", s: good },
      { u: "https://evil.example/x", s: signClickTarget(ID, "https://evil.example/x") },
      { u: TARGET },
    ];
    for (const params of bad) {
      const response = await call(params);
      expect(response.status).toBe(400);
      expect(response.headers.get("location")).toBeNull();
    }
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("still redirects when recording fails (consent withdrawn or database down)", async () => {
    recordMock.mockRejectedValue(new Error("db down"));
    const response = await call({ u: TARGET, s: signClickTarget(ID, new URL(TARGET).href) });
    expect(response.status).toBe(302);
  });

  it("does not redirect without EMAIL_TRACKING_SECRET", async () => {
    delete process.env.EMAIL_TRACKING_SECRET;
    expect((await call({ u: TARGET, s: "0".repeat(64) })).status).toBe(400);
  });
});
