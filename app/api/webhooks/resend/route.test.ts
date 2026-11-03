import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "svix";

const applyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/email-message", () => ({ applyResendDeliveryEvent: applyMock }));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import { POST } from "./route";

const SECRET = "whsec_" + Buffer.from("test-secret-test-secret-1234").toString("base64");
const MESSAGE_ID = "6f1c3a52-0d7e-4c55-9b8e-1f2a3b4c5d6e";
const ORIGINAL_ENV = { ...process.env };

function signedRequest(payload: unknown, overrides: { signature?: string } = {}): Request {
  const body = JSON.stringify(payload);
  const id = "msg_1";
  const timestamp = new Date();
  const signature = overrides.signature ?? new Webhook(SECRET).sign(id, timestamp, body);
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    body,
    headers: {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
  });
}

const delivered = (tags?: Record<string, string>) => ({
  type: "email.delivered",
  created_at: "2026-11-02T10:00:00.000Z",
  data: { email_id: "r-1", ...(tags ? { tags } : {}) },
});

describe("POST /api/webhooks/resend (spec 0079 AC-14)", () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    applyMock.mockReset().mockResolvedValue(true);
    captureErrorMock.mockClear();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects a bad signature with 401 and touches nothing", async () => {
    const response = await POST(signedRequest(delivered({ message_id: MESSAGE_ID }), { signature: "v1,AAAA" }));
    expect(response.status).toBe(401);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("returns 200 and does nothing for an event without the message_id tag", async () => {
    const response = await POST(signedRequest(delivered()));
    expect(response.status).toBe(200);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("applies delivered for a tagged mail", async () => {
    const response = await POST(signedRequest(delivered({ message_id: MESSAGE_ID })));
    expect(response.status).toBe(200);
    expect(applyMock).toHaveBeenCalledWith(MESSAGE_ID, "delivered", new Date("2026-11-02T10:00:00.000Z"));
  });

  it("accepts the same event twice (the write itself is idempotent)", async () => {
    const payload = delivered({ message_id: MESSAGE_ID });
    expect((await POST(signedRequest(payload))).status).toBe(200);
    expect((await POST(signedRequest(payload))).status).toBe(200);
    expect(applyMock).toHaveBeenCalledTimes(2);
  });

  it("returns 503 when the tag is present but the row is missing, so Resend retries", async () => {
    applyMock.mockResolvedValue(false);
    const response = await POST(signedRequest(delivered({ message_id: MESSAGE_ID })));
    expect(response.status).toBe(503);
  });

  it("returns 503 and reports to Sentry when the database fails", async () => {
    applyMock.mockRejectedValue(new Error("db down"));
    const response = await POST(signedRequest(delivered({ message_id: MESSAGE_ID })));
    expect(response.status).toBe(503);
    expect(captureErrorMock).toHaveBeenCalled();
  });

  it("returns 503 when the secret is not configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const response = await POST(signedRequest(delivered({ message_id: MESSAGE_ID })));
    expect(response.status).toBe(503);
  });
});
