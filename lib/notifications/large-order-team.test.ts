import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("./send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import { notifyTeamOfNewLargeOrder } from "./large-order-team";

const order = {
  kind: "request" as const,
  id: "5f1c7a52-0a37-4d5b-8f0b-2d3c1a9e6b10",
  countryCode: "DE",
  unitCount: 12,
  deadlineAt: new Date("2026-10-23T10:00:00Z"),
  contactLocale: "de",
};

// Spec 0070 AC-24 (część): mail do zespołu o nowym zapytaniu, po polsku, bez
// danych kontaktowych klienta. Best effort.
describe("notifyTeamOfNewLargeOrder", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OPERATIONS_NOTIFY_EMAIL;
    delete process.env.ADVISOR_NOTIFY_EMAIL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    sendNotificationEmailMock.mockClear();
    captureErrorMock.mockClear();
  });

  it("sends nothing when no team address is configured", async () => {
    await notifyTeamOfNewLargeOrder(order);

    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("sends a Polish email to OPERATIONS_NOTIFY_EMAIL with a link to the admin screen and the order facts", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";
    process.env.AUTH_URL = "https://hub.example.test/";

    await notifyTeamOfNewLargeOrder(order);

    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call).toMatchObject({
      to: "ops@example.test",
      emailType: "large_order_team_new_request",
      entityId: order.id,
    });
    expect(call.subject).toBe("Nowe zapytanie o duże zamówienie (12 domów, DE)");
    expect(call.text).toContain(`https://hub.example.test/pl/internal/large-orders/${order.id}?kind=request`);
    expect(call.text).toContain("12");
    expect(call.text).toContain("Język klienta: de");
  });

  it("falls back to ADVISOR_NOTIFY_EMAIL when the new variable is not set", async () => {
    process.env.ADVISOR_NOTIFY_EMAIL = "advisor@example.test";

    await notifyTeamOfNewLargeOrder(order);

    expect(sendNotificationEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "advisor@example.test" }));
  });

  it("reports a send failure to Sentry instead of throwing", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";
    sendNotificationEmailMock.mockRejectedValueOnce(new Error("resend down"));

    await expect(notifyTeamOfNewLargeOrder(order)).resolves.toBeUndefined();

    expect(captureErrorMock).toHaveBeenCalled();
  });
});
