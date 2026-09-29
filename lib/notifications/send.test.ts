import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));

import { sendNotificationEmail } from "./send";

const ORIGINAL_ENV = { ...process.env };

function mockFetchOnce(response: { ok: boolean; status?: number }) {
  return vi.fn().mockResolvedValue({ ok: response.ok, status: response.status ?? (response.ok ? 200 : 500) } as Response);
}

describe("sendNotificationEmail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("sends the request to Resend and tracks notification_email_sent on success", async () => {
    const fetchMock = mockFetchOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendNotificationEmail({
      to: "client@example.test",
      subject: "Subject",
      html: "<p>Body</p>",
      emailType: "new_offer",
      entityId: "offer-1",
      distinctId: "offer-1",
    });

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({ to: ["client@example.test"], subject: "Subject", html: "<p>Body</p>" });
    expect(trackEventMock).toHaveBeenCalledWith(
      "notification_email_sent",
      { emailType: "new_offer", entityId: "offer-1" },
      "offer-1",
    );
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it("returns false and tracks notification_email_failed when Resend responds not ok", async () => {
    vi.stubGlobal("fetch", mockFetchOnce({ ok: false, status: 422 }));

    const sent = await sendNotificationEmail({
      to: "client@example.test",
      subject: "Subject",
      html: "<p>Body</p>",
      emailType: "new_offer",
      entityId: "offer-1",
      distinctId: "offer-1",
    });

    expect(sent).toBe(false);
    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { path: "notifications:send" });
    expect(trackEventMock).toHaveBeenCalledWith(
      "notification_email_failed",
      { emailType: "new_offer", entityId: "offer-1" },
      "offer-1",
    );
  });

  it("returns false and tracks notification_email_failed on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const sent = await sendNotificationEmail({
      to: "client@example.test",
      subject: "Subject",
      html: "<p>Body</p>",
      emailType: "new_offer",
      entityId: "offer-1",
      distinctId: "offer-1",
    });

    expect(sent).toBe(false);
    expect(trackEventMock).toHaveBeenCalledWith("notification_email_failed", expect.anything(), "offer-1");
  });

  it("is a silent no-op, not a failure event, when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendNotificationEmail({
      to: "client@example.test",
      subject: "Subject",
      html: "<p>Body</p>",
      emailType: "new_offer",
      entityId: "offer-1",
      distinctId: "offer-1",
    });

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  // AC-10: the login email is not best effort — a failure must propagate.
  it("throws instead of returning false when throwOnFailure is set and Resend responds not ok", async () => {
    vi.stubGlobal("fetch", mockFetchOnce({ ok: false, status: 500 }));

    await expect(
      sendNotificationEmail({
        to: "client@example.test",
        subject: "Subject",
        html: "<p>Body</p>",
        emailType: "login_link",
        entityId: "client@example.test",
        distinctId: "client@example.test",
        throwOnFailure: true,
      }),
    ).rejects.toThrow("Resend responded 500");
  });

  it("throws instead of silently no-oping when throwOnFailure is set and RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;

    await expect(
      sendNotificationEmail({
        to: "client@example.test",
        subject: "Subject",
        html: "<p>Body</p>",
        emailType: "login_link",
        entityId: "client@example.test",
        distinctId: "client@example.test",
        throwOnFailure: true,
      }),
    ).rejects.toThrow();
  });
});
