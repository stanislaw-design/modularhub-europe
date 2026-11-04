import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/conversations/digest", () => ({ runConversationsDigest: runMock }));

import { GET } from "./route";

function call(authorization?: string) {
  return GET(new Request("https://hub.example.test/api/cron/conversations-digest", {
    headers: authorization ? { authorization } : {},
  }));
}

// Spec 0080 AC-19: endpoint jest chroniony sekretem i odmawia, gdy sekret nie jest ustawiony.
describe("GET /api/cron/conversations-digest", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    runMock.mockReset().mockResolvedValue({ status: "skipped", reason: "no_tasks" });
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("odmawia każdemu wywołaniu, gdy CRON_SECRET nie jest ustawiony", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer anything")).status).toBe(401);
    expect((await call()).status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it("odmawia brakującego albo błędnego tokenu", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it("z poprawnym tokenem uruchamia zadanie i zwraca podsumowanie", async () => {
    process.env.CRON_SECRET = "s3cret";
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "skipped", reason: "no_tasks" });
    expect(runMock).toHaveBeenCalledTimes(1);
  });
});
