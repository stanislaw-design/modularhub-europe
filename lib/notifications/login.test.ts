import { describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/notifications/send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));

import { sendLoginLinkEmail } from "./login";

describe("sendLoginLinkEmail", () => {
  it("renders the branded template and sends with throwOnFailure: true, identifier as entityId/distinctId", async () => {
    sendNotificationEmailMock.mockResolvedValue(true);

    await sendLoginLinkEmail({ identifier: "user@example.test", url: "https://modularhub.eu/pl/api/auth/callback/resend?token=abc" });

    expect(sendNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.test",
        emailType: "login_link",
        entityId: "user@example.test",
        distinctId: "user@example.test",
        throwOnFailure: true,
      }),
    );
    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call.html).toContain("https://modularhub.eu/pl/api/auth/callback/resend?token=abc");
    // idea 1 (design feedback): every notification email now ships a plain
    // text fallback alongside the HTML, not just spec 0048's case emails.
    expect(call.text).toContain("https://modularhub.eu/pl/api/auth/callback/resend?token=abc");
    expect(call.text).not.toMatch(/<[a-z]/i);
  });

  // AC-10: login is not best effort. sendVerificationRequest (auth.ts) relies
  // on this rejecting so Auth.js shows its own error screen.
  it("propagates a send failure instead of swallowing it", async () => {
    sendNotificationEmailMock.mockRejectedValue(new Error("Resend responded 500"));

    await expect(
      sendLoginLinkEmail({ identifier: "user@example.test", url: "https://modularhub.eu/pl/api/auth/callback/resend?token=abc" }),
    ).rejects.toThrow("Resend responded 500");
  });

  // Spec 0066 AC-7, AC-10, AC-16: warianty maila gościa wybiera marker welcome.
  describe("guest variants (spec 0066)", () => {
    const ID = "3f2a1b4c-5d6e-4f70-8a91-b2c3d4e5f607";
    const guestUrl = (welcome: string) =>
      `https://modularhub.eu/api/auth/callback/resend?callbackUrl=${encodeURIComponent(`/nl/panel/inquiries/${ID}?welcome=${welcome}`)}&token=abc`;

    it("identifies a new guest mail by inquiry id, never by email, with no Reply-To (AC-7, AC-16)", async () => {
      sendNotificationEmailMock.mockReset().mockResolvedValue(true);

      await sendLoginLinkEmail({ identifier: "gosc@example.test", url: guestUrl("new") });

      const call = sendNotificationEmailMock.mock.calls[0][0];
      expect(call.to).toBe("gosc@example.test");
      expect(call.entityId).toBe(ID);
      expect(call.distinctId).toBe(ID);
      expect(call.throwOnFailure).toBe(true);
      expect(call.replyTo).toBeUndefined();
      expect(call.html).toContain("token=abc");
    });

    // Język z adresu powrotu sprawdza login-callback.test.ts, setup testów wymusza tu "pl".
    it("uses different fixed texts for the new and existing variants (AC-7, AC-10)", async () => {
      sendNotificationEmailMock.mockReset().mockResolvedValue(true);

      await sendLoginLinkEmail({ identifier: "gosc@example.test", url: guestUrl("new") });
      await sendLoginLinkEmail({ identifier: "gosc@example.test", url: guestUrl("existing") });

      const [fresh, existing] = sendNotificationEmailMock.mock.calls.map((c) => c[0]);
      expect(fresh.subject).not.toBe(existing.subject);
      expect(fresh.subject).toBe("Twoje zapytanie w ModularHub Europe");
      expect(fresh.html + fresh.text).not.toContain("gosc@example.test");
    });

    it("adds Reply-To to the existing account variant only (AC-10)", async () => {
      process.env.SUPPORT_REPLY_TO_EMAIL = "support@example.test";
      sendNotificationEmailMock.mockReset().mockResolvedValue(true);

      await sendLoginLinkEmail({ identifier: "klient@example.test", url: guestUrl("existing") });
      await sendLoginLinkEmail({ identifier: "klient@example.test", url: guestUrl("new") });

      const [existing, fresh] = sendNotificationEmailMock.mock.calls.map((c) => c[0]);
      expect(existing.replyTo).toBe("support@example.test");
      expect(fresh.replyTo).toBeUndefined();
      delete process.env.SUPPORT_REPLY_TO_EMAIL;
    });
  });
});
