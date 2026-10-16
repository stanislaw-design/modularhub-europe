import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/large-order-reminders", () => ({ runLargeOrderReminders: runMock }));

import { GET } from "./route";

const emptyRun = {
  remindersClaimed: 0,
  remindersSent: 0,
  deadlineAlertsClaimed: 0,
  deadlineAlertsSent: 0,
  selectionsChecked: 0,
  selectionsConnected: 0,
  errors: 0,
};

function call(authorization?: string) {
  return GET(new Request("https://hub.example.test/api/cron/large-orders-reminders", {
    headers: authorization ? { authorization } : {},
  }));
}

// Spec 0070 AC-25: endpoint zadania cyklicznego jest chroniony sekretem i odmawia, gdy
// sekret nie jest ustawiony.
describe("GET /api/cron/large-orders-reminders", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    runMock.mockReset().mockResolvedValue(emptyRun);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("refuses every call when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;

    expect((await call("Bearer anything")).status).toBe(401);
    expect((await call()).status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it("refuses a missing or wrong bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";

    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect((await call("s3cret")).status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it("runs the job and returns the summary with the right secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    runMock.mockResolvedValue({ ...emptyRun, remindersSent: 2 });

    const response = await call("Bearer s3cret");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ remindersSent: 2, errors: 0 });
    expect(runMock).toHaveBeenCalledTimes(1);
  });
});
